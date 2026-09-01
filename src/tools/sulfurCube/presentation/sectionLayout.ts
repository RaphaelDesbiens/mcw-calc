export const sulfurCubeSectionIds = [
  'scene',
  'topDown',
  'power',
  'controls',
  'readout',
  'trace',
  'details',
] as const

export type SulfurCubeSectionId = (typeof sulfurCubeSectionIds)[number]
export type SulfurCubeSceneSize = 'regular' | 'compact'
export type SulfurCubeSectionWidth = 'half' | 'full'
export type SulfurCubeSectionDropPosition = 'before' | 'after'

export interface SulfurCubeSectionLayouts {
  readonly regular: readonly SulfurCubeSectionId[]
  readonly compact: readonly SulfurCubeSectionId[]
}

export const defaultSulfurCubeSectionLayouts: SulfurCubeSectionLayouts = {
  regular: ['scene', 'topDown', 'power', 'controls', 'readout', 'trace', 'details'],
  compact: ['power', 'scene', 'topDown', 'readout', 'controls', 'trace', 'details'],
}

const fullWidthSections = new Set<SulfurCubeSectionId>(['trace', 'details'])

export function sulfurCubeSectionWidth(
  sectionId: SulfurCubeSectionId,
  sceneSize: SulfurCubeSceneSize,
): SulfurCubeSectionWidth {
  if (fullWidthSections.has(sectionId)) {
    return 'full'
  }

  if (sectionId === 'scene') {
    return sceneSize === 'regular' ? 'full' : 'half'
  }

  if (sectionId === 'controls') {
    return sceneSize === 'compact' ? 'full' : 'half'
  }

  return 'half'
}

function normalizeSectionOrder(
  candidate: unknown,
  fallback: readonly SulfurCubeSectionId[],
): SulfurCubeSectionId[] {
  if (!Array.isArray(candidate)) {
    return [...fallback]
  }

  const knownIds = new Set<SulfurCubeSectionId>(sulfurCubeSectionIds)
  const uniqueIds = new Set<SulfurCubeSectionId>()

  for (const value of candidate) {
    if (typeof value === 'string' && knownIds.has(value as SulfurCubeSectionId)) {
      uniqueIds.add(value as SulfurCubeSectionId)
    }
  }

  for (const sectionId of fallback) {
    uniqueIds.add(sectionId)
  }

  return [...uniqueIds]
}

export function normalizeSulfurCubeSectionLayouts(candidate: unknown): SulfurCubeSectionLayouts {
  if (candidate === null || typeof candidate !== 'object') {
    return {
      regular: [...defaultSulfurCubeSectionLayouts.regular],
      compact: [...defaultSulfurCubeSectionLayouts.compact],
    }
  }

  const record = candidate as Record<string, unknown>

  return {
    regular: normalizeSectionOrder(record.regular, defaultSulfurCubeSectionLayouts.regular),
    compact: normalizeSectionOrder(record.compact, defaultSulfurCubeSectionLayouts.compact),
  }
}

export function moveSulfurCubeSection(
  order: readonly SulfurCubeSectionId[],
  sourceId: SulfurCubeSectionId,
  targetId: SulfurCubeSectionId,
  position: SulfurCubeSectionDropPosition,
): SulfurCubeSectionId[] {
  if (sourceId === targetId || !order.includes(sourceId) || !order.includes(targetId)) {
    return [...order]
  }

  const withoutSource = order.filter((sectionId) => sectionId !== sourceId)
  const targetIndex = withoutSource.indexOf(targetId)
  const insertionIndex = targetIndex + (position === 'after' ? 1 : 0)

  withoutSource.splice(insertionIndex, 0, sourceId)
  return withoutSource
}
