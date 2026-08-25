<script setup lang="ts">
import type { Vec3 } from '../model/types'
import type {
  PlanePoint,
  RadialProjection,
  WorldBounds,
  WorldToSvgTransform,
} from '../presentation/types'
import type { DiagnosticEvaluation } from '../presets/diagnostic'
import { CdxButton } from '@wikimedia/codex'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { unprojectPointFromRadialPlane } from '../presentation/radialPlane'
import { createRadialScenePresentation } from '../presentation/scene'
import {
  clampPointToBoundsFromOrigin,
  createViewportWorldBounds,
  createWorldToSvgTransform,
  scaleWorldBoundsAroundPoint,
  translateWorldBounds,
} from '../presentation/worldToSvg'

type ObjectDragKind = 'aim' | 'attacker' | 'cube'
type DragKind = ObjectDragKind | 'camera'
type SceneSize = 'regular' | 'compact'

interface DragState {
  readonly kind: DragKind
  readonly pointerId: number
  readonly startPointer: { readonly x: number; readonly y: number }
  readonly startTarget: { readonly x: number; readonly y: number }
  readonly startBounds: WorldBounds
  readonly aimLateralOffset: number
  readonly projection: RadialProjection
  readonly transform: WorldToSvgTransform
}

const props = defineProps<{
  evaluation: DiagnosticEvaluation
  sceneSize: SceneSize
}>()

const emit = defineEmits<{
  translateAttacker: [delta: Vec3]
  translateCube: [delta: Vec3]
  'update:sceneSize': [size: SceneSize]
  updateAimPoint: [point: Vec3]
}>()

const { t } = useI18n()
const svgElement = ref<SVGSVGElement | null>(null)
const dragState = ref<DragState | null>(null)
const viewport = {
  width: 960,
  height: 480,
  padding: { top: 36, right: 44, bottom: 46, left: 48 },
} as const
const initialScene = createRadialScenePresentation(props.evaluation)
const sceneProjection = initialScene.projection
const cameraBounds = shallowRef<WorldBounds>(initialScene.bounds)
const initialTransformScale = createWorldToSvgTransform(initialScene.bounds, viewport).scale
const initialCameraWidth = initialScene.bounds.maxX - initialScene.bounds.minX
const minimumCameraWidth = initialCameraWidth / 4
const maximumCameraWidth = initialCameraWidth * 8
const nextSceneSize = computed(() => (props.sceneSize === 'regular' ? 'compact' : 'regular'))
const sceneSizeButtonLabel = computed(() =>
  props.sceneSize === 'regular'
    ? t('sulfurCube.scene.switchToCompact')
    : t('sulfurCube.scene.switchToRegular'),
)

