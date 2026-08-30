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
      'The absorbed immune-damage path forwards its incoming float damage argument at SulfurCube.hurtServer local lines 243-263. The sulfurCubeBlockImmunity tag includes player_attack. The damage passed to knockback is not defined as health lost.',
  },
  extraKnockbackCall: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/player/Player.java',
    locator: 'causeExtraKnockback (local lines 1121-1157)',
    notes:
      'The complete primary-player-melee caller path is recorded by playerMeleeDamage and playerMeleeKnockback; this entry preserves the separate-call behavior and direction source.',
  },
  playerMeleeDamage: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/player/Player.java',
    locator:
      'attack and getAttackStrengthScale (local lines 951-1005, 1032-1049, 1207-1209, 1816-1827)',
    notes:
      'Defines Float32 attack-strength damage scaling, critical eligibility and multiplier, item/enchantment damage ordering, and the total damageArgument passed to target knockback.',
  },
  playerMeleeKnockback: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/player/Player.java',
    locator: 'attack and causeExtraKnockback (local lines 962-989 and 1121-1149)',
    notes:
      'LivingEntity.getKnockback folds effective ATTACK_KNOCKBACK and enchantments before dividing by two at LivingEntity.java local lines 1540-1544. An eligible sprint contributes 0.5F to the one combined extra-call K.',
  },
  playerMeleeWeaponPresets: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/item/Items.java',
    locator:
      'iron sword registration (local line 1015); Player base ATTACK_DAMAGE registration is in Player.java local lines 206-208 and sword damage folding is defined by ToolMaterial.java local lines 26 and 97-103',
    notes:
      'The reader presets expose already-folded effective attributes: bare hand has effective ATTACK_DAMAGE 1, while an iron sword adds 5 for an effective value of 6. Neither preset adds base ATTACK_KNOCKBACK.',
  },
  playerMeleeWeaponAvailability: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'extractedData',
    sourcePath: 'versions/26.2/extracted/data/minecraft/enchantment/knockback.json',
    locator:
      'supported_items, slots, and max_level; supported tag minecraft:enchantable/melee_weapon contains #minecraft:swords and #minecraft:spears',
    notes:
      'Knockback is an active main-hand item enchantment with maximum level 2. An empty hand is not an item in either supported tag, so bare-hand Knockback is unavailable in unmodified vanilla Survival.',
  },
  bouncyArchetype: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'extractedData',
    sourcePath: 'versions/26.2/extracted/data/minecraft/sulfur_cube_archetype/bouncy.json',
    locator: 'attribute_modifiers, buoyant, items, knockback_modifiers (local lines 2-45)',
  },
  sulfurCubeArchetypeCodec: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/SulfurCubeArchetype.java',
    locator:
      'DIRECT_CODEC and nested AttributeEntry, ContactDamage, ExplosionData, KnockbackModifiers, and SoundSettings codecs (local lines 23-126)',
    notes:
      'Defines required fields, optional defaults, Java numeric codec boundaries, and decoded runtime field types.',
  },
  sulfurCubeArchetypeRegistryOrder: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/resources/ResourceManagerRegistryLoadTask.java',
    locator: 'load, identifier sort before registry registration (local lines 40-67)',
    notes:
      'MappedRegistry.register appends holders to byId and registry iteration follows byId in MappedRegistry.java local lines 88-120 and 202-204.',
  },
  sulfurCubeArchetypeApplication: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/world/entity/monster/cubemob/SulfurCube.java',
    locator:
      'matchingArchetypes and collectEquipmentChanges reset/application fold (local lines 274-282 and 366-419)',
    notes:
      'Establishes ordered candidate matching, default special state, OR/append/overwrite behavior, and ignored unavailable attributes.',
  },
  sulfurCubeBlockImmunity: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'extractedData',
    sourcePath:
      'versions/26.2/extracted/data/minecraft/tags/damage_type/sulfur_cube_with_block_immune_to.json',
    locator: 'values, including minecraft:player_attack (local lines 2-26)',
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
  attributeSanitization: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/world/entity/ai/attributes/RangedAttribute.java',
    locator: 'sanitizeValue (local lines 34-37)',
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
