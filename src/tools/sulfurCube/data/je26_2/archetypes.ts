import type { SourcedValue } from './provenance'
import { je26_2Constants } from './constants'
import { sourcedValue } from './provenance'

export type AttributeModifierOperation =
  | 'add_value'
  | 'add_multiplied_base'
  | 'add_multiplied_total'

export interface VersionedAttributeModifier {
  readonly id: string
  readonly attribute: string
  readonly amount: SourcedValue<number>
  readonly operation: AttributeModifierOperation
}

const bouncyAttributeModifiers: readonly VersionedAttributeModifier[] = [
  {
    id: 'minecraft:bouncy_add_knockback_resistance',
    attribute: 'minecraft:knockback_resistance',
    amount: sourcedValue(-2, ['bouncyArchetype']),
    operation: 'add_value',
  },
  {
    id: 'minecraft:bouncy_add_explosion_knockback_resistance',
    attribute: 'minecraft:explosion_knockback_resistance',
    amount: sourcedValue(-2, ['bouncyArchetype']),
    operation: 'add_value',
  },
  {
    id: 'minecraft:bouncy_add_bounciness',
    attribute: 'minecraft:bounciness',
    amount: sourcedValue(0.8999999761581421, ['bouncyArchetype']),
    operation: 'add_value',
  },
  {
    id: 'minecraft:bouncy_mul_friction_modifier',
    attribute: 'minecraft:friction_modifier',
    amount: sourcedValue(-0.699999988079071, ['bouncyArchetype']),
    operation: 'add_multiplied_total',
  },
  {
    id: 'minecraft:bouncy_mul_air_drag_modifier',
    attribute: 'minecraft:air_drag_modifier',
    amount: sourcedValue(-0.9900000002235174, ['bouncyArchetype']),
    operation: 'add_multiplied_total',
  },
]

export const bouncyArchetype = {
  id: 'minecraft:bouncy',
  items: sourcedValue('#minecraft:sulfur_cube_archetype/bouncy', ['bouncyArchetype']),
  buoyant: sourcedValue(true, ['bouncyArchetype']),
  knockbackModifiers: {
    horizontalPower: sourcedValue(0.4125, ['bouncyArchetype']),
    verticalPower: sourcedValue(0.105, ['bouncyArchetype']),
  },
  attributeModifiers: bouncyAttributeModifiers,
  effectiveProperties: {
    knockbackResistance: sourcedValue(
      -2,
      ['attributeDefaults', 'attributeFolding', 'bouncyArchetype'],
      'Default 0 plus the Bouncy -2 add_value modifier.',
    ),
    explosionKnockbackResistance: sourcedValue(
      -2,
      ['attributeDefaults', 'attributeFolding', 'bouncyArchetype'],
      'Default 0 plus the Bouncy -2 add_value modifier.',
    ),
    bounciness: sourcedValue(
      0.8999999761581421,
      ['attributeDefaults', 'attributeFolding', 'bouncyArchetype'],
      'Default 0 plus the Bouncy add_value modifier.',
    ),
    frictionModifier: sourcedValue(
      je26_2Constants.defaultFrictionModifier.value * (1 - 0.699999988079071),
      ['attributeDefaults', 'attributeFolding', 'bouncyArchetype'],
      'Default 1 multiplied by (1 + the Bouncy add_multiplied_total amount).',
    ),
    airDragModifier: sourcedValue(
      je26_2Constants.defaultAirDragModifier.value * (1 - 0.9900000002235174),
      ['attributeDefaults', 'attributeFolding', 'bouncyArchetype'],
      'Default 1 multiplied by (1 + the Bouncy add_multiplied_total amount).',
    ),
  },
} as const
