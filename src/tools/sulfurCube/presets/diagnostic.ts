import type { Je26_2UniformFloorProfileId } from '../data/je26_2'
import type { ClearRayEntityReachResult } from '../model/reach'
import type {
  CubeLaunchProperties,
  KnockbackCallResult,
  LaunchSummary,
  SulfurCubeKnockbackContext,
  UniformFloorTrajectoryResult,
  Vec3,
} from '../model/types'
import type { NumericBackend } from '../numerics/types'
import {
  je26_2Constants,
  je26_2KnockbackMechanics,
  je26_2UniformFloorProfiles,
} from '../data/je26_2'
import { applySulfurCubeKnockbackCall } from '../model/knockbackCall'
import { summarizeLaunchVelocity } from '../model/launchSummary'
import { simulateRepeatedUniformFloorTrajectory } from '../model/trajectory'
import { lengthVec3, normalizeVec3, subtractVec3 } from '../model/vectors'
import { standardNumerics } from '../numerics/standard'
import {
  createBouncyCubeLaunchProperties,
  createMilestone1Context,
  createRestingGroundVelocity,
  createUniformFloorTrajectoryAssumptions,
} from './milestone1'
import { resolveOrdinarySurvivalPlayerMeleeReach } from './playerMeleeReach'

export type DiagnosticPresetId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9'

export interface DiagnosticInputs {
  readonly cubeFeetPosition: Vec3
  readonly attackerFeetPosition: Vec3
  readonly attackerEyePosition: Vec3
  readonly aimPoint: Vec3
  readonly damageArgument: number
  readonly trajectoryTicks: number
  readonly floorProfileId: Je26_2UniformFloorProfileId
}

export interface DiagnosticPreset {
  readonly id: DiagnosticPresetId
  readonly inputs: DiagnosticInputs
}

export interface DiagnosticEvaluation {
  readonly inputs: DiagnosticInputs
  readonly properties: CubeLaunchProperties
  readonly callResult: KnockbackCallResult
  /** Stored grounded Motion immediately before the attack is processed. */
  readonly preAttackVelocity: Vec3
  /** Net velocity added by every ordered operation in the attack. */
  readonly attackAddedVelocity: Vec3
  /** Resulting post-hit Motion used by the scenes and trajectory continuation. */
  readonly launchVelocity: Vec3
  readonly trajectory: UniformFloorTrajectoryResult
  readonly launchSummary: LaunchSummary
  readonly reach: ClearRayEntityReachResult
}

const sharedFeet = { x: 0, y: 0, z: 1.5 } as const
const sharedEyes = { x: 0, y: 1.62, z: 1.5 } as const
const sharedAim = { x: 0, y: 0.49, z: 0.48 } as const
const sharedCubeFeet = { x: 0, y: 0, z: 0 } as const
const standardDefaultTrajectoryTicks = 15
export const maximumTrajectoryTicks = 1000
export const defaultUniformFloorProfileId: Je26_2UniformFloorProfileId = 'ordinary_full_block'

