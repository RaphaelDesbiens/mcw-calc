import type { Vec2, Vec3 } from '../model/types'
import type { PlanePoint, RadialProjection } from './types'

const defaultHorizontalAxis: Vec2 = { x: 0, y: 1 }

export function createRadialProjection(
  cubeFeetPosition: Vec3,
  attackerFeetPosition: Vec3,
  minimumHorizontalLength = 1e-9,
): RadialProjection {
  const horizontalX = cubeFeetPosition.x - attackerFeetPosition.x
  const horizontalZ = cubeFeetPosition.z - attackerFeetPosition.z
  const horizontalLength = Math.hypot(horizontalX, horizontalZ)
  const horizontalAxis =
    horizontalLength < minimumHorizontalLength
      ? defaultHorizontalAxis
      : { x: horizontalX / horizontalLength, y: horizontalZ / horizontalLength }

  return {
    origin: { ...cubeFeetPosition },
    horizontalAxis,
  }
}

export function projectPointToRadialPlane(point: Vec3, projection: RadialProjection): PlanePoint {
  const deltaX = point.x - projection.origin.x
  const deltaZ = point.z - projection.origin.z

  return {
    x: deltaX * projection.horizontalAxis.x + deltaZ * projection.horizontalAxis.y,
    y: point.y - projection.origin.y,
  }
}

export function projectVectorToRadialPlane(vector: Vec3, projection: RadialProjection): PlanePoint {
  return {
    x: vector.x * projection.horizontalAxis.x + vector.z * projection.horizontalAxis.y,
    y: vector.y,
  }
}

export function radialLateralOffset(point: Vec3, projection: RadialProjection): number {
  const deltaX = point.x - projection.origin.x
  const deltaZ = point.z - projection.origin.z

  return -deltaX * projection.horizontalAxis.y + deltaZ * projection.horizontalAxis.x
}

export function unprojectPointFromRadialPlane(
  point: PlanePoint,
  projection: RadialProjection,
  lateralOffset = 0,
): Vec3 {
  const perpendicularX = -projection.horizontalAxis.y
  const perpendicularZ = projection.horizontalAxis.x

  return {
    x: projection.origin.x + point.x * projection.horizontalAxis.x + lateralOffset * perpendicularX,
    y: projection.origin.y + point.y,
    z: projection.origin.z + point.x * projection.horizontalAxis.y + lateralOffset * perpendicularZ,
  }
}
