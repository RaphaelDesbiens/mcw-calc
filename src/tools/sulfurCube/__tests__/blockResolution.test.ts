import type { BlockMembershipIndex } from '../resolution'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  je26_2ArchetypeRegistryOrder,
  je26_2Archetypes,
  je26_2ArchetypesById,
  je26_2BlockMembershipEntries,
  je26_2BlockMembershipGroups,
  je26_2BlockMembershipIndex,
  je26_2RecursiveItemTagSources,
  je26_2SwallowableItemIds,
  je26_2SwallowableTagSource,
} from '../data/je26_2'
import {
  matchBlockDefinitions,
  resolveArchetype,
  resolveBlock,
  resolveJe26_2Block,
} from '../resolution'

const expectedGroupCounts = [59, 1, 26, 3, 2, 1, 16, 27, 145, 46, 7, 1]

const representativeBlocks = [
  ['minecraft:oak_planks', 'minecraft:bouncy'],
  ['minecraft:tnt', 'minecraft:explosive'],
  ['minecraft:sponge', 'minecraft:fast_flat'],
  ['minecraft:blue_ice', 'minecraft:fast_sliding'],
  ['minecraft:soul_sand', 'minecraft:high_resistance'],
  ['minecraft:magma_block', 'minecraft:hot'],
  ['minecraft:white_wool', 'minecraft:light'],
  ['minecraft:dirt', 'minecraft:regular'],
  ['minecraft:stone', 'minecraft:slow_bouncy'],
  ['minecraft:iron_block', 'minecraft:slow_flat'],
  ['minecraft:mycelium', 'minecraft:slow_sliding'],
  ['minecraft:honeycomb_block', 'minecraft:sticky'],
] as const

function membershipDigest(): string {
  const serialized = je26_2BlockMembershipEntries
    .map(({ itemId, orderedCandidateIds }) => `${itemId}=${orderedCandidateIds.join(',')}`)
    .sort()
    .join('\n')

  return createHash('sha256').update(serialized).digest('hex')
}

function recursiveSourceDigest(): string {
  const serialized = je26_2RecursiveItemTagSources
    .map(
      ({ tagId, sourcePath, lineStart, lineEnd }) =>
        `${tagId}=${sourcePath}:${lineStart}-${lineEnd}`,
    )
    .sort()
    .join('\n')

  return createHash('sha256').update(serialized).digest('hex')
}

describe('jE 26.2 sulfur cube block membership data', () => {
  it('preserves the audited registry order and per-archetype counts', () => {
    expect(je26_2BlockMembershipGroups.map(({ archetypeId }) => archetypeId)).toEqual(
      je26_2ArchetypeRegistryOrder,
    )
    expect(je26_2BlockMembershipGroups.map(({ itemIds }) => itemIds.length)).toEqual(
      expectedGroupCounts,
    )
    expect(expectedGroupCounts.reduce((sum, count) => sum + count, 0)).toBe(334)
  })

  it('contains the exact audited 334 item-to-candidate expansion', () => {
    expect(je26_2BlockMembershipEntries).toHaveLength(334)
    expect(je26_2SwallowableItemIds).toHaveLength(334)
    expect(new Set(je26_2SwallowableItemIds)).toHaveProperty('size', 334)
    expect(Object.keys(je26_2BlockMembershipIndex)).toHaveLength(334)
    expect(membershipDigest()).toBe(
      '12fd894daa8d2510ddd8c0051085d8961d1ebd725fcff009d93d33047171c11f',
    )
  })

  it('retains one candidate and its root tag for every vanilla member', () => {
    for (const group of je26_2BlockMembershipGroups) {
      for (const itemId of group.itemIds) {
        expect(je26_2BlockMembershipIndex[itemId]).toEqual({
          itemId,
          orderedCandidateIds: [group.archetypeId],
          rootTagIds: [group.rootTag.tagId],
        })
      }
    }
  })

  it.each(representativeBlocks)('maps %s to %s', (itemId, archetypeId) => {
    expect(je26_2BlockMembershipIndex[itemId]?.orderedCandidateIds).toEqual([archetypeId])
  })

  it('records the swallowable source and all 43 recursively visited tags', () => {
    expect(je26_2SwallowableTagSource).toEqual({
      tagId: 'minecraft:sulfur_cube_swallowable',
      sourcePath: 'versions/26.2/extracted/data/minecraft/tags/item/sulfur_cube_swallowable.json',
      lineStart: 1,
      lineEnd: 15,
    })
    expect(je26_2RecursiveItemTagSources).toHaveLength(43)
    expect(new Set(je26_2RecursiveItemTagSources.map(({ tagId }) => tagId))).toHaveProperty(
      'size',
      43,
    )
    expect(recursiveSourceDigest()).toBe(
      'aa2e84941b63bd5d81aaee327d0ff1ac465e1465a54067e27490d03313c988ee',
    )

    for (const group of je26_2BlockMembershipGroups) {
      expect(je26_2RecursiveItemTagSources).toContainEqual(group.rootTag)
    }
    for (const source of je26_2RecursiveItemTagSources) {
      expect(source.sourcePath).toMatch(
        /^versions\/26\.2\/extracted\/data\/minecraft\/tags\/item\//,
      )
      expect(source.lineStart).toBe(1)
      expect(source.lineEnd).toBeGreaterThanOrEqual(source.lineStart)
    }
  })
})

