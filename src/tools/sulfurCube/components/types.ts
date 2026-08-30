export type NumericFormValue = string | number

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

export interface PlayerMeleeFormState {
  readonly weaponPresetId: 'bareHand' | 'ironSword'
  readonly attackStrengthPercent: NumericFormValue
  readonly sprinting: boolean
  readonly criticalHitConditions: boolean
  readonly knockbackEnchantmentLevel: 0 | 1 | 2
}