const view = computed(() => {
  const scene = createRadialScenePresentation(props.evaluation, sceneProjection)
  const transform = createWorldToSvgTransform(cameraBounds.value, viewport)
  const toSvg = transform.toSvg
  const halfCubeWidth = scene.cube.width / 2
  const cubeTopLeft = toSvg({ x: scene.cube.feet.x - halfCubeWidth, y: scene.cube.top.y })
  const attackerHitboxTopLeft = toSvg({
    x: scene.attackerHitbox.bottomLeft.x,
    y: scene.attackerHitbox.topRight.y,
  })
  const launchStart = toSvg(scene.cube.feet)
  const launchEnd = toSvg(scene.launchEnd)
  const attackerFeet = toSvg(scene.attackerFeet)
  const attackerEyes = toSvg(scene.attackerEyes)
  const unclampedAimPoint = toSvg(scene.aimPoint)
  const aimArrowEnd = toSvg(scene.aimArrowEnd)
  const cubeFeet = toSvg(scene.cube.feet)
  const cubeCenter = toSvg(scene.cube.center)
  const cubeTop = toSvg(scene.cube.top)
  const cubeBottom = toSvg(scene.cube.bottom)
  const horizontalFeetReference = toSvg(scene.horizontalFeetReference)
  const trajectory = scene.trajectory.map((sample) => ({
    tick: sample.tick,
    point: toSvg(sample.point),
  }))
  const finalTrajectoryTick = trajectory.length === 0 ? 0 : trajectory[trajectory.length - 1]!.tick
  const trajectoryTicks = trajectory.filter(
    (sample) => sample.tick > 0 && sample.tick !== finalTrajectoryTick,
  )
  const thetaLabel = toSvg(scene.thetaLabelPoint)
  const thetaArcPoints = scene.thetaArc.map((point) => toSvg(point))
  const aimQAnchor = toSvg({
    x: (scene.attackerEyes.x + scene.aimArrowEnd.x) / 2,
    y: (scene.attackerEyes.y + scene.aimArrowEnd.y) / 2,
  })
  const trajectoryEndMarker =
    scene.trajectoryEndMarker === null ? null : toSvg(scene.trajectoryEndMarker)
  const zoomFactor = transform.scale / initialTransformScale
  const visual = {
    handleRadius: 3 * zoomFactor,
    aimPointRadius: 3 * zoomFactor,
    cubeCornerRadius: 0,
    cubeCenterRadius: 3 * zoomFactor,
    cubeEndpointRadius: 1.6 * zoomFactor,
    eyePointRadius: 2.5 * zoomFactor,
    feetPointRadius: 3 * zoomFactor,
    hitAreaRadius: Math.max(18, 18 * zoomFactor),
    labelOffset: 10 * zoomFactor,
    aimLabelOffsetX: 10 * zoomFactor,
    aimLabelOffsetY: 12 * zoomFactor,
    eyesLabelOffset: 11 * zoomFactor,
    feetLabelOffset: 18 * zoomFactor,
    launchLabelOffset: 18 * zoomFactor,
    trajectoryPointRadius: 2.25 * zoomFactor,
    trajectoryEndArm: 5 * zoomFactor,
    thetaSquareSize: 10 * zoomFactor,
  }
  const aimPoint = clampPointToBoundsFromOrigin(attackerEyes, unclampedAimPoint, {
    minX: visual.aimPointRadius,
    maxX: viewport.width - visual.aimPointRadius,
    minY: visual.aimPointRadius,
    maxY: viewport.height - visual.aimPointRadius,
  })
  const aimAngle = Math.atan2(aimArrowEnd.y - attackerEyes.y, aimArrowEnd.x - attackerEyes.x)
  const qLabelAngle = Math.abs(aimAngle) > Math.PI / 2 ? aimAngle + Math.PI : aimAngle
  const qLabelOffset = 12 * zoomFactor
  const aimQLabel = {
    x: aimQAnchor.x + Math.sin(aimAngle) * qLabelOffset,
    y: aimQAnchor.y - Math.cos(aimAngle) * qLabelOffset,
    rotation: (qLabelAngle * 180) / Math.PI,
  }
  const launchLabel = {
    x: launchEnd.x + (launchEnd.x >= launchStart.x ? 18 : -18) * zoomFactor,
    y: launchEnd.y - visual.launchLabelOffset,
  }
  const thetaSquareHorizontalSign = Math.sign(attackerFeet.x - horizontalFeetReference.x) || -1
  const thetaSquareVerticalSign = Math.sign(cubeFeet.y - horizontalFeetReference.y) || -1
  const thetaSquareCorner = {
    x: horizontalFeetReference.x + thetaSquareHorizontalSign * visual.thetaSquareSize,
    y: horizontalFeetReference.y,
  }
  const thetaSquarePath = `M ${thetaSquareCorner.x} ${thetaSquareCorner.y} V ${
    horizontalFeetReference.y + thetaSquareVerticalSign * visual.thetaSquareSize
  } H ${horizontalFeetReference.x}`
  const visualStyle = {
    '--scene-font-size': `${14 * zoomFactor}px`,
    '--scene-mobile-font-size': `${16 * zoomFactor}px`,
    '--scene-minor-font-size': `${12 * zoomFactor}px`,
    '--scene-small-label-font-size': `${10 * zoomFactor}px`,
    '--scene-stroke-thinnest': `${1.25 * zoomFactor}px`,
    '--scene-stroke-thin': `${1.5 * zoomFactor}px`,
    '--scene-stroke-regular': `${2 * zoomFactor}px`,
    '--scene-stroke-medium': `${3 * zoomFactor}px`,
    '--scene-stroke-bold': `${4 * zoomFactor}px`,
    '--scene-dash-theta': `${6 * zoomFactor}px ${5 * zoomFactor}px`,
    '--scene-dash-aim': `${5 * zoomFactor}px ${5 * zoomFactor}px`,
    '--scene-dash-trajectory': `${7 * zoomFactor}px ${5 * zoomFactor}px`,
  }

  return {
    scene,
    transform,
    cubeRect: {
      x: cubeTopLeft.x,
      y: cubeTopLeft.y,
      width: scene.cube.width * transform.scale,
      height: scene.cube.height * transform.scale,
    },
    attackerRect: {
      x: attackerHitboxTopLeft.x,
      y: attackerHitboxTopLeft.y,
      width: scene.attackerHitbox.width * transform.scale,
      height: scene.attackerHitbox.height * transform.scale,
    },
    cubeFeet,
    cubeCenter,
    cubeTop,
    cubeBottom,
    attackerFeet,
    attackerEyes,
    aimPoint,
    aimArrowEnd,
    aimQLabel,
    horizontalFeetReference,
    launchStart,
    launchEnd,
    launchLabel,
    thetaLabel,
    thetaSquarePath,
    thetaArcPoints: thetaArcPoints.map((point) => `${point.x},${point.y}`).join(' '),
    groundStart: toSvg(scene.cubeFeetLineStart),
    groundEnd: toSvg(scene.cubeFeetLineEnd),
    trajectory,
    trajectoryTicks,
    trajectoryEndMarker,
    trajectoryPoints: trajectory.map((sample) => `${sample.point.x},${sample.point.y}`).join(' '),
    visual,
    visualStyle,
    zoomFactor,
  }
})

