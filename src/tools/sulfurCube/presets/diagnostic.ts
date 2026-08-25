import type { KnockbackCallResult, LaunchSummary, TrajectoryResult, Vec3 } from '../model/types'
import type { NumericBackend } from '../numerics/types'
import { je26_2Constants, je26_2KnockbackMechanics } from '../data/je26_2'
import { applySulfurCubeKnockbackCall } from '../model/knockbackCall'
import { summarizeLaunchVelocity } from '../model/launchSummary'
import { simulateFreeFlightTrajectory } from '../model/trajectory'
import { lengthVec3, normalizeVec3, subtractVec3 } from '../model/vectors'
import { standardNumerics } from '../numerics/standard'
import { createBouncyTrajectoryAssumptions, createMilestone1Scenario } from './milestone1'

export type DiagnosticPresetId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9'

export interface DiagnosticInputs {
  readonly cubeFeetPosition: Vec3
  readonly attackerFeetPosition: Vec3
  readonly attackerEyePosition: Vec3
  readonly aimPoint: Vec3
  readonly damageArgument: number
  readonly trajectoryTicks: number
}

export interface DiagnosticPreset {
  readonly id: DiagnosticPresetId
  readonly inputs: DiagnosticInputs
}

export interface DiagnosticEvaluation {
  readonly inputs: DiagnosticInputs
  readonly callResult: KnockbackCallResult
  readonly trajectory: TrajectoryResult
  readonly launchSummary: LaunchSummary
}

const sharedFeet = { x: 0, y: 0, z: 1.5 } as const
const sharedEyes = { x: 0, y: 1.62, z: 1.5 } as const
const sharedAim = { x: 0, y: 0.49, z: 0.48 } as const
const sharedCubeFeet = { x: 0, y: 0, z: 0 } as const
const standardDefaultTrajectoryTicks = 15

export function createMilestone1DefaultInputs(): DiagnosticInputs {
  const attackerFeetPosition = { x: 0, y: -0.3, z: 2.6 } as const
  const inputs: DiagnosticInputs = {
    cubeFeetPosition: { x: 0, y: 0, z: 0 },
    attackerFeetPosition,
    attackerEyePosition: {
      x: attackerFeetPosition.x,
      y: attackerFeetPosition.y + je26_2Constants.standingPlayerEyeHeight.value,
      z: attackerFeetPosition.z,
    },
    aimPoint: { x: 0, y: 0.4, z: -1.7 },
    damageArgument: 1,
    trajectoryTicks: 0,
  }

  return {
    ...inputs,
    trajectoryTicks: findDefaultTrajectoryTicks(inputs),
  }
}

// Source: minecraft-je-research/notes/in-game-data/sulfur_cube_launch_direction/
// sulfur_cube_launch_direction_results.csv, direct-melee runs M1-M9.
export const diagnosticPresets: readonly DiagnosticPreset[] = [
  {
    id: 'M1',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: sharedFeet,
      attackerEyePosition: sharedEyes,
      aimPoint: sharedAim,
      damageArgument: 1,
      trajectoryTicks: standardDefaultTrajectoryTicks,
    },
  },
  {
    id: 'M2',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: sharedFeet,
      attackerEyePosition: sharedEyes,
      aimPoint: { x: -0.4, y: 0.49, z: 0.48 },
      damageArgument: 1,
      trajectoryTicks: standardDefaultTrajectoryTicks,
    },
  },
  {
    id: 'M3',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: sharedFeet,
      attackerEyePosition: sharedEyes,
      aimPoint: { x: 0.4, y: 0.49, z: 0.48 },
      damageArgument: 1,
      trajectoryTicks: standardDefaultTrajectoryTicks,
    },
  },
  {
    id: 'M4',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: sharedFeet,
      attackerEyePosition: sharedEyes,
      aimPoint: { x: 0, y: 0.88, z: 0.48 },
      damageArgument: 1,
      trajectoryTicks: standardDefaultTrajectoryTicks,
    },
  },
  {
    id: 'M5',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: sharedFeet,
      attackerEyePosition: sharedEyes,
      aimPoint: { x: 0, y: 0.1, z: 0.48 },
      damageArgument: 1,
      trajectoryTicks: standardDefaultTrajectoryTicks,
    },
  },
  {
    id: 'M6',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: { x: 0, y: 1, z: 1.5 },
      attackerEyePosition: { x: 0, y: 2.62, z: 1.5 },
      aimPoint: sharedAim,
      damageArgument: 1,
      trajectoryTicks: 11,
    },
  },
  {
    id: 'M7',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: { x: 0, y: -1, z: 1.5 },
      attackerEyePosition: { x: 0, y: 0.62, z: 1.5 },
      aimPoint: sharedAim,
      damageArgument: 1,
      trajectoryTicks: standardDefaultTrajectoryTicks,
    },
  },
  {
    id: 'M8',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: sharedFeet,
      attackerEyePosition: sharedEyes,
      aimPoint: sharedAim,
      damageArgument: 4,
      trajectoryTicks: 23,
    },
  },
  {
    id: 'M9',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: sharedFeet,
      attackerEyePosition: sharedEyes,
      aimPoint: sharedAim,
      damageArgument: 9,
      trajectoryTicks: 31,
    },
  },
]

