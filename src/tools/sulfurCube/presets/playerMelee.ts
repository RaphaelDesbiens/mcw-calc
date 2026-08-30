import type { Je26_2PlayerMeleeWeaponPresetId } from '../data/je26_2'
import type { CubeLaunchProperties, VelocityOperationSequenceResult } from '../model/types'
import type { NumericBackend } from '../numerics/types'
import type {
  PlayerCriticalEligibilityState,
  PrimaryPlayerMeleeAttackConfiguration,
  SuccessfulAttackResolution,
} from '../resolution'
import type { DiagnosticEvaluation, DiagnosticInputs } from './diagnostic'
import { je26_2KnockbackMechanics, je26_2PlayerMeleeWeaponPresets } from '../data/je26_2'
import { summarizeLaunchVelocity } from '../model/launchSummary'
import { simulateFlatFloorFirstContactTrajectory } from '../model/trajectory'
import { applyVelocityOperations } from '../model/velocityOperations'
import { standardNumerics } from '../numerics/standard'
import { resolveAttackConfiguration } from '../resolution'
import { createDiagnosticKnockbackContext } from './diagnostic'
import {
  createBouncyCubeLaunchProperties,
  createFlatFloorTrajectoryAssumptions,
} from './milestone1'

export interface PlayerMeleeInputs {
  readonly weaponPresetId: Je26_2PlayerMeleeWeaponPresetId
  /** Normalized cooldown strength in the inclusive range 0 to 1. */
  readonly attackStrength: number
  readonly sprinting: boolean
  /** Requests the standard airborne/falling eligibility state; the resolver still derives success. */
  readonly criticalHitConditions: boolean
  readonly knockbackEnchantmentLevel: 0 | 1 | 2
}

export interface PlayerMeleeEvaluation extends DiagnosticEvaluation {
  readonly kind: 'primaryPlayerMelee'
  readonly playerMeleeInputs: PlayerMeleeInputs
  readonly attackConfiguration: PrimaryPlayerMeleeAttackConfiguration
  readonly attackResolution: SuccessfulAttackResolution
  readonly operationSequence: VelocityOperationSequenceResult
  readonly attackerYawDegrees: number
}

export interface PlayerMeleeVanillaSurvivalIssue {
  readonly code: 'unsupportedKnockbackForWeapon'
  readonly weaponPresetId: Je26_2PlayerMeleeWeaponPresetId
  readonly selectedLevel: 1 | 2
  readonly maximumLevel: 0 | 1 | 2
}

export interface PlayerMeleeVanillaSurvivalAvailability {
  readonly obtainable: boolean
  readonly issues: readonly PlayerMeleeVanillaSurvivalIssue[]
}

const groundedEligibility: PlayerCriticalEligibilityState = {
  fallDistancePositive: false,
  onGround: true,
  onClimbable: false,
  inWater: false,
  mobilityRestricted: false,
  passenger: false,
  targetIsLiving: true,
}

const airborneEligibility: PlayerCriticalEligibilityState = {
  fallDistancePositive: true,
  onGround: false,
  onClimbable: false,
  inWater: false,
  mobilityRestricted: false,
  passenger: false,
  targetIsLiving: true,
}

export function createDefaultPlayerMeleeInputs(): PlayerMeleeInputs {
  return {
    weaponPresetId: 'bareHand',
    attackStrength: 1,
    sprinting: false,
    criticalHitConditions: false,
    knockbackEnchantmentLevel: 0,
  }
}

export function resolvePlayerMeleeVanillaSurvivalAvailability(
  inputs: Pick<PlayerMeleeInputs, 'weaponPresetId' | 'knockbackEnchantmentLevel'>,
): PlayerMeleeVanillaSurvivalAvailability {
  const weapon = je26_2PlayerMeleeWeaponPresets[inputs.weaponPresetId]

  if (weapon === undefined) {
    return { obtainable: false, issues: [] }
  }

  const maximumLevel = weapon.maximumVanillaSurvivalKnockbackLevel.value
  const issues: PlayerMeleeVanillaSurvivalIssue[] =
    inputs.knockbackEnchantmentLevel > maximumLevel
      ? [
          {
            code: 'unsupportedKnockbackForWeapon',
            weaponPresetId: inputs.weaponPresetId,
            selectedLevel: inputs.knockbackEnchantmentLevel as 1 | 2,
            maximumLevel,
          },
        ]
      : []

  return { obtainable: issues.length === 0, issues }
}