function pointerToSvg(event: MouseEvent): { x: number; y: number } | null {
  const element = svgElement.value

  if (element === null) {
    return null
  }

  const rectangle = element.getBoundingClientRect()

  if (rectangle.width === 0 || rectangle.height === 0) {
    return null
  }

  return {
    x: ((event.clientX - rectangle.left) / rectangle.width) * viewport.width,
    y: ((event.clientY - rectangle.top) / rectangle.height) * viewport.height,
  }
}

function zoomAtSvgPoint(anchorSvg: PlanePoint, requestedFactor: number): void {
  const currentView = view.value
  const currentWidth = cameraBounds.value.maxX - cameraBounds.value.minX
  const targetWidth = Math.min(
    maximumCameraWidth,
    Math.max(minimumCameraWidth, currentWidth * requestedFactor),
  )
  const factor = targetWidth / currentWidth

  cameraBounds.value = scaleWorldBoundsAroundPoint(
    cameraBounds.value,
    currentView.transform.toWorld(anchorSvg),
    factor,
  )
}

function zoomCamera(requestedFactor: number): void {
  zoomAtSvgPoint({ x: viewport.width / 2, y: viewport.height / 2 }, requestedFactor)
}

function zoomWithWheel(event: WheelEvent): void {
  const pointer = pointerToSvg(event)

  if (pointer === null) {
    return
  }

  const deltaUnit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : viewport.height
  const deltaPixels =
    event.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? event.deltaY : event.deltaY * deltaUnit
  const exponent = Math.min(0.35, Math.max(-0.35, deltaPixels * 0.0012))

  zoomAtSvgPoint(pointer, Math.exp(exponent))
}

function startDrag(kind: DragKind, event: PointerEvent): void {
  event.preventDefault()
  event.stopPropagation()

  if (event.button !== 0) {
    return
  }

  const pointer = pointerToSvg(event)

  if (pointer === null) {
    return
  }

  const currentView = view.value
  const pointerWorld = currentView.transform.toWorld(pointer)
  let target: PlanePoint

  switch (kind) {
    case 'aim':
      target = currentView.transform.toWorld(currentView.aimPoint)
      break
    case 'attacker':
      target = currentView.scene.attackerFeet
      break
    case 'cube':
      target = currentView.scene.cube.center
      break
    case 'camera':
      target = pointerWorld
      break
  }

  const targetElement = event.currentTarget as SVGGraphicsElement

  if (kind !== 'camera') {
    targetElement.focus()
  }

  targetElement.setPointerCapture(event.pointerId)
  dragState.value = {
    kind,
    pointerId: event.pointerId,
    startPointer: pointerWorld,
    startTarget: target,
    startBounds: cameraBounds.value,
    aimLateralOffset: currentView.scene.aimLateralOffset,
    projection: currentView.scene.projection,
    transform: currentView.transform,
  }
}

function continueDrag(event: PointerEvent): void {
  const drag = dragState.value

  if (drag === null || drag.pointerId !== event.pointerId) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  const pointer = pointerToSvg(event)

  if (pointer === null) {
    return
  }

  const pointerWorld = drag.transform.toWorld(pointer)
  const deltaX = pointerWorld.x - drag.startPointer.x
  const deltaY = pointerWorld.y - drag.startPointer.y

  switch (drag.kind) {
    case 'aim':
      emit(
        'updateAimPoint',
        unprojectPointFromRadialPlane(
          clampPointToBoundsFromOrigin(
            view.value.scene.attackerEyes,
            { x: drag.startTarget.x + deltaX, y: drag.startTarget.y + deltaY },
            createViewportWorldBounds(drag.transform, view.value.visual.aimPointRadius),
          ),
          drag.projection,
          drag.aimLateralOffset,
        ),
      )
      break
    case 'attacker':
    case 'cube': {
      const delta = {
        x: drag.projection.horizontalAxis.x * deltaX,
        y: deltaY,
        z: drag.projection.horizontalAxis.y * deltaX,
      }

      if (drag.kind === 'attacker') {
        emit('translateAttacker', delta)
      } else {
        emit('translateCube', delta)
      }
      dragState.value = { ...drag, startPointer: pointerWorld }
      break
    }
    case 'camera':
      cameraBounds.value = translateWorldBounds(drag.startBounds, {
        x: -deltaX,
        y: -deltaY,
      })
      break
  }
}

function endDrag(event: PointerEvent): void {
  const drag = dragState.value

  if (drag?.pointerId === event.pointerId) {
    event.preventDefault()
    event.stopPropagation()
  }

  if (drag?.pointerId === event.pointerId) {
    dragState.value = null
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', clearHandleFocus)
})

