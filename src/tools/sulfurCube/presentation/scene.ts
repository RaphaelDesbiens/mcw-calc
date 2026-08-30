import type { ClearRayEntityReachResult } from '../model/reach'
import type { DiagnosticEvaluation } from '../presets/diagnostic'
import type { PlanePoint, RadialProjection, WorldBounds } from './types'
import { je26_2Constants } from '../data/je26_2'
import {
  createRadialProjection,
  projectPointToRadialPlane,
  projectVectorToRadialPlane,
  radialLateralOffset,
} from './radialPlane'

export const maximumRenderedTrajectoryTicks = 200
export const launchVectorMaximumDisplayLength = 8
export const launchVectorRootSpeedScale = 2.4
export const aimArrowLength = 3
export const thetaArcRadius = 0.78
export const thetaLabelHorizontalOffset = -0.08
export const thetaLabelVerticalOffset = -0.02
export const trajectoryEndExtension = 0.18
export const cubeFeetLineHalfLength = 3

export const radialSceneCamera = {
  horizontalBlocksBehindCube: 3.25,
  horizontalBlocksPastAttacker: 4.25,
  verticalBlocksBelowCubeFeet: 2.6,
  verticalBlocksAboveCubeFeet: 4.75,
} as const

export interface SceneTrajectoryPoint {
  readonly tick: number
  readonly point: PlanePoint
}

export interface RadialScenePresentation {
  readonly projection: RadialProjection
  readonly bounds: WorldBounds
  readonly cube: {
    readonly feet: PlanePoint
    readonly center: PlanePoint
    readonly top: PlanePoint
    readonly bottom: PlanePoint
    readonly width: number
    readonly height: number
  }
  readonly attackerFeet: PlanePoint
  readonly attackerEyes: PlanePoint
  readonly attackerHitbox: {
    readonly bottomLeft: PlanePoint
    readonly topRight: PlanePoint
    readonly width: number
    readonly height: number
  }
  readonly aimPoint: PlanePoint
  readonly aimArrowEnd: PlanePoint
  readonly aimLateralOffset: number
  readonly reach: ClearRayEntityReachResult
  readonly horizontalFeetReference: PlanePoint
  readonly thetaArc: readonly PlanePoint[]
  readonly thetaLabelPoint: PlanePoint
  readonly cubeFeetLineStart: PlanePoint
  readonly cubeFeetLineEnd: PlanePoint
  readonly launchEnd: PlanePoint
  readonly launchDisplayLength: number
  readonly trajectory: readonly SceneTrajectoryPoint[]
  readonly trajectoryEndMarker: PlanePoint | null
  readonly maximumHeight: {
    readonly heightAboveFloor: number
    readonly point: PlanePoint
  } | null
  readonly renderedTrajectoryTicks: number
  readonly requestedTrajectoryTicks: number
}

function addScaledVector(origin: PlanePoint, vector: PlanePoint, scale: number): PlanePoint {
  return {
    x: origin.x + vector.x * scale,
    y: origin.y + vector.y * scale,
  }
}

/**
 * Presentation-only scaling for the scene velocity arrow. It expands low speeds
 * while remaining monotonically increasing and asymptotically bounded at the maximum
 * display length. Mechanics values and trajectory calculations never use it.
 */
export function launchVectorDisplayLength(speed: number): number {
  if (!Number.isFinite(speed) || speed < 0) {
    throw new RangeError('Velocity display speed must be a finite nonnegative number')
  }

  return (
    -launchVectorMaximumDisplayLength * Math.expm1(-Math.sqrt(speed) / launchVectorRootSpeedScale)
  )
}

function setPlaneVectorLength(
  origin: PlanePoint,
  vector: PlanePoint,
  length: number,
  minimumVectorLength: number,
): PlanePoint {
  const vectorLength = Math.hypot(vector.x, vector.y)

  if (vectorLength < minimumVectorLength) {
    return origin
  }

  return addScaledVector(origin, vector, length / vectorLength)
}

