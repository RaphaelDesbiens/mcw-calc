import type { PlanePoint } from './types'

export interface AxisAlignedPlaneRectangle {
  readonly minX: number
  readonly maxX: number
  readonly minY: number
  readonly maxY: number
}

export interface RadialReachDiagnostic {
  readonly reach: number
  readonly assumedHitboxWidth: number
  readonly intersects: boolean
}

function intervalForAxis(
  origin: number,
  delta: number,
  minimum: number,
  maximum: number,
): readonly [number, number] | null {
  if (delta === 0) {
    return origin >= minimum && origin <= maximum ? [0, 1] : null
  }

  const first = (minimum - origin) / delta
  const second = (maximum - origin) / delta

  return [Math.min(first, second), Math.max(first, second)]
}

export function segmentIntersectsAxisAlignedPlaneRectangle(
  start: PlanePoint,
  end: PlanePoint,
  rectangle: AxisAlignedPlaneRectangle,
): boolean {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const xInterval = intervalForAxis(start.x, deltaX, rectangle.minX, rectangle.maxX)
  const yInterval = intervalForAxis(start.y, deltaY, rectangle.minY, rectangle.maxY)

  if (xInterval === null || yInterval === null) {
    return false
  }

  const entry = Math.max(0, xInterval[0], yInterval[0])
  const exit = Math.min(1, xInterval[1], yInterval[1])

  return entry <= exit
}

export function resolveRadialReachDiagnostic(
  eyes: PlanePoint,
  reachEnd: PlanePoint,
  cubeFeet: PlanePoint,
  cubeWidth: number,
  cubeHeight: number,
  reach: number,
): RadialReachDiagnostic {
  const assumedHitboxWidth = Math.hypot(cubeWidth, cubeWidth)
  const halfWidth = assumedHitboxWidth / 2

  return {
    reach,
    assumedHitboxWidth,
    intersects: segmentIntersectsAxisAlignedPlaneRectangle(eyes, reachEnd, {
      minX: cubeFeet.x - halfWidth,
      maxX: cubeFeet.x + halfWidth,
      minY: cubeFeet.y,
      maxY: cubeFeet.y + cubeHeight,
    }),
  }
}