function clearHandleFocus(event: PointerEvent): void {
  const target = event.target

  if (target instanceof Element && target.closest('.interactive-handle') !== null) {
    return
  }

  const activeElement = document.activeElement

  if (
    activeElement instanceof SVGElement &&
    activeElement.classList.contains('interactive-handle')
  ) {
    activeElement.blur()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', clearHandleFocus)
})

function keyboardDelta(event: KeyboardEvent): { x: number; y: number } | null {
  const step = event.shiftKey ? 0.05 : 0.25

  switch (event.key) {
    case 'ArrowLeft':
      return { x: -step, y: 0 }
    case 'ArrowRight':
      return { x: step, y: 0 }
    case 'ArrowUp':
      return { x: 0, y: step }
    case 'ArrowDown':
      return { x: 0, y: -step }
    default:
      return null
  }
}

function moveHandle(kind: ObjectDragKind, event: KeyboardEvent): void {
  const delta = keyboardDelta(event)

  if (delta === null) {
    return
  }

  const scene = view.value.scene

  if (kind === 'aim') {
    const visibleAimPoint = view.value.transform.toWorld(view.value.aimPoint)
    const target = clampPointToBoundsFromOrigin(
      scene.attackerEyes,
      { x: visibleAimPoint.x + delta.x, y: visibleAimPoint.y + delta.y },
      createViewportWorldBounds(view.value.transform, view.value.visual.aimPointRadius),
    )

    emit(
      'updateAimPoint',
      unprojectPointFromRadialPlane(target, scene.projection, scene.aimLateralOffset),
    )
  } else {
    const translation = {
      x: scene.projection.horizontalAxis.x * delta.x,
      y: delta.y,
      z: scene.projection.horizontalAxis.y * delta.x,
    }

    if (kind === 'attacker') {
      emit('translateAttacker', translation)
    } else {
      emit('translateCube', translation)
    }
  }

  event.preventDefault()
}

function formatCoordinate(value: number): string {
  return value.toFixed(2)
}
</script>