function createThetaPresentation(
  attackerFeet: PlanePoint,
  cubeFeet: PlanePoint,
  theta: number,
  minimumVectorLength: number,
): { readonly arc: readonly PlanePoint[]; readonly label: PlanePoint } {
  const deltaX = cubeFeet.x - attackerFeet.x
  const deltaY = cubeFeet.y - attackerFeet.y
  const length = Math.hypot(deltaX, deltaY)

  if (length < minimumVectorLength) {
    return { arc: [], label: attackerFeet }
  }

  const startAngle = deltaX <= 0 ? Math.PI : 0
  const angleDifference = (deltaX <= 0 ? 1 : -1) * theta
  const sampleCount = 16
  const arc = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const angle = startAngle + (angleDifference * index) / sampleCount

    return {
      x: attackerFeet.x + thetaArcRadius * Math.cos(angle),
      y: attackerFeet.y + thetaArcRadius * Math.sin(angle),
    }
  })
  const labelAngle = startAngle + angleDifference / 2
  const labelRadius = thetaArcRadius + 0.16

  return {
    arc,
    label: {
      x: attackerFeet.x + labelRadius * Math.cos(labelAngle) + thetaLabelHorizontalOffset,
      y: attackerFeet.y + labelRadius * Math.sin(labelAngle) + thetaLabelVerticalOffset,
    },
  }
}

function extendTrajectoryEnd(
  points: readonly SceneTrajectoryPoint[],
  minimumVectorLength: number,
): PlanePoint | null {
  if (points.length < 2) {
    return null
  }

  const previous = points[points.length - 2].point
  const last = points[points.length - 1].point
  const deltaX = last.x - previous.x
  const deltaY = last.y - previous.y
  const length = Math.hypot(deltaX, deltaY)

  if (length < minimumVectorLength) {
    return last
  }

  return {
    x: last.x + (trajectoryEndExtension * deltaX) / length,
    y: last.y + (trajectoryEndExtension * deltaY) / length,
  }
}

function createCubeAnchoredBounds(
  cubeFeet: PlanePoint,
  cubeWidth: number,
  cubeHeight: number,
): WorldBounds {
  const halfWidth = cubeWidth / 2

  return {
    minX: cubeFeet.x - Math.max(radialSceneCamera.horizontalBlocksPastAttacker, halfWidth + 0.5),
    maxX: cubeFeet.x + Math.max(radialSceneCamera.horizontalBlocksBehindCube, halfWidth + 0.5),
    minY: cubeFeet.y - radialSceneCamera.verticalBlocksBelowCubeFeet,
    maxY: cubeFeet.y + Math.max(radialSceneCamera.verticalBlocksAboveCubeFeet, cubeHeight + 0.5),
  }
}

