import type { Vec3 } from '../model/types'
import type { DiagnosticInputs } from '../presets/diagnostic'
import type { PlayerMeleeInputs } from '../presets/playerMelee'
import type { DiagnosticFormState, NumericFormValue, PlayerMeleeFormState } from './types'
import { je26_2Constants } from '../data/je26_2'

function stringifyNumber(value: number): string {
  return String(value)
}

export function createPlayerMeleeFormState(inputs: PlayerMeleeInputs): PlayerMeleeFormState {
  return {
    weaponPresetId: inputs.weaponPresetId,
    attackStrengthPercent: stringifyNumber(inputs.attackStrength * 100),
    sprinting: inputs.sprinting,
    criticalHitConditions: inputs.criticalHitConditions,
    knockbackEnchantmentLevel: inputs.knockbackEnchantmentLevel,
  }
}

export function parsePlayerMeleeFormState(state: PlayerMeleeFormState): PlayerMeleeInputs {
  const attackStrengthPercent = parseNumber(state.attackStrengthPercent, 'attackStrengthPercent')

  if (attackStrengthPercent < 0 || attackStrengthPercent > 100) {
    throw new RangeError('attackStrengthPercent must be between 0 and 100')
  }

  if (![0, 1, 2].includes(state.knockbackEnchantmentLevel)) {
    throw new RangeError('knockbackEnchantmentLevel must be 0, 1, or 2')
  }

  return {
    weaponPresetId: state.weaponPresetId,
    attackStrength: attackStrengthPercent / 100,
    sprinting: state.sprinting,
    criticalHitConditions: state.criticalHitConditions,
    knockbackEnchantmentLevel: state.knockbackEnchantmentLevel,
  }
}

function parseNumber(value: NumericFormValue, field: string): number {
  if (typeof value === 'string' && value.trim() === '') {
    throw new RangeError(`${field} must not be empty`)
  }

  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(parsed)) {
    throw new RangeError(`${field} must be a finite number`)
  }

  return parsed
}

function interactionNumber(value: number): number {
  const rounded = Math.round(value * 10000) / 10000

  return Object.is(rounded, -0) ? 0 : rounded
}

export function createDiagnosticFormState(inputs: DiagnosticInputs): DiagnosticFormState {
  return {
    cubeFeetX: stringifyNumber(inputs.cubeFeetPosition.x),
    cubeFeetY: stringifyNumber(inputs.cubeFeetPosition.y),
    cubeFeetZ: stringifyNumber(inputs.cubeFeetPosition.z),
    attackerFeetX: stringifyNumber(inputs.attackerFeetPosition.x),
    attackerFeetY: stringifyNumber(inputs.attackerFeetPosition.y),
    attackerFeetZ: stringifyNumber(inputs.attackerFeetPosition.z),
    attackerEyeX: stringifyNumber(inputs.attackerEyePosition.x),
    attackerEyeY: stringifyNumber(inputs.attackerEyePosition.y),
    attackerEyeZ: stringifyNumber(inputs.attackerEyePosition.z),
    aimX: stringifyNumber(inputs.aimPoint.x),
    aimY: stringifyNumber(inputs.aimPoint.y),
    aimZ: stringifyNumber(inputs.aimPoint.z),
    damageArgument: stringifyNumber(inputs.damageArgument),
    trajectoryTicks: stringifyNumber(inputs.trajectoryTicks),
    floorProfileId: inputs.floorProfileId,
  }
}

export function parseDiagnosticFormState(state: DiagnosticFormState): DiagnosticInputs {
  return {
    cubeFeetPosition: {
      x: parseNumber(state.cubeFeetX, 'cubeFeetX'),
      y: parseNumber(state.cubeFeetY, 'cubeFeetY'),
      z: parseNumber(state.cubeFeetZ, 'cubeFeetZ'),
    },
    attackerFeetPosition: {
      x: parseNumber(state.attackerFeetX, 'attackerFeetX'),
      y: parseNumber(state.attackerFeetY, 'attackerFeetY'),
      z: parseNumber(state.attackerFeetZ, 'attackerFeetZ'),
    },
    attackerEyePosition: {
      x: parseNumber(state.attackerEyeX, 'attackerEyeX'),
      y: parseNumber(state.attackerEyeY, 'attackerEyeY'),
      z: parseNumber(state.attackerEyeZ, 'attackerEyeZ'),
    },
    aimPoint: {
      x: parseNumber(state.aimX, 'aimX'),
      y: parseNumber(state.aimY, 'aimY'),
      z: parseNumber(state.aimZ, 'aimZ'),
    },
    damageArgument: parseNumber(state.damageArgument, 'damageArgument'),
    trajectoryTicks: parseNumber(state.trajectoryTicks, 'trajectoryTicks'),
    floorProfileId: state.floorProfileId,
  }
}