<template>
  <figure
    class="scene-figure"
    :class="`scene-figure--${sceneSize}`"
    aria-labelledby="sulfur-cube-scene-heading"
  >
    <div class="scene-frame">
      <div class="scene-frame__overlay scene-frame__overlay--left">
        <h3 id="sulfur-cube-scene-heading">{{ t('sulfurCube.scene.radialView') }}</h3>
      </div>
      <div class="scene-frame__overlay scene-frame__overlay--right">
        <CdxButton
          size="small"
          weight="quiet"
          :aria-label="sceneSizeButtonLabel"
          :title="sceneSizeButtonLabel"
          @click="emit('update:sceneSize', nextSceneSize)"
        >
          {{ sceneSizeButtonLabel }}
        </CdxButton>
        <CdxButton
          size="small"
          weight="quiet"
          :aria-label="t('sulfurCube.scene.zoomOut')"
          :title="t('sulfurCube.scene.zoomOut')"
          @click="zoomCamera(1.35)"
        >
          −
        </CdxButton>
        <CdxButton
          size="small"
          weight="quiet"
          :aria-label="t('sulfurCube.scene.zoomIn')"
          :title="t('sulfurCube.scene.zoomIn')"
          @click="zoomCamera(0.74)"
        >
          +
        </CdxButton>
      </div>
      <svg
        ref="svgElement"
        class="scene-svg"
        :class="{
          'scene-svg--panning': dragState?.kind === 'camera',
          'scene-svg--dragging-object': dragState !== null && dragState.kind !== 'camera',
        }"
        :style="view.visualStyle"
        :viewBox="`0 0 ${viewport.width} ${viewport.height}`"
        role="group"
        aria-labelledby="sulfur-cube-scene-svg-title"
        aria-describedby="sulfur-cube-scene-svg-description"
        @pointermove="continueDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
        @pointerleave="endDrag"
        @wheel.prevent="zoomWithWheel"
        @dragstart.prevent
      >
        <title id="sulfur-cube-scene-svg-title">{{ t('sulfurCube.scene.svgTitle') }}</title>
        <desc id="sulfur-cube-scene-svg-description">
          {{ t('sulfurCube.scene.svgDescription') }}
        </desc>

        <defs>
          <marker
            id="sulfur-cube-look-arrow"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path class="look-arrow" d="M 0 0 L 8 3 L 0 6 L 1.6 3 z" />
          </marker>
          <marker
            id="sulfur-cube-launch-arrow"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path class="launch-arrow" d="M 0 0 L 8 3 L 0 6 L 1.6 3 z" />
          </marker>
        </defs>

        <rect
          class="scene-background"
          width="100%"
          height="100%"
          rx="8"
          @pointerdown="startDrag('camera', $event)"
        />

        <g class="reference-geometry">
          <line
            class="ground-line"
            :x1="view.groundStart.x"
            :y1="view.groundStart.y"
            :x2="view.groundEnd.x"
            :y2="view.groundEnd.y"
          />
        </g>

        <circle
          v-for="sample in view.trajectoryTicks"
          :key="sample.tick"
          class="trajectory-tick"
          :cx="sample.point.x"
          :cy="sample.point.y"
          :r="view.visual.trajectoryPointRadius"
        />
        <path
          v-if="view.trajectoryEndMarker"
          class="trajectory-end-marker"
          :d="`M ${view.trajectoryEndMarker.x - view.visual.trajectoryEndArm} ${view.trajectoryEndMarker.y - view.visual.trajectoryEndArm} L ${view.trajectoryEndMarker.x + view.visual.trajectoryEndArm} ${view.trajectoryEndMarker.y + view.visual.trajectoryEndArm} M ${view.trajectoryEndMarker.x - view.visual.trajectoryEndArm} ${view.trajectoryEndMarker.y + view.visual.trajectoryEndArm} L ${view.trajectoryEndMarker.x + view.visual.trajectoryEndArm} ${view.trajectoryEndMarker.y - view.visual.trajectoryEndArm}`"
        />

        <g class="theta-geometry">
          <line
            :x1="view.attackerFeet.x"
            :y1="view.attackerFeet.y"
            :x2="view.horizontalFeetReference.x"
            :y2="view.horizontalFeetReference.y"
          />
          <line
            :x1="view.attackerFeet.x"
            :y1="view.attackerFeet.y"
            :x2="view.cubeFeet.x"
            :y2="view.cubeFeet.y"
          />
          <line
            :x1="view.horizontalFeetReference.x"
            :y1="view.horizontalFeetReference.y"
            :x2="view.cubeFeet.x"
            :y2="view.cubeFeet.y"
          />
          <path class="theta-square" :d="view.thetaSquarePath" />
          <polyline v-if="view.thetaArcPoints" class="theta-arc" :points="view.thetaArcPoints" />
          <text :x="view.thetaLabel.x" :y="view.thetaLabel.y">θ</text>
        </g>

        <g class="aim-limits">
          <line
            :x1="view.attackerEyes.x"
            :y1="view.attackerEyes.y"
            :x2="view.cubeTop.x"
            :y2="view.cubeTop.y"
          />
          <line
            :x1="view.attackerEyes.x"
            :y1="view.attackerEyes.y"
            :x2="view.cubeBottom.x"
            :y2="view.cubeBottom.y"
          />
        </g>

        <line
          class="look-line"
          :x1="view.attackerEyes.x"
          :y1="view.attackerEyes.y"
          :x2="view.aimArrowEnd.x"
          :y2="view.aimArrowEnd.y"
          marker-end="url(#sulfur-cube-look-arrow)"
        />
        <text
          class="aim-q-label"
          :x="view.aimQLabel.x"
          :y="view.aimQLabel.y"
          text-anchor="middle"
          :transform="`rotate(${view.aimQLabel.rotation} ${view.aimQLabel.x} ${view.aimQLabel.y})`"
        >
          q={{ evaluation.callResult.diagnostics.q.toFixed(2) }}
        </text>

        <g class="cube-shape">
          <rect
            :x="view.cubeRect.x"
            :y="view.cubeRect.y"
            :width="view.cubeRect.width"
            :height="view.cubeRect.height"
            :rx="view.visual.cubeCornerRadius"
          />
          <circle :cx="view.cubeTop.x" :cy="view.cubeTop.y" :r="view.visual.cubeEndpointRadius" />
          <circle
            :cx="view.cubeBottom.x"
            :cy="view.cubeBottom.y"
            :r="view.visual.cubeEndpointRadius"
          />
        </g>

        <g class="attacker-shape">
          <rect
            :x="view.attackerRect.x"
            :y="view.attackerRect.y"
            :width="view.attackerRect.width"
            :height="view.attackerRect.height"
          />
          <circle
            class="eye-dot"
            :cx="view.attackerEyes.x"
            :cy="view.attackerEyes.y"
            :r="view.visual.eyePointRadius"
          />
          <text
            class="eyes-label"
            :x="view.attackerEyes.x"
            :y="view.attackerEyes.y + view.visual.eyesLabelOffset"
            text-anchor="middle"
          >
            {{ t('sulfurCube.scene.eyes') }}
          </text>
          <text
            class="feet-label"
            :x="view.attackerFeet.x"
            :y="view.attackerFeet.y + view.visual.feetLabelOffset"
            text-anchor="middle"
          >
            {{ t('sulfurCube.scene.feet') }}
          </text>
        </g>

        <line
          class="launch-vector"
          :x1="view.launchStart.x"
          :y1="view.launchStart.y"
          :x2="view.launchEnd.x"
          :y2="view.launchEnd.y"
          marker-end="url(#sulfur-cube-launch-arrow)"
        />
        <text
          class="launch-label"
          :x="view.launchLabel.x"
          :y="view.launchLabel.y"
          text-anchor="middle"
        >
          {{ t('sulfurCube.scene.launchVector') }}
        </text>

        <g
          class="interactive-handle cube-handle"
          tabindex="0"
          role="button"
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
          :aria-label="t('sulfurCube.scene.cubeHandleAria')"
          @pointerdown="startDrag('cube', $event)"
          @keydown="moveHandle('cube', $event)"
        >
          <circle
            class="handle-hit-area"
            :cx="view.cubeCenter.x"
            :cy="view.cubeCenter.y"
            :r="view.visual.hitAreaRadius"
          />
          <circle
            class="handle-marker"
            :cx="view.cubeCenter.x"
            :cy="view.cubeCenter.y"
            :r="view.visual.cubeCenterRadius"
          />
        </g>

        <g
          class="interactive-handle aim-handle"
          tabindex="0"
          role="button"
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
          :aria-label="
            t('sulfurCube.scene.aimHandleAria', {
              x: formatCoordinate(evaluation.inputs.aimPoint.x),
              y: formatCoordinate(evaluation.inputs.aimPoint.y),
              z: formatCoordinate(evaluation.inputs.aimPoint.z),
            })
          "
          @pointerdown="startDrag('aim', $event)"
          @keydown="moveHandle('aim', $event)"
        >
          <circle
            class="handle-hit-area"
            :cx="view.aimPoint.x"
            :cy="view.aimPoint.y"
            :r="view.visual.hitAreaRadius"
          />
          <circle
            class="handle-marker"
            :cx="view.aimPoint.x"
            :cy="view.aimPoint.y"
            :r="view.visual.aimPointRadius"
          />
          <text
            :x="view.aimPoint.x"
            :y="view.aimPoint.y - view.visual.aimLabelOffsetY"
            text-anchor="middle"
          >
            {{ t('sulfurCube.scene.aim') }}
          </text>
        </g>

        <g
          class="interactive-handle attacker-handle"
          tabindex="0"
          role="button"
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
          :aria-label="t('sulfurCube.scene.attackerHandleAria')"
          @pointerdown="startDrag('attacker', $event)"
          @keydown="moveHandle('attacker', $event)"
        >
          <circle
            class="handle-hit-area"
            :cx="view.attackerFeet.x"
            :cy="view.attackerFeet.y"
            :r="view.visual.hitAreaRadius"
          />
          <circle
            class="handle-marker"
            :cx="view.attackerFeet.x"
            :cy="view.attackerFeet.y"
            :r="view.visual.feetPointRadius"
          />
        </g>
      </svg>
    </div>

    <div class="scene-legend" aria-hidden="true">
      <span>
        <i class="legend-swatch legend-swatch--cube" />
        <span>{{ t('sulfurCube.scene.legendSulfurCube') }}</span>
      </span>
      <span>
        <i class="legend-swatch legend-swatch--aim" />
        <span>{{ t('sulfurCube.scene.aim') }}</span>
      </span>
      <span>
        <i class="legend-swatch legend-swatch--theta" />
        <span>{{ t('sulfurCube.scene.legendTheta') }}</span>
      </span>
      <span>
        <i class="legend-swatch legend-swatch--launch" />
        <span>{{ t('sulfurCube.scene.launchLegend') }}</span>
      </span>
      <span>
        <i class="legend-swatch legend-swatch--player" />
        <span>{{ t('sulfurCube.scene.legendPlayer') }}</span>
      </span>
    </div>

    <figcaption>
      <p>{{ t('sulfurCube.scene.interactionHelp') }}</p>
      <p>{{ t('sulfurCube.scene.projectionHelp') }}</p>
      <p v-if="view.scene.requestedTrajectoryTicks > view.scene.renderedTrajectoryTicks">
        {{
          t('sulfurCube.scene.trajectoryTruncated', {
            shown: view.scene.renderedTrajectoryTicks,
            requested: view.scene.requestedTrajectoryTicks,
          })
        }}
      </p>
    </figcaption>
  </figure>
