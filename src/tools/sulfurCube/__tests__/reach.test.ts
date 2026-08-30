import { describe, expect, it } from 'vitest'
import {
  resolveRadialReachDiagnostic,
  segmentIntersectsAxisAlignedPlaneRectangle,
} from '../presentation/reach'

describe('provisional radial player reach', () => {
  it('detects a segment crossing the assumed cube rectangle', () => {
    expect(
      segmentIntersectsAxisAlignedPlaneRectangle(
        { x: -2, y: 1 },
        { x: 1, y: 1 },
        { minX: -0.7, maxX: 0.7, minY: 0, maxY: 1.96 },
      ),
    ).toBe(true)
  })

  it('rejects aim above or short of the cube', () => {
    const rectangle = { minX: -0.7, maxX: 0.7, minY: 0, maxY: 1.96 }

    expect(
      segmentIntersectsAxisAlignedPlaneRectangle({ x: -2, y: 2.2 }, { x: 1, y: 2.2 }, rectangle),
    ).toBe(false)
    expect(
      segmentIntersectsAxisAlignedPlaneRectangle({ x: -4, y: 1 }, { x: -1, y: 1 }, rectangle),
    ).toBe(false)
  })

  it('uses the adult cube horizontal diagonal as the radial width', () => {
    const result = resolveRadialReachDiagnostic(
      { x: -2.6, y: 0.8 },
      { x: 0.4, y: 0.8 },
      { x: 0, y: 0 },
      0.98,
      0.98,
      3,
    )

    expect(result.assumedHitboxWidth).toBeCloseTo(Math.sqrt(2 * 0.98 ** 2), 12)
    expect(result.intersects).toBe(true)
  })
})