export function deriveMinecraftYawDegreesFromAim(
  inputs: DiagnosticInputs,
  fallbackYawDegrees: number,
  numerics: NumericBackend = standardNumerics,
): number {
  if (!Number.isFinite(fallbackYawDegrees)) {
    throw new RangeError('fallbackYawDegrees must be finite')
  }

  const horizontalX = inputs.aimPoint.x - inputs.attackerEyePosition.x
  const horizontalZ = inputs.aimPoint.z - inputs.attackerEyePosition.z
  const horizontalLength = numerics.sqrt(horizontalX * horizontalX + horizontalZ * horizontalZ)

  if (horizontalLength < je26_2KnockbackMechanics.vectorNormalizationThreshold) {
    return fallbackYawDegrees
  }

  return (numerics.atan2(-horizontalX, horizontalZ) * 180) / Math.PI
}

export function createPrimaryPlayerMeleeConfiguration(
  inputs: PlayerMeleeInputs,
  attackerYawDegrees: number,
): PrimaryPlayerMeleeAttackConfiguration {
  const weapon = je26_2PlayerMeleeWeaponPresets[inputs.weaponPresetId]

  if (weapon === undefined) {
    throw new RangeError(`unknown player melee weapon preset: ${inputs.weaponPresetId}`)
  }

  return {
    family: 'primaryPlayerMelee',
    effectiveAttackDamage: weapon.effectiveAttackDamage.value,
    damageEnchantmentBonus: 0,
    itemSpecificDamageBonus: 0,
    attackStrength: inputs.attackStrength,
    sprinting: inputs.sprinting,
    effectiveAttackKnockback: weapon.effectiveAttackKnockback.value,
    knockbackEnchantmentLevel: inputs.knockbackEnchantmentLevel,
    criticalEligibility: inputs.criticalHitConditions ? airborneEligibility : groundedEligibility,
    attackerYawDegrees,
  }
}

export function evaluatePlayerMeleeInputs(
  diagnosticInputs: DiagnosticInputs,
  playerMeleeInputs: PlayerMeleeInputs,
  attackerYawDegrees: number,
  numerics: NumericBackend = standardNumerics,
  properties: CubeLaunchProperties = createBouncyCubeLaunchProperties(),
): PlayerMeleeEvaluation {
  const context = createDiagnosticKnockbackContext(diagnosticInputs, numerics, properties)
  const attackConfiguration = createPrimaryPlayerMeleeConfiguration(
    playerMeleeInputs,
    attackerYawDegrees,
  )
  const attackResolution = resolveAttackConfiguration(attackConfiguration, context, numerics)

  if (attackResolution.status !== 'success') {
    throw new RangeError(`primary player melee resolution returned ${attackResolution.status}`)
  }

  const operationSequence = applyVelocityOperations(
    { x: 0, y: 0, z: 0 },
    attackResolution.operations,
    numerics,
  )
  const firstOperation = operationSequence.operationResults[0]

  if (firstOperation?.kind !== 'sulfurCubeKnockbackCall') {
    throw new RangeError('primary player melee must begin with a sulfur cube knockback call')
  }

  const launchVelocity = operationSequence.resultingVelocity
  const trajectory = simulateFlatFloorFirstContactTrajectory(
    context.cube.feetPosition,
    launchVelocity,
    diagnosticInputs.trajectoryTicks,
    createFlatFloorTrajectoryAssumptions(context.cube.feetPosition.y, properties, numerics),
  )

  return {
    kind: 'primaryPlayerMelee',
    inputs: {
      cubeFeetPosition: { ...diagnosticInputs.cubeFeetPosition },
      attackerFeetPosition: { ...diagnosticInputs.attackerFeetPosition },
      attackerEyePosition: { ...diagnosticInputs.attackerEyePosition },
      aimPoint: { ...diagnosticInputs.aimPoint },
      damageArgument: attackResolution.diagnostics.damageArgument,
      trajectoryTicks: diagnosticInputs.trajectoryTicks,
    },
    properties: { ...properties },
    callResult: firstOperation.knockbackResult,
    launchVelocity: { ...launchVelocity },
    trajectory,
    launchSummary: summarizeLaunchVelocity(
      launchVelocity,
      je26_2KnockbackMechanics.vectorNormalizationThreshold,
      numerics,
    ),
    playerMeleeInputs: { ...playerMeleeInputs },
    attackConfiguration,
    attackResolution,
    operationSequence,
    attackerYawDegrees,
  }
}

export function findDefaultPlayerMeleeTrajectoryTicks(
  diagnosticInputs: DiagnosticInputs,
  playerMeleeInputs: PlayerMeleeInputs,
  attackerYawDegrees: number,
  numerics: NumericBackend = standardNumerics,
  properties: CubeLaunchProperties = createBouncyCubeLaunchProperties(),
): number {
  const maximumTicks = 200
  const evaluation = evaluatePlayerMeleeInputs(
    { ...diagnosticInputs, trajectoryTicks: maximumTicks },
    playerMeleeInputs,
    attackerYawDegrees,
    numerics,
    properties,
  )
  return evaluation.trajectory.contact?.tick ?? maximumTicks
}
