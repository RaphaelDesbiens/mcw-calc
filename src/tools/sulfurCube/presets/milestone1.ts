import type {
  AttackerGeometry,
  CubeGeometry,
  CubeLaunchProperties,
  CubeMechanicsProperties,
  KnockbackCall,
  SulfurCubeKnockbackContext,
  TrajectoryAssumptions,
  Vec2,
  Vec3,
} from '../model/types'
import type { NumericBackend } from '../numerics/types'
import { bouncyArchetype, je26_2Constants, je26_2KnockbackMechanics } from '../data/je26_2'
import { computeModifiedFriction } from '../model/trajectory'
import { standardNumerics } from '../numerics/standard'

export interface Milestone1Scenario {
  readonly initialVelocity: Vec3
  readonly call: KnockbackCall
  readonly context: SulfurCubeKnockbackContext
}

export function createAdultSulfurCubeGeometry(
  feetPosition: Vec3,
  numerics: NumericBackend = standardNumerics,
): CubeGeometry {
  const baseDimensions = je26_2Constants.sulfurCubeBaseDimensions.value
  const runtimeSize = numerics.sourceFloat(je26_2Constants.adultSulfurCubeRuntimeSize.value)

  return {
    feetPosition: { ...feetPosition },
    dimensions: {
      width: numerics.sourceFloat(numerics.sourceFloat(baseDimensions.width) * runtimeSize),
      height: numerics.sourceFloat(numerics.sourceFloat(baseDimensions.height) * runtimeSize),
    },
  }
}

export function createMilestone1Context(
  attacker: AttackerGeometry,
  cubeFeetPosition: Vec3,
  numerics: NumericBackend = standardNumerics,
  properties: CubeMechanicsProperties = createBouncyCubeLaunchProperties(),
): SulfurCubeKnockbackContext {
  return {
    attacker,
    cube: createAdultSulfurCubeGeometry(cubeFeetPosition, numerics),
    properties: { ...properties },
    mechanics: je26_2KnockbackMechanics,
  }
}

export function createMilestone1Scenario(
  attacker: AttackerGeometry,
  cubeFeetPosition: Vec3,
  horizontalBaseDirection: Vec2,
  damageArgument: number,
  numerics: NumericBackend = standardNumerics,
  properties: CubeMechanicsProperties = createBouncyCubeLaunchProperties(),
): Milestone1Scenario {
  return {
    initialVelocity: { x: 0, y: 0, z: 0 },
    call: {
      damageArgument,
      horizontalBaseDirection: { ...horizontalBaseDirection },
      scaling: { kind: 'ordinaryDamage' },
    },
    context: createMilestone1Context(attacker, cubeFeetPosition, numerics, properties),
  }
}

export function createBouncyCubeLaunchProperties(): CubeLaunchProperties {
  return {
    horizontalPower: bouncyArchetype.knockbackModifiers.horizontalPower.value,
    verticalPower: bouncyArchetype.knockbackModifiers.verticalPower.value,
    knockbackResistance: bouncyArchetype.effectiveProperties.knockbackResistance.value,
    airDragModifier: bouncyArchetype.effectiveProperties.airDragModifier.value,
  }
}

export function createTrajectoryAssumptions(
  airDragModifier: number,
  numerics: NumericBackend,
): TrajectoryAssumptions {
  return {
    gravity: je26_2Constants.defaultGravity.value,
    drag: computeModifiedFriction(je26_2Constants.baseAirDrag.value, airDragModifier, numerics),
    movementCutoff: je26_2Constants.movementCutoff.value,
  }
}

export function createBouncyTrajectoryAssumptions(numerics: NumericBackend): TrajectoryAssumptions {
  return createTrajectoryAssumptions(
    bouncyArchetype.effectiveProperties.airDragModifier.value,
    numerics,
  )
}
