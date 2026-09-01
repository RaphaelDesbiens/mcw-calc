import { describe, expect, it } from 'vitest'
import {
  defaultSulfurCubeSectionLayouts,
  moveSulfurCubeSection,
  normalizeSulfurCubeSectionLayouts,
  sulfurCubeSectionIds,
  sulfurCubeSectionWidth,
} from '../presentation/sectionLayout'

describe('sulfur cube section layout', () => {
  it('preserves the established larger- and smaller-scene arrangements', () => {
    expect(defaultSulfurCubeSectionLayouts.regular).toEqual([
      'scene',
      'topDown',
      'controls',
      'readout',
      'power',
      'trace',
      'details',
    ])
    expect(defaultSulfurCubeSectionLayouts.compact).toEqual([
      'scene',
      'topDown',
      'controls',
      'readout',
      'power',
      'trace',
      'details',
    ])
  })

  it('assigns only fixed half- and full-width slots', () => {
    expect(sulfurCubeSectionWidth('scene', 'regular')).toBe('full')
    expect(sulfurCubeSectionWidth('scene', 'compact')).toBe('half')
    expect(sulfurCubeSectionWidth('controls', 'regular')).toBe('half')
    expect(sulfurCubeSectionWidth('controls', 'compact')).toBe('half')

    for (const sceneSize of ['regular', 'compact'] as const) {
      expect(sulfurCubeSectionWidth('topDown', sceneSize)).toBe('half')
      expect(sulfurCubeSectionWidth('power', sceneSize)).toBe('half')
      expect(sulfurCubeSectionWidth('readout', sceneSize)).toBe('half')
      expect(sulfurCubeSectionWidth('trace', sceneSize)).toBe('half')
      expect(sulfurCubeSectionWidth('details', sceneSize)).toBe('half')
    }
  })

  it('moves a section before or after another section without changing membership', () => {
    const order = defaultSulfurCubeSectionLayouts.regular

    expect(moveSulfurCubeSection(order, 'power', 'scene', 'before')).toEqual([
      'power',
      'scene',
      'topDown',
      'controls',
      'readout',
      'trace',
      'details',
    ])
    expect(moveSulfurCubeSection(order, 'scene', 'readout', 'after')).toEqual([
      'topDown',
      'controls',
      'readout',
      'scene',
      'power',
      'trace',
      'details',
    ])
    expect(new Set(moveSulfurCubeSection(order, 'scene', 'readout', 'after'))).toEqual(
      new Set(sulfurCubeSectionIds),
    )
  })

  it('repairs stale persisted layouts and appends newly introduced sections', () => {
    expect(
      normalizeSulfurCubeSectionLayouts({
        regular: ['power', 'power', 'removed', 'scene'],
        compact: 'invalid',
      }),
    ).toEqual({
      regular: ['power', 'scene', 'topDown', 'controls', 'readout', 'trace', 'details'],
      compact: [...defaultSulfurCubeSectionLayouts.compact],
    })
  })
})
