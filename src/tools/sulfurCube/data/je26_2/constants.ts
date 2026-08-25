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
} as const

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
