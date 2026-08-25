import type { DiagnosticPresetId } from '../presets/diagnostic'

export type NumericFormValue = string | number
export type DiagnosticPresetSelection = DiagnosticPresetId | 'custom'

export interface DiagnosticFormState {
  readonly cubeFeetX: NumericFormValue
  readonly cubeFeetY: NumericFormValue
  readonly cubeFeetZ: NumericFormValue
  readonly attackerFeetX: NumericFormValue
  readonly attackerFeetY: NumericFormValue
  readonly attackerFeetZ: NumericFormValue
  readonly attackerEyeX: NumericFormValue
  readonly attackerEyeY: NumericFormValue
  readonly attackerEyeZ: NumericFormValue
  readonly aimX: NumericFormValue
  readonly aimY: NumericFormValue
  readonly aimZ: NumericFormValue
  readonly damageArgument: NumericFormValue
  readonly trajectoryTicks: NumericFormValue
}
