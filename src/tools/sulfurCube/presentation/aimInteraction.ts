import type { Vec3 } from '../model/types'
import type { PlanePoint, RadialProjection } from './types'
import { aimArrowLength } from './scene'

function endpointFromDirection(eyePosition: Vec3, direction: Vec3): Vec3 {
  return {
    x: eyePosition.x + direction.x * aimArrowLength,
    y: eyePosition.y + direction.y * aimArrowLength,
    z: eyePosition.z + direction.z * aimArrowLength,
  }
}

/** Rotate aim in the radial plane while preserving its perpendicular component. */
export function rotateAimInRadialProjection(
  eyePosition: Vec3,
  normalizedLookDirection: Vec3,
  projection: RadialProjection,
  targetInPlane: PlanePoint,
  minimumLength = 1e-9,
): Vec3 {
  const eyeInPlane = {
    x:
      (eyePosition.x - projection.origin.x) * projection.horizontalAxis.x +
      (eyePosition.z - projection.origin.z) * projection.horizontalAxis.y,
    y: eyePosition.y - projection.origin.y,
  }
  const pointerDirection = {
    x: targetInPlane.x - eyeInPlane.x,
    y: targetInPlane.y - eyeInPlane.y,
  }
  const pointerLength = Math.hypot(pointerDirection.x, pointerDirection.y)

  if (pointerLength < minimumLength) {
    return endpointFromDirection(eyePosition, normalizedLookDirection)
  }

  const radialComponent =
    normalizedLookDirection.x * projection.horizontalAxis.x +
    normalizedLookDirection.z * projection.horizontalAxis.y
  const radialProjectionLength = Math.hypot(radialComponent, normalizedLookDirection.y)
  const lateralComponent =
    -normalizedLookDirection.x * projection.horizontalAxis.y +
    normalizedLookDirection.z * projection.horizontalAxis.x
  const nextRadial = (pointerDirection.x / pointerLength) * radialProjectionLength
  const nextVertical = (pointerDirection.y / pointerLength) * radialProjectionLength
  const perpendicularX = -projection.horizontalAxis.y
  const perpendicularZ = projection.horizontalAxis.x

  return endpointFromDirection(eyePosition, {
    x: nextRadial * projection.horizontalAxis.x + lateralComponent * perpendicularX,
    y: nextVertical,
    z: nextRadial * projection.horizontalAxis.y + lateralComponent * perpendicularZ,
  })
}

/** Rotate aim in the X/Z plane while preserving its vertical component. */
export function rotateAimInTopDownProjection(
  eyePosition: Vec3,
  normalizedLookDirection: Vec3,
  targetInPlane: PlanePoint,
  minimumLength = 1e-9,
): Vec3 {
  const pointerDirection = {
    x: targetInPlane.x - eyePosition.x,
    y: targetInPlane.y - eyePosition.z,
  }
  const pointerLength = Math.hypot(pointerDirection.x, pointerDirection.y)

  if (pointerLength < minimumLength) {
    return endpointFromDirection(eyePosition, normalizedLookDirection)
  }

  const horizontalLength = Math.hypot(normalizedLookDirection.x, normalizedLookDirection.z)

  return endpointFromDirection(eyePosition, {
    x: (pointerDirection.x / pointerLength) * horizontalLength,
    y: normalizedLookDirection.y,
    z: (pointerDirection.y / pointerLength) * horizontalLength,
  })
}
