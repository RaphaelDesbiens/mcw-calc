import type { Vec3 } from '../model/types'
import type { DiagnosticInputs } from '../presets/diagnostic'
import type { DiagnosticFormState, NumericFormValue } from './types'
import { je26_2Constants } from '../data/je26_2'

function stringifyNumber(value: number): string {
  return String(value)
}

function parseNumber(value: NumericFormValue, field: keyof DiagnosticFormState): number {
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
