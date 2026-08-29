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

export interface CubeDerivedGeometry {
  readonly center: Vec3
  readonly top: Vec3
  readonly bottom: Vec3
}

export interface CubeMechanicsProperties {
  readonly horizontalPower: number
  readonly verticalPower: number
  readonly knockbackResistance: number
}

export interface CubeLaunchProperties extends CubeMechanicsProperties {
  readonly airDragModifier: number
}

export interface SulfurCubeMechanicsParameters {
  readonly horizontalHitAngleScale: number
  readonly verticalHitAngleScale: number
  readonly verticalPositionAngleScale: number
  readonly horizontalResultScale: number
  readonly verticalResultScale: number
  readonly resultClampMinimum: number
  readonly resultClampMaximum: number
  readonly vectorNormalizationThreshold: number
}

export type KnockbackCallScaling =
  | { readonly kind: 'ordinaryDamage' }
  | { readonly kind: 'extraKnockbackEffect'; readonly powerArgument: number }

export interface KnockbackCall {
  /** The damage value passed into this particular knockback call. */
  readonly damageArgument: number
  readonly horizontalBaseDirection: Vec2
  readonly scaling: KnockbackCallScaling
}

export interface SulfurCubeKnockbackContext {
  readonly attacker: AttackerGeometry
  readonly cube: CubeGeometry
  readonly properties: CubeMechanicsProperties
  readonly mechanics: SulfurCubeMechanicsParameters
}

export interface KnockbackCallInputSnapshot {
  readonly existingVelocity: Vec3
  readonly call: KnockbackCall
  readonly context: SulfurCubeKnockbackContext
}

export interface KnockbackCallDiagnostics {
  readonly cubeCenter: Vec3
  readonly cubeTop: Vec3
  readonly cubeBottom: Vec3
  readonly normalizedLookDirection: Vec3
  readonly eyeToCenterDirection: Vec3
  readonly eyeToTopDirection: Vec3
  readonly eyeToBottomDirection: Vec3
  readonly horizontalAngleDelta: number
  readonly horizontalRotationAngle: number
  readonly transformedHorizontalDirection: Vec2
  readonly normalizedHorizontalDirection: Vec2
  readonly q: number
  readonly transferredPowerRatio: number
  readonly h0: number
  readonly v0: number
  readonly h1: number
  readonly v1: number
  readonly feetDelta: Vec3
  readonly feetHorizontalDistance: number
  readonly theta: number
  readonly powerRotationAngle: number
  readonly h2: number
  readonly v2: number
  readonly horizontalRatio: number
  readonly verticalRatio: number
  readonly maxRatio: number
  readonly capFactor: number
  readonly h3: number
  readonly v3: number
  readonly effectFactor: number
  readonly damageSquareRoot: number
  readonly damageAndEffectMultiplier: number
  readonly resistanceFactor: number
  readonly m: number
  readonly hM: number
  readonly vM: number
  readonly horizontalBeforeClamp: number
  readonly verticalBeforeClamp: number
  readonly horizontalResult: number
  readonly verticalResult: number
}

export interface KnockbackCallResult {
  readonly input: KnockbackCallInputSnapshot
  readonly diagnostics: KnockbackCallDiagnostics
  readonly addedVelocity: Vec3
  readonly resultingVelocity: Vec3
}

export interface AttackSequenceResult {
  readonly initialVelocity: Vec3
  readonly callResults: readonly KnockbackCallResult[]
  readonly resultingVelocity: Vec3
}

export type SulfurCubeDirectionProviderId =
  | 'nonProjectileSourcePosition'
  | 'callerYaw'
  | 'projectileMotion'
  | 'potionPosition'
  | 'fireworkPosition'

export interface VelocityOperationProvenance {
  readonly sourceFamily: string
  readonly reason: string
  readonly damageSourceType: string | null
}

export interface SulfurCubeKnockbackOperation {
  readonly kind: 'sulfurCubeKnockbackCall'
  readonly providerId: SulfurCubeDirectionProviderId
  readonly call: KnockbackCall
  /** Every call owns its independently sampled mechanics context. */
  readonly context: SulfurCubeKnockbackContext
  readonly provenance: VelocityOperationProvenance
}

export interface DirectPushOperation {
  readonly kind: 'directPush'
  readonly providerId: string
  readonly addedVelocity: Vec3
  readonly provenance: VelocityOperationProvenance
}

export type VelocityOperation = SulfurCubeKnockbackOperation | DirectPushOperation

export interface SulfurCubeKnockbackOperationResult {
  readonly kind: 'sulfurCubeKnockbackCall'
  readonly operation: SulfurCubeKnockbackOperation
  readonly existingVelocity: Vec3
  readonly addedVelocity: Vec3
  readonly resultingVelocity: Vec3
  readonly knockbackResult: KnockbackCallResult
}

export interface DirectPushOperationResult {
  readonly kind: 'directPush'
  readonly operation: DirectPushOperation
  readonly existingVelocity: Vec3
  readonly addedVelocity: Vec3
  readonly resultingVelocity: Vec3
}

export type VelocityOperationResult = SulfurCubeKnockbackOperationResult | DirectPushOperationResult

export interface VelocityOperationSequenceResult {
  readonly initialVelocity: Vec3
  readonly operationResults: readonly VelocityOperationResult[]
  readonly resultingVelocity: Vec3
}

export interface TrajectoryAssumptions {
  readonly gravity: number
  readonly drag: number
  readonly movementCutoff: number
}

export interface TrajectoryTick {
  readonly tick: number
  readonly startingPosition: Vec3
  readonly startingVelocity: Vec3
  readonly effectiveVelocity: Vec3
  readonly resultingPosition: Vec3
  readonly resultingVelocity: Vec3
}

export interface TrajectoryResult {
  readonly initialPosition: Vec3
  readonly initialVelocity: Vec3
  readonly assumptions: TrajectoryAssumptions
  readonly ticks: readonly TrajectoryTick[]
  readonly resultingPosition: Vec3
  readonly resultingVelocity: Vec3
}

export interface LaunchSummary {
  readonly horizontalSpeed: number
  readonly totalSpeed: number
  readonly elevationAngle: number
  readonly horizontalDirection: Vec2
}