export function createRadialScenePresentation(
  evaluation: DiagnosticEvaluation,
  projectionOverride?: RadialProjection,
): RadialScenePresentation {
  const { callResult, inputs, trajectory } = evaluation
  const { context } = callResult.input
  const projection =
    projectionOverride ??
    createRadialProjection(
      context.cube.feetPosition,
      context.attacker.feetPosition,
      context.mechanics.vectorNormalizationThreshold,
    )
  const cubeFeet = projectPointToRadialPlane(context.cube.feetPosition, projection)
  const cubeCenter = projectPointToRadialPlane(callResult.diagnostics.cubeCenter, projection)
  const cubeTop = projectPointToRadialPlane(callResult.diagnostics.cubeTop, projection)
  const cubeBottom = projectPointToRadialPlane(callResult.diagnostics.cubeBottom, projection)
  const attackerFeet = projectPointToRadialPlane(context.attacker.feetPosition, projection)
  const attackerEyes = projectPointToRadialPlane(context.attacker.eyePosition, projection)
  const standingPlayerDimensions = je26_2Constants.standingPlayerDimensions.value
  const attackerHitbox = {
    bottomLeft: {
      x: attackerFeet.x - standingPlayerDimensions.width / 2,
      y: attackerFeet.y,
    },
    topRight: {
      x: attackerFeet.x + standingPlayerDimensions.width / 2,
      y: attackerFeet.y + standingPlayerDimensions.height,
    },
    width: standingPlayerDimensions.width,
    height: standingPlayerDimensions.height,
  }
  const aimPoint = projectPointToRadialPlane(inputs.aimPoint, projection)
  const projectedLookDirection = projectVectorToRadialPlane(
    context.attacker.lookDirection,
    projection,
  )
  const aimArrowEnd = setPlaneVectorLength(
    attackerEyes,
    projectedLookDirection,
    aimArrowLength,
    context.mechanics.vectorNormalizationThreshold,
  )
  const launchVector = projectVectorToRadialPlane(evaluation.launchVelocity, projection)
  const launchSpeed = Math.hypot(launchVector.x, launchVector.y)
  const launchDisplayLength = launchVectorDisplayLength(launchSpeed)
  const launchEnd = setPlaneVectorLength(
    cubeFeet,
    launchVector,
    launchDisplayLength,
    context.mechanics.vectorNormalizationThreshold,
  )
  const trajectoryPoints = [
    {
      tick: 0,
      point: projectPointToRadialPlane(trajectory.initialPosition, projection),
    },
    ...trajectory.ticks.slice(0, maximumRenderedTrajectoryTicks).map((tick) => ({
      tick: tick.tick,
      point: projectPointToRadialPlane(tick.resultingPosition, projection),
    })),
  ]
  const maximumHeightTick = trajectory.ticks.reduce<(typeof trajectory.ticks)[number] | null>(
    (highest, tick) =>
      highest === null || tick.resultingPosition.y > highest.resultingPosition.y ? tick : highest,
    null,
  )
  const maximumHeightAboveFloor = trajectory.maximumFeetY - trajectory.initialPosition.y
  const maximumHeight =
    maximumHeightTick === null || maximumHeightAboveFloor < 3
      ? null
      : {
          heightAboveFloor: maximumHeightAboveFloor,
          point: projectPointToRadialPlane(maximumHeightTick.resultingPosition, projection),
        }
  const horizontalFeetReference = { x: cubeFeet.x, y: attackerFeet.y }
  const thetaPresentation = createThetaPresentation(
    attackerFeet,
    cubeFeet,
    callResult.diagnostics.theta,
    context.mechanics.vectorNormalizationThreshold,
  )
  const bounds = createCubeAnchoredBounds(
    cubeFeet,
    context.cube.dimensions.width,
    context.cube.dimensions.height,
  )

  return {
    projection,
    bounds,
    cube: {
      feet: cubeFeet,
      center: cubeCenter,
      top: cubeTop,
      bottom: cubeBottom,
      width: context.cube.dimensions.width,
      height: context.cube.dimensions.height,
    },
    attackerFeet,
    attackerEyes,
    attackerHitbox,
    aimPoint,
    aimArrowEnd,
    aimLateralOffset: radialLateralOffset(inputs.aimPoint, projection),
    reach: evaluation.reach,
    horizontalFeetReference,
    thetaArc: thetaPresentation.arc,
    thetaLabelPoint: thetaPresentation.label,
    cubeFeetLineStart: { x: cubeFeet.x - cubeFeetLineHalfLength, y: cubeFeet.y },
    cubeFeetLineEnd: { x: cubeFeet.x + cubeFeetLineHalfLength, y: cubeFeet.y },
    launchEnd,
    launchDisplayLength,
    trajectory: trajectoryPoints,
    trajectoryEndMarker:
      trajectory.contact !== null && trajectory.contact.tick === trajectory.ticks.length
        ? (trajectoryPoints[trajectoryPoints.length - 1]?.point ?? null)
        : extendTrajectoryEnd(trajectoryPoints, context.mechanics.vectorNormalizationThreshold),
    maximumHeight,
    renderedTrajectoryTicks: trajectoryPoints.length - 1,
    requestedTrajectoryTicks: inputs.trajectoryTicks,
  }
}
