import type { DiagnosticInputs } from '../presets/diagnostic'
import type { DiagnosticFormState, NumericFormValue } from './types'

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

export function createDiagnosticFormState(inputs: DiagnosticInputs): DiagnosticFormState {
  return {
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
