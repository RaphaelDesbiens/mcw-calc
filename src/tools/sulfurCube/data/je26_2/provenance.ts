export type ProvenanceSourceKind = 'decompiledBehavior' | 'extractedData'

export interface ProvenanceRecord {
  readonly edition: 'Java Edition'
  readonly version: '26.2'
  readonly sourceKind: ProvenanceSourceKind
  readonly sourcePath: string
  readonly locator: string
  readonly notes?: string
}

export const provenance = {
  sulfurCubeKnockback: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/world/entity/monster/cubemob/SulfurCube.java',
    locator:
      'applyHorizontalHitAngleScale, applyVerticalHitAnglePowerTransfer, applyVerticalPositionAnglePowerRotation, knockback (local lines 770-878)',
  },
  ordinaryKnockbackCall: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/LivingEntity.java',
    locator: 'dealDefaultKnockback (local lines 1290-1305)',
    notes:
      'The absorbed immune-damage path forwards its incoming float damage argument at SulfurCube.hurtServer local lines 243-263. The damage passed to knockback is not defined as health lost.',
  },
  extraKnockbackCall: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/player/Player.java',
    locator: 'causeExtraKnockback (local lines 1121-1157)',
    notes:
      'Future AttackConfiguration work must re-audit the complete caller path; this entry only preserves the separate-call behavior and direction source.',
  },
  bouncyArchetype: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'extractedData',
    sourcePath: 'versions/26.2/extracted/data/minecraft/sulfur_cube_archetype/bouncy.json',
    locator: 'attribute_modifiers, buoyant, items, knockback_modifiers (local lines 2-45)',
  },
  attributeDefaults: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/world/entity/ai/attributes/Attributes.java',
    locator:
      'AIR_DRAG_MODIFIER, BOUNCINESS, EXPLOSION_KNOCKBACK_RESISTANCE, FRICTION_MODIFIER, GRAVITY, KNOCKBACK_RESISTANCE (local lines 10-12, 31, 38-40, 52-63)',
  },
  attributeFolding: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/world/entity/ai/attributes/AttributeInstance.java',
    locator: 'calculateValue (local lines 148-165)',
  },
  sulfurCubeDimensions: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/EntityTypes.java',
    locator: 'EntityTypes.SULFUR_CUBE (local lines 943-946)',
  },
  sulfurCubeRuntimeSize: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/world/entity/monster/cubemob/AbstractCubeMob.java',
    locator: 'getDefaultDimensions (local lines 257-260)',
    notes:
      'SulfurCube.setSpawnSize uses runtime size 2 for adults at SulfurCube.java local lines 668-674. EntityDimensions.scale performs float multiplication at EntityDimensions.java local lines 25-38.',
  },
  standingPlayerEyeHeight: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/Avatar.java',
    locator:
      'DEFAULT_EYE_HEIGHT and STANDING_DIMENSIONS (local lines 16-23); corroborated by EntityTypes.PLAYER (EntityTypes.java local lines 1136-1146)',
  },
  vectorNormalization: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/phys/Vec3.java',
    locator: 'normalize (local lines 83-86)',
  },
  vectorRotation: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/phys/Vec2.java',
    locator: 'rotate (local lines 82-86)',
    notes:
      'Mth.sin/cos use a 65,536-entry float table at Mth.java local lines 35-59; standard mode intentionally defers that quantization.',
  },
  airTravel: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/LivingEntity.java',
    locator:
      'computeModifiedFriction, travelInAir, handleRelativeFrictionAndCalculateMovement, aiStep (local lines 515-517, 2460-2486, 2666-2675, 3050-3073)',
    notes:
      'Absorbed sulfur cubes use omnidirectional air drag through SulfurCube.omnidirectionalAirMover (local lines 426-429).',
  },
} as const satisfies Record<string, ProvenanceRecord>

export type ProvenanceId = keyof typeof provenance

export interface SourcedValue<T> {
  readonly value: T
  readonly provenance: readonly ProvenanceId[]
  readonly derivation?: string
}

export function sourcedValue<T>(
  value: T,
  sourceIds: readonly ProvenanceId[],
  derivation?: string,
): SourcedValue<T> {
  return derivation === undefined
    ? { value, provenance: sourceIds }
    : { value, provenance: sourceIds, derivation }
}
