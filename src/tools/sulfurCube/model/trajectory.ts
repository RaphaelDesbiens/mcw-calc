import type { NumericBackend } from '../numerics/types'
import type { TrajectoryAssumptions, TrajectoryResult, TrajectoryTick, Vec3 } from './types'
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