describe('block definition matching and resolution', () => {
  it('resolves all 334 vanilla members to their exact archetype profiles', () => {
    for (const entry of je26_2BlockMembershipEntries) {
      const candidateId = entry.orderedCandidateIds[0]
      const result = resolveJe26_2Block(entry.itemId)

      expect(result).toMatchObject({
        eligibility: 'swallowable',
        outcome: 'resolved',
        supported: true,
        diagnostics: [],
        referencedCandidateIds: [candidateId],
        orderedCandidateIds: [candidateId],
      })
      expect(result.profile).toEqual(resolveArchetype(je26_2ArchetypesById[candidateId]))
    }
  })

  it.each(representativeBlocks)(
    'resolves representative %s block behavior through %s',
    (itemId, archetypeId) => {
      const result = resolveJe26_2Block(itemId)

      expect(result.profile.orderedCandidateIds).toEqual([archetypeId])
      expect(result.profile.knockbackModifiers.horizontalPower.sourceCandidateId).toBe(archetypeId)
    },
  )

  it('folds overlaps in definition registry order rather than membership order', () => {
    const membershipIndex: BlockMembershipIndex = {
      'test:overlap': {
        itemId: 'test:overlap',
        orderedCandidateIds: ['minecraft:regular', 'minecraft:bouncy'],
        rootTagIds: ['test:regular', 'test:bouncy'],
      },
    }

    const match = matchBlockDefinitions('test:overlap', membershipIndex, je26_2Archetypes)
    const result = resolveBlock(
      'test:overlap',
      membershipIndex,
      je26_2Archetypes,
      'known_block_item',
    )

    expect(match.referencedCandidateIds).toEqual(['minecraft:regular', 'minecraft:bouncy'])
    expect(match.orderedCandidateIds).toEqual(['minecraft:bouncy', 'minecraft:regular'])
    expect(result.profile.orderedCandidateIds).toEqual(['minecraft:bouncy', 'minecraft:regular'])
    expect(result.profile.knockbackModifiers.horizontalPower.sourceCandidateId).toBe(
      'minecraft:regular',
    )
  })

  it.each([
    ['minecraft:stone_stairs', 'known_block_item'],
    ['minecraft:stick', 'known_non_block_item'],
    ['minecraft:water', 'block_without_usable_item_stack'],
  ] as const)('reports a faithful forced no-match for %s', (itemId, itemClassification) => {
    const result = resolveJe26_2Block(itemId, itemClassification)

    expect(result).toMatchObject({
      itemClassification,
      eligibility: 'not_swallowable',
      outcome: 'forced_no_match',
      orderedCandidateIds: [],
      supported: true,
    })
    expect(result.diagnostics).toEqual([
      { kind: 'item_not_swallowable', itemId, itemClassification },
    ])
    expect(result.profile.orderedCandidateIds).toEqual([])
  })

  it('does not misreport an unknown identifier as a known no-match', () => {
    const result = resolveJe26_2Block('example:not_in_the_audited_index')

    expect(result).toMatchObject({
      eligibility: 'unknown',
      outcome: 'unknown_item',
      supported: false,
      diagnostics: [
        {
          kind: 'unknown_item_identity',
          itemId: 'example:not_in_the_audited_index',
        },
      ],
    })
  })

  it('diagnoses missing definitions and empty candidate membership', () => {
    const membershipIndex: BlockMembershipIndex = {
      'test:missing': {
        itemId: 'test:missing',
        orderedCandidateIds: ['test:not_loaded'],
        rootTagIds: ['test:root'],
      },
      'test:empty': {
        itemId: 'test:empty',
        orderedCandidateIds: [],
        rootTagIds: ['test:root'],
      },
    }

    expect(
      resolveBlock('test:missing', membershipIndex, je26_2Archetypes, 'known_block_item'),
    ).toMatchObject({
      eligibility: 'swallowable',
      outcome: 'incomplete_membership',
      supported: false,
      diagnostics: [
        {
          kind: 'missing_candidate_definition',
          itemId: 'test:missing',
          candidateId: 'test:not_loaded',
        },
      ],
    })
    expect(
      resolveBlock('test:empty', membershipIndex, je26_2Archetypes, 'known_block_item'),
    ).toMatchObject({
      eligibility: 'swallowable',
      outcome: 'incomplete_membership',
      supported: false,
      diagnostics: [{ kind: 'swallowable_item_without_candidate', itemId: 'test:empty' }],
    })
  })

  it('diagnoses caller knowledge that contradicts audited membership', () => {
    const result = resolveJe26_2Block('minecraft:stone', 'known_non_block_item')

    expect(result).toMatchObject({
      eligibility: 'swallowable',
      outcome: 'incomplete_membership',
      supported: false,
    })
    expect(result.diagnostics).toContainEqual({
      kind: 'classification_conflicts_with_membership',
      itemId: 'minecraft:stone',
      itemClassification: 'known_non_block_item',
    })
  })
})
