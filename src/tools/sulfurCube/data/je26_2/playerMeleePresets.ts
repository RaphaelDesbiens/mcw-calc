import type { SourcedValue } from './provenance'
import { sourcedValue } from './provenance'

export type Je26_2PlayerMeleeWeaponPresetId = 'bareHand' | 'ironSword'

export interface Je26_2PlayerMeleeWeaponPreset {
  readonly id: Je26_2PlayerMeleeWeaponPresetId
  readonly effectiveAttackDamage: SourcedValue<number>
  readonly effectiveAttackKnockback: SourcedValue<number>
  readonly maximumVanillaSurvivalKnockbackLevel: SourcedValue<0 | 1 | 2>
}

export const je26_2PlayerMeleeWeaponPresets = Object.freeze({
  bareHand: Object.freeze({
    id: 'bareHand',
    effectiveAttackDamage: sourcedValue(
      1,
      ['playerMeleeWeaponPresets'],
      'player base ATTACK_DAMAGE 1 with no held-item modifier',
    ),
    effectiveAttackKnockback: sourcedValue(0, ['playerMeleeWeaponPresets']),
    maximumVanillaSurvivalKnockbackLevel: sourcedValue<0 | 1 | 2>(0, [
      'playerMeleeWeaponAvailability',
    ]),
  }),
  ironSword: Object.freeze({
    id: 'ironSword',
    effectiveAttackDamage: sourcedValue(
      6,
      ['playerMeleeWeaponPresets'],
      'player base ATTACK_DAMAGE 1 + iron sword modifier 5',
    ),
    effectiveAttackKnockback: sourcedValue(0, ['playerMeleeWeaponPresets']),
    maximumVanillaSurvivalKnockbackLevel: sourcedValue<0 | 1 | 2>(2, [
      'playerMeleeWeaponAvailability',
    ]),
  }),
} satisfies Record<Je26_2PlayerMeleeWeaponPresetId, Je26_2PlayerMeleeWeaponPreset>)

export const je26_2PlayerMeleeWeaponPresetOrder = ['bareHand', 'ironSword'] as const