export function createMilestone1DefaultInputs(
  numerics: NumericBackend = standardNumerics,
): DiagnosticInputs {
  const attackerFeetPosition = { x: 0, y: -0.3, z: -2.6 } as const
  const inputs: DiagnosticInputs = {
    cubeFeetPosition: { x: 0, y: 0, z: 0 },
    attackerFeetPosition,
    attackerEyePosition: {
      x: attackerFeetPosition.x,
      y:
        attackerFeetPosition.y +
        numerics.sourceFloat(je26_2Constants.standingPlayerEyeHeight.value),
      z: attackerFeetPosition.z,
    },
    aimPoint: { x: 0, y: 0.4, z: 1.7 },
    damageArgument: 1,
    trajectoryTicks: 0,
    floorProfileId: defaultUniformFloorProfileId,
  }

  return {
    ...inputs,
    trajectoryTicks: findDefaultTrajectoryTicks(inputs, numerics),
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
      floorProfileId: defaultUniformFloorProfileId,
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
      floorProfileId: defaultUniformFloorProfileId,
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
      floorProfileId: defaultUniformFloorProfileId,
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
      floorProfileId: defaultUniformFloorProfileId,
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
      floorProfileId: defaultUniformFloorProfileId,
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
      floorProfileId: defaultUniformFloorProfileId,
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
      floorProfileId: defaultUniformFloorProfileId,
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
      floorProfileId: defaultUniformFloorProfileId,
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
      floorProfileId: defaultUniformFloorProfileId,
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

export function createDiagnosticKnockbackContext(
  inputs: DiagnosticInputs,
  numerics: NumericBackend = standardNumerics,
  properties: CubeLaunchProperties = createBouncyCubeLaunchProperties(),
  attackerLookDirection?: Vec3,
): SulfurCubeKnockbackContext {
  assertFiniteVec3(inputs.attackerFeetPosition, 'attackerFeetPosition')
  assertFiniteVec3(inputs.attackerEyePosition, 'attackerEyePosition')
  assertFiniteVec3(inputs.aimPoint, 'aimPoint')
  assertFiniteVec3(inputs.cubeFeetPosition, 'cubeFeetPosition')
  if (attackerLookDirection !== undefined) {
    assertFiniteVec3(attackerLookDirection, 'attackerLookDirection')
  }

  if (
    !Number.isInteger(inputs.trajectoryTicks) ||
    inputs.trajectoryTicks < 0 ||
    inputs.trajectoryTicks > maximumTrajectoryTicks
  ) {
    throw new RangeError(`trajectoryTicks must be an integer from 0 to ${maximumTrajectoryTicks}`)
  }

  if (je26_2UniformFloorProfiles[inputs.floorProfileId] === undefined) {
    throw new RangeError(`unknown JE 26.2 uniform floor profile: ${inputs.floorProfileId}`)
  }

  const eyeToAim = subtractVec3(inputs.aimPoint, inputs.attackerEyePosition)
  const vectorNormalizationThreshold = numerics.sourceFloat(
    je26_2KnockbackMechanics.vectorNormalizationThreshold,
  )
  const sourceLookDirection = attackerLookDirection ?? eyeToAim

  if (lengthVec3(sourceLookDirection, numerics) < vectorNormalizationThreshold) {
    throw new RangeError('aimPoint must define a nonzero look direction from attackerEyePosition')
  }

  // A command-derived view vector is intentionally left unnormalized here:
  // SulfurCube normalizes getLookAngle exactly once. The generic target-vector
  // path retains its historical pre-normalization behavior.
  const lookDirection =
    attackerLookDirection === undefined
      ? normalizeVec3(eyeToAim, numerics, vectorNormalizationThreshold)
      : { ...attackerLookDirection }

  return createMilestone1Context(
    {
      feetPosition: inputs.attackerFeetPosition,
      eyePosition: inputs.attackerEyePosition,
      lookDirection,
    },
    inputs.cubeFeetPosition,
    numerics,
    properties,
  )
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
  properties: CubeLaunchProperties = createBouncyCubeLaunchProperties(),
  attackerLookDirection?: Vec3,
): DiagnosticEvaluation {
  if (!Number.isFinite(inputs.damageArgument) || inputs.damageArgument < 0) {
    throw new RangeError('damageArgument must be finite and nonnegative')
  }
  const context = createDiagnosticKnockbackContext(
    inputs,
    numerics,
    properties,
    attackerLookDirection,
  )
  const initialVelocity = createRestingGroundVelocity(properties, numerics)
  const callResult = applySulfurCubeKnockbackCall(
    initialVelocity,
    {
      damageArgument: inputs.damageArgument,
      horizontalBaseDirection: {
        x: inputs.attackerFeetPosition.x - inputs.cubeFeetPosition.x,
        z: inputs.attackerFeetPosition.z - inputs.cubeFeetPosition.z,
      },
      scaling: { kind: 'ordinaryDamage' },
    },
    context,
    numerics,
  )
  const trajectory = simulateRepeatedUniformFloorTrajectory(
    {
      tick: 0,
      feetPosition: context.cube.feetPosition,
      velocity: callResult.resultingVelocity,
      onGround: true,
      supportingFloor: true,
    },
    inputs.trajectoryTicks,
    createUniformFloorTrajectoryAssumptions(
      context.cube.feetPosition.y,
      properties,
      je26_2UniformFloorProfiles[inputs.floorProfileId],
    ),
    numerics,
  )

  return {
    inputs: {
      cubeFeetPosition: { ...inputs.cubeFeetPosition },
      attackerFeetPosition: { ...inputs.attackerFeetPosition },
      attackerEyePosition: { ...inputs.attackerEyePosition },
      aimPoint: { ...inputs.aimPoint },
      damageArgument: inputs.damageArgument,
      trajectoryTicks: inputs.trajectoryTicks,
      floorProfileId: inputs.floorProfileId,
    },
    properties: { ...properties },
    callResult,
    preAttackVelocity: { ...initialVelocity },
    attackAddedVelocity: { ...callResult.addedVelocity },
    launchVelocity: { ...callResult.resultingVelocity },
    trajectory,
    launchSummary: summarizeLaunchVelocity(
      callResult.resultingVelocity,
      numerics.sourceFloat(je26_2KnockbackMechanics.vectorNormalizationThreshold),
      numerics,
    ),
    reach: resolveOrdinarySurvivalPlayerMeleeReach(context),
  }
}

export function findDefaultTrajectoryTicks(
  inputs: DiagnosticInputs,
  numerics: NumericBackend = standardNumerics,
  properties: CubeLaunchProperties = createBouncyCubeLaunchProperties(),
  attackerLookDirection?: Vec3,
): number {
  const maximumTicks = maximumTrajectoryTicks
  const evaluation = evaluateDiagnosticInputs(
    { ...inputs, trajectoryTicks: maximumTicks },
    numerics,
    properties,
    attackerLookDirection,
  )
  return evaluation.trajectory.ticks.length
}
