import type { NumericBackend } from '../numerics/types'
import type { Vec2, Vec3 } from './types'

export function addVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z,
  }
}

export function subtractVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z,
  }
}

export function scaleVec3(vector: Vec3, factor: number): Vec3 {
  return {
    x: vector.x * factor,
    y: vector.y * factor,
    z: vector.z * factor,
  }
}

export function lengthVec2(vector: Vec2, numerics: NumericBackend): number {
  return numerics.sqrt(vector.x * vector.x + vector.y * vector.y)
}

export function lengthVec3(vector: Vec3, numerics: NumericBackend): number {
  return numerics.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z)
}

export function rotateVec2(vector: Vec2, angleRadians: number, numerics: NumericBackend): Vec2 {
  const cosine = numerics.cos(angleRadians)
  const sine = numerics.sin(angleRadians)

  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine,
  }
}
