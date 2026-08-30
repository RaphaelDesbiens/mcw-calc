import type { NumericBackend } from '../numerics/types'
import type {
  FlatFloorContact,
  FlatFloorTrajectoryAssumptions,
  FlatFloorTrajectoryResult,
  FlatFloorTrajectoryTick,
  TrajectoryAssumptions,
  TrajectoryResult,
  TrajectoryTick,
  Vec3,
} from './types'
import { addVec3 } from './vectors'

function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }
}

function cutMovementComponent(value: number, cutoff: number): number {
  return Math.abs(value) < cutoff ? 0 : value
}

export function computeModifiedFriction(
  friction: number,
  modifier: number,
  numerics: NumericBackend,
): number {
  assertFiniteNumber(friction, 'friction')
  assertFiniteNumber(modifier, 'modifier')

  const sourceFriction = numerics.sourceFloat(friction)
  const sourceModifier = numerics.sourceFloat(modifier)
  const difference = numerics.sourceFloat(1 - sourceFriction)
  const scaledDifference = numerics.sourceFloat(difference * sourceModifier)
  const modified = numerics.sourceFloat(1 - scaledDifference)

  return numerics.sourceFloat(numerics.clamp(modified, 0, 1))
}

export function simulateFreeFlightTrajectory(
  initialPosition: Vec3,
  initialVelocity: Vec3,
  tickCount: number,
  assumptions: TrajectoryAssumptions,
): TrajectoryResult {
  if (!Number.isInteger(tickCount) || tickCount < 0) {
    throw new RangeError('tickCount must be a nonnegative integer')
  }

  for (const [name, value] of Object.entries({
    initialPositionX: initialPosition.x,
    initialPositionY: initialPosition.y,
    initialPositionZ: initialPosition.z,
    initialVelocityX: initialVelocity.x,
    initialVelocityY: initialVelocity.y,
    initialVelocityZ: initialVelocity.z,
    gravity: assumptions.gravity,
    drag: assumptions.drag,
    movementCutoff: assumptions.movementCutoff,
  })) {
    assertFiniteNumber(value, name)
  }

  if (assumptions.movementCutoff < 0) {
    throw new RangeError('movementCutoff must not be negative')
  }

  let position = { ...initialPosition }
  let velocity = { ...initialVelocity }
  const ticks: TrajectoryTick[] = []

  for (let index = 0; index < tickCount; index += 1) {
    const startingPosition = { ...position }
    const startingVelocity = { ...velocity }
    const effectiveVelocity = {
      x: cutMovementComponent(velocity.x, assumptions.movementCutoff),
      y: cutMovementComponent(velocity.y, assumptions.movementCutoff),
      z: cutMovementComponent(velocity.z, assumptions.movementCutoff),
    }
    position = addVec3(position, effectiveVelocity)
    velocity = {
      x: effectiveVelocity.x * assumptions.drag,
      y: (effectiveVelocity.y - assumptions.gravity) * assumptions.drag,
      z: effectiveVelocity.z * assumptions.drag,
    }
    ticks.push({
      tick: index + 1,
      startingPosition,
      startingVelocity,
      effectiveVelocity,
      resultingPosition: { ...position },
      resultingVelocity: { ...velocity },
    })
  }

  return {
    initialPosition: { ...initialPosition },
    initialVelocity: { ...initialVelocity },
    assumptions: { ...assumptions },
    ticks,
    resultingPosition: { ...position },
    resultingVelocity: { ...velocity },
  }
}

function horizontalDistanceBetween(first: Vec3, second: Vec3): number {
  return Math.hypot(second.x - first.x, second.z - first.z)
}

function createImmediateFloorContact(
  initialPosition: Vec3,
  initialVelocity: Vec3,
  assumptions: FlatFloorTrajectoryAssumptions,
): FlatFloorTrajectoryResult {
  const effectiveVelocity = {
    x: cutMovementComponent(initialVelocity.x, assumptions.movementCutoff),
    y: cutMovementComponent(initialVelocity.y, assumptions.movementCutoff),
    z: cutMovementComponent(initialVelocity.z, assumptions.movementCutoff),
  }
  const zeroMovement = { x: 0, y: 0, z: 0 }
  const contact: FlatFloorContact = {
    tick: 0,
    position: { ...initialPosition },
    horizontalDistance: 0,
    maximumFeetY: initialPosition.y,
    effectiveVelocity,
    appliedMovement: zeroMovement,
    verticalMovementFraction: 0,
  }

  return {
    initialPosition: { ...initialPosition },
    initialVelocity: { ...initialVelocity },
    assumptions: { ...assumptions },
    ticks: [],
    resultingPosition: { ...initialPosition },
    resultingVelocity: null,
    contact,
    horizontalDistance: 0,
    maximumFeetY: initialPosition.y,
  }
}