function assertFiniteVec3(vector: Vec3, name: string): void {
  for (const [component, value] of Object.entries(vector)) {
    if (!Number.isFinite(value)) {
      throw new RangeError(`${name}.${component} must be finite`)
    }
  }
}

export function getDiagnosticPreset(id: DiagnosticPresetId): DiagnosticPreset {
  const preset = diagnosticPresets.find((candidate) => candidate.id === id)

  if (preset === undefined) {
    throw new RangeError(`unknown diagnostic preset: ${id}`)
  }

  return preset
}

export function evaluateDiagnosticInputs(
  inputs: DiagnosticInputs,
  numerics: NumericBackend = standardNumerics,
): DiagnosticEvaluation {
  assertFiniteVec3(inputs.attackerFeetPosition, 'attackerFeetPosition')
  assertFiniteVec3(inputs.attackerEyePosition, 'attackerEyePosition')
  assertFiniteVec3(inputs.aimPoint, 'aimPoint')
  assertFiniteVec3(inputs.cubeFeetPosition, 'cubeFeetPosition')

  if (!Number.isFinite(inputs.damageArgument) || inputs.damageArgument < 0) {
    throw new RangeError('damageArgument must be finite and nonnegative')
  }

  if (
    !Number.isInteger(inputs.trajectoryTicks) ||
    inputs.trajectoryTicks < 0 ||
    inputs.trajectoryTicks > 200
  ) {
    throw new RangeError('trajectoryTicks must be an integer from 0 to 200')
  }

  const eyeToAim = subtractVec3(inputs.aimPoint, inputs.attackerEyePosition)

  if (lengthVec3(eyeToAim, numerics) < je26_2KnockbackMechanics.vectorNormalizationThreshold) {
    throw new RangeError('aimPoint must define a nonzero look direction from attackerEyePosition')
  }

  const lookDirection = normalizeVec3(
    eyeToAim,
    numerics,
    je26_2KnockbackMechanics.vectorNormalizationThreshold,
  )
  const scenario = createMilestone1Scenario(
    {
      feetPosition: inputs.attackerFeetPosition,
      eyePosition: inputs.attackerEyePosition,
      lookDirection,
    },
    inputs.cubeFeetPosition,
    {
      x: inputs.attackerFeetPosition.x - inputs.cubeFeetPosition.x,
      y: inputs.attackerFeetPosition.z - inputs.cubeFeetPosition.z,
    },
    inputs.damageArgument,
    numerics,
  )
  const callResult = applySulfurCubeKnockbackCall(
    scenario.initialVelocity,
    scenario.call,
    scenario.context,
    numerics,
  )
  const trajectory = simulateFreeFlightTrajectory(
    scenario.context.cube.feetPosition,
    callResult.resultingVelocity,
    inputs.trajectoryTicks,
    createBouncyTrajectoryAssumptions(numerics),
  )

  return {
    inputs: {
      cubeFeetPosition: { ...inputs.cubeFeetPosition },
      attackerFeetPosition: { ...inputs.attackerFeetPosition },
      attackerEyePosition: { ...inputs.attackerEyePosition },
      aimPoint: { ...inputs.aimPoint },
      damageArgument: inputs.damageArgument,
      trajectoryTicks: inputs.trajectoryTicks,
    },
    callResult,
    trajectory,
    launchSummary: summarizeLaunchVelocity(
      callResult.addedVelocity,
      je26_2KnockbackMechanics.vectorNormalizationThreshold,
      numerics,
    ),
  }
}

export function findDefaultTrajectoryTicks(
  inputs: DiagnosticInputs,
  numerics: NumericBackend = standardNumerics,
): number {
  const maximumTicks = 200
  const targetDrop = 2
  const evaluation = evaluateDiagnosticInputs(
    { ...inputs, trajectoryTicks: maximumTicks },
    numerics,
  )
  const targetY = evaluation.trajectory.initialPosition.y - targetDrop
  const firstTickAtOrBelowTarget = evaluation.trajectory.ticks.find(
    (tick) => tick.resultingPosition.y <= targetY,
  )

  return firstTickAtOrBelowTarget?.tick ?? maximumTicks
}
