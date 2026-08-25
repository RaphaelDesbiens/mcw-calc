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
export const launchVectorDisplayScale = 4
export const aimArrowLength = 3
export const thetaArcRadius = 0.42
export const thetaLabelVerticalOffset = -0.12
export const trajectoryEndExtension = 0.18

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
  readonly horizontalFeetReference: PlanePoint
  readonly thetaArc: readonly PlanePoint[]
  readonly thetaLabelPoint: PlanePoint
  readonly launchEnd: PlanePoint
  readonly trajectory: readonly SceneTrajectoryPoint[]
  readonly trajectoryEndMarker: PlanePoint | null
  readonly renderedTrajectoryTicks: number
  readonly requestedTrajectoryTicks: number
}

function addScaledVector(origin: PlanePoint, vector: PlanePoint, scale: number): PlanePoint {
  return {
    x: origin.x + vector.x * scale,
    y: origin.y + vector.y * scale,
  }
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

function normalizeAngleDifference(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

function createThetaPresentation(
  attackerFeet: PlanePoint,
  cubeFeet: PlanePoint,
  minimumVectorLength: number,
): { readonly arc: readonly PlanePoint[]; readonly label: PlanePoint } {
  const deltaX = cubeFeet.x - attackerFeet.x
  const deltaY = cubeFeet.y - attackerFeet.y
  const length = Math.hypot(deltaX, deltaY)

  if (length < minimumVectorLength) {
    return { arc: [], label: attackerFeet }
  }

  const startAngle = deltaX <= 0 ? Math.PI : 0
  const endAngle = Math.atan2(deltaY, deltaX)
  const angleDifference = normalizeAngleDifference(endAngle - startAngle)
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
      x: attackerFeet.x + labelRadius * Math.cos(labelAngle),
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

function projectCubeCenterPosition(
  feetPosition: DiagnosticEvaluation['trajectory']['initialPosition'],
  projection: RadialProjection,
  cubeHeight: number,
): PlanePoint {
  const projectedFeet = projectPointToRadialPlane(feetPosition, projection)

  return { x: projectedFeet.x, y: projectedFeet.y + cubeHeight / 2 }
}

function createCubeAnchoredBounds(
  cubeFeet: PlanePoint,
  cubeWidth: number,
  cubeHeight: number,
): WorldBounds {
  const halfWidth = cubeWidth / 2

  return {
    minX: cubeFeet.x - Math.max(radialSceneCamera.horizontalBlocksBehindCube, halfWidth + 0.5),
    maxX: cubeFeet.x + Math.max(radialSceneCamera.horizontalBlocksPastAttacker, halfWidth + 0.5),
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
  const launchVector = projectVectorToRadialPlane(callResult.addedVelocity, projection)
  const launchEnd = addScaledVector(cubeCenter, launchVector, launchVectorDisplayScale)
  const trajectoryPoints = [
    {
      tick: 0,
      point: projectCubeCenterPosition(
        trajectory.initialPosition,
        projection,
        context.cube.dimensions.height,
      ),
    },
    ...trajectory.ticks.slice(0, maximumRenderedTrajectoryTicks).map((tick) => ({
      tick: tick.tick,
      point: projectCubeCenterPosition(
        tick.resultingPosition,
        projection,
        context.cube.dimensions.height,
      ),
    })),
  ]
  const horizontalFeetReference = { x: cubeFeet.x, y: attackerFeet.y }
  const thetaPresentation = createThetaPresentation(
    attackerFeet,
    cubeFeet,
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
    horizontalFeetReference,
    thetaArc: thetaPresentation.arc,
    thetaLabelPoint: thetaPresentation.label,
    launchEnd,
    trajectory: trajectoryPoints,
    trajectoryEndMarker: extendTrajectoryEnd(
      trajectoryPoints,
      context.mechanics.vectorNormalizationThreshold,
    ),
    renderedTrajectoryTicks: trajectoryPoints.length - 1,
    requestedTrajectoryTicks: trajectory.ticks.length,
  }
}