/**
 * Simulates the source-audited first flight arc above an infinite level floor.
 * The first update begins with onGround=true, so its horizontal post-move
 * velocity uses floor friction. The result stops at first return and deliberately
 * omits post-contact rebound.
 */
export function simulateFlatFloorFirstContactTrajectory(
  initialPosition: Vec3,
  initialVelocity: Vec3,
  maximumTickCount: number,
  assumptions: FlatFloorTrajectoryAssumptions,
): FlatFloorTrajectoryResult {
  if (!Number.isInteger(maximumTickCount) || maximumTickCount < 0) {
    throw new RangeError('maximumTickCount must be a nonnegative integer')
  }

  for (const [name, value] of Object.entries({
    initialPositionX: initialPosition.x,
    initialPositionY: initialPosition.y,
    initialPositionZ: initialPosition.z,
    initialVelocityX: initialVelocity.x,
    initialVelocityY: initialVelocity.y,
    initialVelocityZ: initialVelocity.z,
    gravity: assumptions.gravity,
    drag: assumptions.drag,
    movementCutoff: assumptions.movementCutoff,
    floorY: assumptions.floorY,
    floorBlockFriction: assumptions.floorBlockFriction,
    entityFrictionModifier: assumptions.entityFrictionModifier,
    initialGroundHorizontalFactor: assumptions.initialGroundHorizontalFactor,
  })) {
    assertFiniteNumber(value, name)
  }

  if (assumptions.movementCutoff < 0) {
    throw new RangeError('movementCutoff must not be negative')
  }
  if (initialPosition.y !== assumptions.floorY) {
    throw new RangeError('initialPosition.y must equal assumptions.floorY')
  }

  const initialEffectiveY = cutMovementComponent(initialVelocity.y, assumptions.movementCutoff)

  if (initialEffectiveY <= 0) {
    return createImmediateFloorContact(initialPosition, initialVelocity, assumptions)
  }

  let position = { ...initialPosition }
  let velocity = { ...initialVelocity }
  let maximumFeetY = initialPosition.y
  let contact: FlatFloorContact | null = null
  const ticks: FlatFloorTrajectoryTick[] = []

  for (let index = 0; index < maximumTickCount; index += 1) {
    const startingPosition = { ...position }
    const startingVelocity = { ...velocity }
    const effectiveVelocity = {
      x: cutMovementComponent(velocity.x, assumptions.movementCutoff),
      y: cutMovementComponent(velocity.y, assumptions.movementCutoff),
      z: cutMovementComponent(velocity.z, assumptions.movementCutoff),
    }
    const touchesFloor =
      effectiveVelocity.y < 0 && position.y + effectiveVelocity.y <= assumptions.floorY
    const appliedMovement = {
      x: effectiveVelocity.x,
      y: touchesFloor ? assumptions.floorY - position.y : effectiveVelocity.y,
      z: effectiveVelocity.z,
    }
    position = addVec3(position, appliedMovement)
    maximumFeetY = Math.max(maximumFeetY, position.y)

    if (touchesFloor) {
      const horizontalDistance = horizontalDistanceBetween(initialPosition, position)
      const verticalMovementFraction =
        effectiveVelocity.y === 0 ? 0 : appliedMovement.y / effectiveVelocity.y

      contact = {
        tick: index + 1,
        position: { ...position },
        horizontalDistance,
        maximumFeetY,
        effectiveVelocity,
        appliedMovement,
        verticalMovementFraction,
      }
      ticks.push({
        tick: index + 1,
        startingPosition,
        startingVelocity,
        effectiveVelocity,
        appliedMovement,
        resultingPosition: { ...position },
        resultingVelocity: null,
        firstFloorContact: true,
      })
      break
    }

    const horizontalFactor =
      index === 0 ? assumptions.initialGroundHorizontalFactor : assumptions.drag
    velocity = {
      x: effectiveVelocity.x * horizontalFactor,
      y: (effectiveVelocity.y - assumptions.gravity) * assumptions.drag,
      z: effectiveVelocity.z * horizontalFactor,
    }
    ticks.push({
      tick: index + 1,
      startingPosition,
      startingVelocity,
      effectiveVelocity,
      appliedMovement,
      resultingPosition: { ...position },
      resultingVelocity: { ...velocity },
      firstFloorContact: false,
    })
  }

  return {
    initialPosition: { ...initialPosition },
    initialVelocity: { ...initialVelocity },
    assumptions: { ...assumptions },
    ticks,
    resultingPosition: { ...position },
    resultingVelocity: contact === null ? { ...velocity } : null,
    contact,
    horizontalDistance: horizontalDistanceBetween(initialPosition, position),
    maximumFeetY,
  }
}