</template>

<style scoped>
.scene-figure {
  --scene-ink: var(--color-base, #202122);
  --scene-muted: var(--color-subtle, #54595d);
  --scene-border: var(--border-color-subtle, #c8ccd1);
  --scene-background: color-mix(
    in srgb,
    var(--color-base, #202122) 7%,
    var(--background-color-base, #fff)
  );
  --scene-cube: #f2a900;
  --scene-cube-dark: #202122;
  --scene-attacker: var(--color-base, #202122);
  --scene-aim: #00a3d7;
  --scene-aim-dark: #007aa3;
  --scene-aim-label: #202122;
  --scene-limit: #8bd5ea;
  --scene-theta: #d33682;
  --scene-theta-muted: color-mix(in srgb, var(--scene-theta) 45%, transparent);
  --scene-launch: #00a000;
  --scene-trajectory: #00a000;
  --scene-move-cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23202122' stroke-width='1.5' stroke-linejoin='round' d='M12 1l3 3h-2v6h6V8l3 3-3 3v-2h-6v6h2l-3 3-3-3h2v-6H5v2l-3-3 3-3v2h6V4H9z'/%3E%3C/svg%3E")
    12 12;
  margin: 0;
}

.scene-frame__overlay h3,
figcaption p {
  margin: 0;
}

figcaption {
  color: var(--scene-muted);
}

.scene-frame__overlay {
  position: absolute;
  z-index: 1;
  top: 0.25rem;
  display: flex;
  align-items: center;
  padding: 0.2rem;
  border: 1px solid color-mix(in srgb, var(--scene-border) 65%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--background-color-base, #fff) 88%, transparent);
  box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
}

.scene-frame__overlay--left {
  left: 0.25rem;
}

.scene-frame__overlay--right {
  right: 0.25rem;
}

.scene-frame__overlay h3 {
  flex: none;
  color: var(--scene-muted);
  font-size: 0.875rem;
  font-weight: 700;
}

.scene-frame__overlay :deep(.cdx-button) {
  min-width: 1.75rem;
  padding: 0 0.35rem;
  font-size: 0.875rem;
}

.scene-frame__overlay--right :deep(.cdx-button:not(:first-child)) {
  border-left-color: color-mix(in srgb, var(--scene-border) 70%, transparent);
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.scene-frame__overlay--right :deep(.cdx-button:not(:last-child)) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.scene-frame {
  position: relative;
  width: calc(100% - 4cm);
  margin-inline: auto;
  overflow: hidden;
  border: 1px solid var(--scene-border);
  border-radius: 4px;
  background: var(--scene-background);
}

.scene-figure--compact .scene-frame,
.scene-figure--compact .scene-legend,
.scene-figure--compact figcaption {
  width: 100%;
}

.scene-svg {
  display: block;
  width: 100%;
  height: auto;
  color: var(--scene-ink);
  font-family: sans-serif;
  font-size: var(--scene-font-size);
  cursor:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23202122' stroke-width='1.8' stroke-linejoin='round' d='M8.5 11V5.5a1.5 1.5 0 0 1 3 0V10 4.5a1.5 1.5 0 0 1 3 0V10 6a1.5 1.5 0 0 1 3 0v5-2a1.5 1.5 0 0 1 3 0v4.5c0 4-2.5 7-6.5 7h-1c-2.6 0-4.2-1.3-5.5-3.4L4.7 13a1.55 1.55 0 0 1 2.5-1.8z'/%3E%3C/svg%3E")
      8 7,
    grab;
  touch-action: none;
  user-select: none;
}

.scene-background {
  fill: var(--scene-background);
  cursor: inherit;
  touch-action: none;
}

.scene-svg--panning,
.scene-svg--panning * {
  cursor:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23202122' stroke-width='1.8' stroke-linejoin='round' d='M7.5 10.5V7a1.5 1.5 0 0 1 3 0V9 5.5a1.5 1.5 0 0 1 3 0V9 6.5a1.5 1.5 0 0 1 3 0V10 8a1.5 1.5 0 0 1 3 0v5c0 4.2-2.6 7-6.5 7h-1c-2.4 0-4.3-1.4-5.4-3.4l-2-3.4a1.5 1.5 0 0 1 2.5-1.7z'/%3E%3C/svg%3E")
      8 7,
    grabbing !important;
}

.scene-svg--dragging-object,
.scene-svg--dragging-object * {
  cursor: var(--scene-move-cursor), move !important;
}

.reference-geometry,
.trajectory-line,
.trajectory-tick,
.trajectory-end-marker,
.theta-geometry,
.aim-limits,
.look-line,
.aim-q-label,
.cube-shape,
.attacker-shape,
.launch-vector,
.launch-label {
  pointer-events: none;
}

.reference-geometry line {
  stroke: var(--scene-border);
  stroke-width: var(--scene-stroke-thin);
}

.reference-geometry .ground-line {
  stroke: var(--scene-muted);
  stroke-width: var(--scene-stroke-regular);
}

.theta-geometry line {
  fill: none;
  stroke: var(--scene-theta-muted);
  stroke-dasharray: var(--scene-dash-theta);
  stroke-width: var(--scene-stroke-thinnest);
}

.theta-geometry .theta-arc {
  fill: none;
  stroke: var(--scene-theta);
  stroke-dasharray: none;
  stroke-width: var(--scene-stroke-regular);
}

.theta-geometry .theta-square {
  fill: none;
  stroke: var(--scene-theta);
  stroke-dasharray: none;
  stroke-width: var(--scene-stroke-thinnest);
}

.theta-geometry text {
  fill: var(--scene-theta);
  font-weight: 700;
}

.aim-limits line {
  stroke: var(--scene-limit);
  stroke-dasharray: var(--scene-dash-aim);
  stroke-width: var(--scene-stroke-thin);
}

.look-line {
  stroke: var(--scene-aim);
  stroke-width: var(--scene-stroke-regular);
}

.look-arrow {
  fill: var(--scene-aim);
}

.aim-q-label {
  fill: var(--scene-aim-dark);
  font-size: var(--scene-minor-font-size);
  font-weight: 700;
  pointer-events: none;
}

.cube-shape rect {
  fill: color-mix(in srgb, var(--scene-cube) 72%, transparent);
  stroke: var(--scene-cube-dark);
  stroke-width: var(--scene-stroke-thinnest);
}

.cube-shape circle {
  fill: #202122;
}

.cube-shape text {
  fill: var(--scene-cube-dark);
  font-weight: 700;
}

.attacker-shape rect {
  fill: color-mix(in srgb, var(--scene-attacker) 9%, transparent);
  stroke: var(--scene-attacker);
  stroke-width: var(--scene-stroke-regular);
}

.attacker-shape circle {
  fill: var(--scene-attacker);
  stroke: none;
}

.attacker-shape text {
  fill: var(--scene-attacker);
  font-weight: 700;
}

.attacker-shape .eyes-label,
.attacker-shape .feet-label {
  font-size: var(--scene-small-label-font-size);
}

.launch-vector {
  stroke: var(--scene-launch);
  stroke-linecap: round;
  stroke-width: var(--scene-stroke-bold);
}

.launch-arrow {
  fill: var(--scene-launch);
}

.launch-label {
  fill: var(--scene-launch);
  font-weight: 700;
}

.trajectory-tick {
  fill: var(--scene-trajectory);
  stroke: none;
  opacity: 0.62;
}

.trajectory-end-marker {
  fill: none;
  stroke: var(--scene-trajectory);
  stroke-linecap: round;
  stroke-width: var(--scene-stroke-regular);
  opacity: 0.75;
}

.minor-label {
  fill: var(--scene-muted);
  font-size: var(--scene-minor-font-size);
}

.interactive-handle {
  outline: none;
  cursor: var(--scene-move-cursor), move;
  touch-action: none;
}

.interactive-handle:focus .handle-marker {
  fill: var(--background-color-error, #d33);
}

.handle-hit-area {
  fill: transparent;
  stroke: transparent;
}

.handle-marker {
  fill: var(--background-color-base, #fff);
  stroke-width: var(--scene-stroke-regular);
}

.aim-handle .handle-marker {
  stroke: var(--scene-aim);
}

.aim-handle text {
  fill: var(--scene-aim-dark);
  font-weight: 700;
  pointer-events: none;
}

.attacker-handle .handle-marker {
  stroke: var(--scene-attacker);
}

.cube-handle .handle-marker {
  stroke: var(--scene-cube-dark);
}

.scene-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  width: calc(100% - 4cm);
  margin-top: 0.5rem;
  margin-inline: auto;
  color: var(--scene-muted);
  font-size: 0.875em;
}

.scene-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

:global(.dark) .scene-figure {
  --scene-cube: #ffd84d;
  --scene-cube-dark: #000;
  --scene-attacker: var(--color-base, #eaecf0);
  --scene-aim: #62d6ff;
  --scene-aim-dark: #9be6ff;
  --scene-aim-label: var(--color-base, #eaecf0);
  --scene-limit: #398aa3;
  --scene-theta: #ff6bb3;
  --scene-theta-muted: color-mix(in srgb, var(--scene-theta) 45%, transparent);
  --scene-launch: #33d13f;
  --scene-trajectory: #33d13f;
}

.legend-swatch {
  display: inline-block;
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 50%;
  background: currentcolor;
}

.legend-swatch--cube {
  color: var(--scene-cube);
}

.legend-swatch--aim {
  color: var(--scene-aim);
}

.legend-swatch--theta {
  color: var(--scene-theta);
}

.legend-swatch--launch {
  color: var(--scene-launch);
}

.legend-swatch--player {
  color: var(--scene-attacker);
}

figcaption {
  display: grid;
  gap: 0.25rem;
  width: calc(100% - 4cm);
  margin-top: 0.5rem;
  margin-inline: auto;
  font-size: 0.875em;
}

@media (max-width: 32rem) {
  .scene-svg {
    font-size: var(--scene-mobile-font-size);
  }

  .minor-label {
    display: none;
  }

  .scene-frame,
  .scene-legend,
  figcaption,
  .scene-figure--compact .scene-frame {
    width: 92%;
    width: min(92%, calc(150svh - 7.5rem));
  }

  .scene-frame__overlay {
    max-width: calc(100% - 1rem);
  }

  .scene-frame__overlay--left {
    right: 0.5rem;
  }

  .scene-frame__overlay--right {
    top: auto;
    bottom: 0.5rem;
  }
}
</style>