export function updateAimPointInFormState(
  state: DiagnosticFormState,
  aimPoint: Vec3,
): DiagnosticFormState {
  return {
    ...state,
    aimX: interactionNumber(aimPoint.x),
    aimY: interactionNumber(aimPoint.y),
    aimZ: interactionNumber(aimPoint.z),
  }
}

export function resetAttackerEyeToStandingPresetInFormState(
  state: DiagnosticFormState,
): DiagnosticFormState {
  const inputs = parseDiagnosticFormState(state)
  const eyeHeight = je26_2Constants.standingPlayerEyeHeight.value

  return {
    ...state,
    attackerEyeX: interactionNumber(inputs.attackerFeetPosition.x),
    attackerEyeY: interactionNumber(inputs.attackerFeetPosition.y + eyeHeight),
    attackerEyeZ: interactionNumber(inputs.attackerFeetPosition.z),
  }
}

export function translateAttackerInFormState(
  state: DiagnosticFormState,
  delta: Vec3,
): DiagnosticFormState {
  const inputs = parseDiagnosticFormState(state)

  return createDiagnosticFormState({
    ...inputs,
    attackerFeetPosition: {
      x: interactionNumber(inputs.attackerFeetPosition.x + delta.x),
      y: interactionNumber(inputs.attackerFeetPosition.y + delta.y),
      z: interactionNumber(inputs.attackerFeetPosition.z + delta.z),
    },
    attackerEyePosition: {
      x: interactionNumber(inputs.attackerEyePosition.x + delta.x),
      y: interactionNumber(inputs.attackerEyePosition.y + delta.y),
      z: interactionNumber(inputs.attackerEyePosition.z + delta.z),
    },
    aimPoint: {
      x: interactionNumber(inputs.aimPoint.x + delta.x),
      y: interactionNumber(inputs.aimPoint.y + delta.y),
      z: interactionNumber(inputs.aimPoint.z + delta.z),
    },
  })
}

export function translateAttackerForFeetFormEdit(
  currentState: DiagnosticFormState,
  nextState: DiagnosticFormState,
): DiagnosticFormState {
  const feetFields = ['attackerFeetX', 'attackerFeetY', 'attackerFeetZ'] as const

  if (feetFields.every((field) => currentState[field] === nextState[field])) {
    return nextState
  }

  try {
    const delta = {
      x:
        parseNumber(nextState.attackerFeetX, 'attackerFeetX') -
        parseNumber(currentState.attackerFeetX, 'attackerFeetX'),
      y:
        parseNumber(nextState.attackerFeetY, 'attackerFeetY') -
        parseNumber(currentState.attackerFeetY, 'attackerFeetY'),
      z:
        parseNumber(nextState.attackerFeetZ, 'attackerFeetZ') -
        parseNumber(currentState.attackerFeetZ, 'attackerFeetZ'),
    }
    const translatedState = translateAttackerInFormState(currentState, delta)

    return {
      ...nextState,
      attackerEyeX: translatedState.attackerEyeX,
      attackerEyeY: translatedState.attackerEyeY,
      attackerEyeZ: translatedState.attackerEyeZ,
      aimX: translatedState.aimX,
      aimY: translatedState.aimY,
      aimZ: translatedState.aimZ,
    }
  } catch {
    return nextState
  }
}

export function translateCubeInFormState(
  state: DiagnosticFormState,
  delta: Vec3,
): DiagnosticFormState {
  const inputs = parseDiagnosticFormState(state)

  return createDiagnosticFormState({
    ...inputs,
    cubeFeetPosition: {
      x: interactionNumber(inputs.cubeFeetPosition.x + delta.x),
      y: interactionNumber(inputs.cubeFeetPosition.y + delta.y),
      z: interactionNumber(inputs.cubeFeetPosition.z + delta.z),
    },
  })
}
