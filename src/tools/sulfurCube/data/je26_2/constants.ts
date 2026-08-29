import { sourcedValue } from './provenance'

export const je26_2Constants = {
  horizontalHitAngleScale: sourcedValue(1.6, ['sulfurCubeKnockback']),
  verticalHitAngleScale: sourcedValue(0.5, ['sulfurCubeKnockback']),
  verticalPositionAngleScale: sourcedValue(0.8, ['sulfurCubeKnockback']),
  horizontalResultScale: sourcedValue(0.4, ['sulfurCubeKnockback']),
  verticalResultScale: sourcedValue(1.2, ['sulfurCubeKnockback']),
  resultClampMinimum: sourcedValue(-128, ['sulfurCubeKnockback']),
  resultClampMaximum: sourcedValue(128, ['sulfurCubeKnockback']),
  vectorNormalizationThreshold: sourcedValue(1e-5, ['vectorNormalization']),
  movementCutoff: sourcedValue(0.003, ['airTravel']),
  baseAirDrag: sourcedValue(0.91, ['airTravel']),
  defaultGravity: sourcedValue(0.08, ['attributeDefaults']),
  defaultAirDragModifier: sourcedValue(1, ['attributeDefaults']),
  defaultKnockbackResistance: sourcedValue(0, ['attributeDefaults']),
  defaultExplosionKnockbackResistance: sourcedValue(0, ['attributeDefaults']),
  defaultBounciness: sourcedValue(0, ['attributeDefaults']),
  defaultFrictionModifier: sourcedValue(1, ['attributeDefaults']),
  standingPlayerEyeHeight: sourcedValue(1.62, ['standingPlayerEyeHeight']),
  standingPlayerDimensions: sourcedValue(
    { width: 0.6, height: 1.8 },
    ['standingPlayerEyeHeight'],
    'Standing EntityDimensions width and height.',
  ),
  sulfurCubeBaseDimensions: sourcedValue({ width: 0.49, height: 0.49 }, ['sulfurCubeDimensions']),
  adultSulfurCubeRuntimeSize: sourcedValue(2, ['sulfurCubeRuntimeSize']),
  playerMeleeBaseDamageScale: sourcedValue(0.2, ['playerMeleeDamage']),
  playerMeleeStrengthDamageScale: sourcedValue(0.8, ['playerMeleeDamage']),
  playerMeleeFullStrengthThreshold: sourcedValue(0.9, ['playerMeleeDamage']),
  playerMeleeCriticalMultiplier: sourcedValue(1.5, ['playerMeleeDamage']),
  playerMeleeKnockbackDivisor: sourcedValue(2, ['playerMeleeKnockback']),
  playerMeleeSprintKnockbackBonus: sourcedValue(0.5, ['playerMeleeKnockback']),
  playerMeleeKnockbackPerEnchantmentLevel: sourcedValue(1, ['playerMeleeKnockback']),
  degreesToRadiansFloat: sourcedValue(0.01745329238474369, ['playerMeleeKnockback']),
} as const

export const je26_2CubeAttributeDefinitions = Object.freeze({
  'minecraft:knockback_resistance': {
    defaultValue: je26_2Constants.defaultKnockbackResistance,
    minimum: sourcedValue(-2, ['attributeDefaults']),
    maximum: sourcedValue(1, ['attributeDefaults']),
  },
  'minecraft:explosion_knockback_resistance': {
    defaultValue: je26_2Constants.defaultExplosionKnockbackResistance,
    minimum: sourcedValue(0, ['attributeDefaults']),
    maximum: sourcedValue(1, ['attributeDefaults']),
  },
  'minecraft:bounciness': {
    defaultValue: je26_2Constants.defaultBounciness,
    minimum: sourcedValue(0, ['attributeDefaults']),
    maximum: sourcedValue(1, ['attributeDefaults']),
  },
  'minecraft:friction_modifier': {
    defaultValue: je26_2Constants.defaultFrictionModifier,
    minimum: sourcedValue(0, ['attributeDefaults']),
    maximum: sourcedValue(2048, ['attributeDefaults']),
  },
  'minecraft:air_drag_modifier': {
    defaultValue: je26_2Constants.defaultAirDragModifier,
    minimum: sourcedValue(0, ['attributeDefaults']),
    maximum: sourcedValue(2048, ['attributeDefaults']),
  },
})

export const je26_2KnockbackMechanics = Object.freeze({
  horizontalHitAngleScale: je26_2Constants.horizontalHitAngleScale.value,
  verticalHitAngleScale: je26_2Constants.verticalHitAngleScale.value,
  verticalPositionAngleScale: je26_2Constants.verticalPositionAngleScale.value,
  horizontalResultScale: je26_2Constants.horizontalResultScale.value,
  verticalResultScale: je26_2Constants.verticalResultScale.value,
  resultClampMinimum: je26_2Constants.resultClampMinimum.value,
  resultClampMaximum: je26_2Constants.resultClampMaximum.value,
  vectorNormalizationThreshold: je26_2Constants.vectorNormalizationThreshold.value,
})

export const je26_2PlayerMeleeMechanics = Object.freeze({
  baseDamageScale: je26_2Constants.playerMeleeBaseDamageScale.value,
  strengthDamageScale: je26_2Constants.playerMeleeStrengthDamageScale.value,
  fullStrengthThreshold: je26_2Constants.playerMeleeFullStrengthThreshold.value,
  criticalMultiplier: je26_2Constants.playerMeleeCriticalMultiplier.value,
  knockbackDivisor: je26_2Constants.playerMeleeKnockbackDivisor.value,
  sprintKnockbackBonus: je26_2Constants.playerMeleeSprintKnockbackBonus.value,
  knockbackPerEnchantmentLevel: je26_2Constants.playerMeleeKnockbackPerEnchantmentLevel.value,
  degreesToRadians: je26_2Constants.degreesToRadiansFloat.value,
})
