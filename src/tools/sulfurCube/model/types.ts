export interface Vec2 {
  readonly x: number
  readonly y: number
}

export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

export interface EntityDimensions {
  readonly width: number
  readonly height: number
}

export interface AttackerGeometry {
  readonly feetPosition: Vec3
  readonly eyePosition: Vec3
  readonly lookDirection: Vec3
}

export interface CubeGeometry {
  readonly feetPosition: Vec3
  readonly dimensions: EntityDimensions
}
