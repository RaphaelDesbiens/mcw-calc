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
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { unprojectPointFromRadialPlane } from '../presentation/radialPlane'
import { createRadialScenePresentation } from '../presentation/scene'
import {
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
  objectDragActive: [active: boolean]
  translateAttacker: [delta: Vec3]
  translateCube: [delta: Vec3]
  'update:sceneSize': [size: SceneSize]
  updateAimPoint: [point: Vec3]
}>()

const { t } = useI18n()
const svgElement = ref<SVGSVGElement | null>(null)
const dragState = ref<DragState | null>(null)
const viewport = {
  width: 720,
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
  const launchStart = toSvg(scene.cube.center)
  const launchEnd = toSvg(scene.launchEnd)
  const attackerFeet = toSvg(scene.attackerFeet)
  const attackerEyes = toSvg(scene.attackerEyes)
  const aimPoint = toSvg(scene.aimPoint)
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
  const trajectoryTicks = trajectory.filter((sample) => sample.tick > 0)
  const thetaLabel = toSvg(scene.thetaLabelPoint)
  const thetaArcPoints = scene.thetaArc.map((point) => toSvg(point))
  const aimQLabel = toSvg({
    x: (scene.attackerEyes.x + scene.aimArrowEnd.x) / 2,
    y: (scene.attackerEyes.y + scene.aimArrowEnd.y) / 2 + 0.18,
  })
  const trajectoryEndMarker =
    scene.trajectoryEndMarker === null ? null : toSvg(scene.trajectoryEndMarker)
  const zoomFactor = transform.scale / initialTransformScale
  const visual = {
    aimPointRadius: 8 * zoomFactor,
    cubeCornerRadius: 4 * zoomFactor,
    cubeCenterRadius: 8 * zoomFactor,
    cubeEndpointRadius: 3 * zoomFactor,
    eyePointRadius: 7 * zoomFactor,
    feetPointRadius: 7 * zoomFactor,
    hitAreaRadius: Math.max(18, 18 * zoomFactor),
    labelOffset: 10 * zoomFactor,
    aimLabelOffsetX: 10 * zoomFactor,
    aimLabelOffsetY: 16 * zoomFactor,
    eyesLabelOffset: 15 * zoomFactor,
    feetLabelOffset: 24 * zoomFactor,
    launchLabelOffset: 12 * zoomFactor,
    trajectoryPointRadius: 2.25 * zoomFactor,
    trajectoryEndArm: 5 * zoomFactor,
  }
  const visualStyle = {
    '--scene-font-size': `${14 * zoomFactor}px`,
    '--scene-mobile-font-size': `${16 * zoomFactor}px`,
    '--scene-minor-font-size': `${12 * zoomFactor}px`,
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
    thetaLabel,
    thetaArcPoints: thetaArcPoints.map((point) => `${point.x},${point.y}`).join(' '),
    groundStart: toSvg({ x: cameraBounds.value.minX, y: scene.cube.feet.y }),
    groundEnd: toSvg({ x: cameraBounds.value.maxX, y: scene.cube.feet.y }),
    verticalAxisStart: toSvg({ x: scene.cube.feet.x, y: cameraBounds.value.minY }),
    verticalAxisEnd: toSvg({ x: scene.cube.feet.x, y: cameraBounds.value.maxY }),
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
  const exponent = Math.min(0.35, Math.max(-0.35, deltaPixels * 0.0015))

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
      target = currentView.scene.aimPoint
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

  if (kind !== 'camera') {
    emit('objectDragActive', true)
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
          { x: drag.startTarget.x + deltaX, y: drag.startTarget.y + deltaY },
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

    if (drag.kind !== 'camera') {
      emit('objectDragActive', false)
    }
  }
}

onBeforeUnmount(() => {
  if (dragState.value !== null && dragState.value.kind !== 'camera') {
    emit('objectDragActive', false)
  }
})

function keyboardDelta(event: KeyboardEvent): { x: number; y: number } | null {
  const step = event.shiftKey ? 0.25 : 0.05

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
    emit(
      'updateAimPoint',
      unprojectPointFromRadialPlane(
        { x: scene.aimPoint.x + delta.x, y: scene.aimPoint.y + delta.y },
        scene.projection,
        scene.aimLateralOffset,
      ),
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
        <CdxButton
          size="small"
          weight="quiet"
          :aria-label="sceneSizeButtonLabel"
          :title="sceneSizeButtonLabel"
          @click="emit('update:sceneSize', nextSceneSize)"
        >
          {{ sceneSizeButtonLabel }}
        </CdxButton>
      </div>
      <div class="scene-frame__overlay scene-frame__overlay--right">
        <CdxButton
          size="small"
          weight="quiet"
          :aria-label="t('sulfurCube.scene.zoomOut')"
          :title="t('sulfurCube.scene.zoomOut')"
          @click="zoomCamera(1.25)"
        >
          −
        </CdxButton>
        <CdxButton
          size="small"
          weight="quiet"
          :aria-label="t('sulfurCube.scene.zoomIn')"
          :title="t('sulfurCube.scene.zoomIn')"
          @click="zoomCamera(0.8)"
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
            :x1="view.verticalAxisStart.x"
            :y1="view.verticalAxisStart.y"
            :x2="view.verticalAxisEnd.x"
            :y2="view.verticalAxisEnd.y"
          />
          <line
            class="ground-line"
            :x1="view.groundStart.x"
            :y1="view.groundStart.y"
            :x2="view.groundEnd.x"
            :y2="view.groundEnd.y"
          />
        </g>

        <polyline
          v-if="view.trajectory.length > 1"
          class="trajectory-line"
          :points="view.trajectoryPoints"
        />
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
        <text class="aim-q-label" :x="view.aimQLabel.x" :y="view.aimQLabel.y" text-anchor="middle">
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
          <text
            :x="view.cubeCenter.x"
            :y="view.cubeRect.y - view.visual.labelOffset"
            text-anchor="middle"
          >
            {{ t('sulfurCube.scene.cube') }}
          </text>
        </g>

        <g class="attacker-shape">
          <rect
            :x="view.attackerRect.x"
            :y="view.attackerRect.y"
            :width="view.attackerRect.width"
            :height="view.attackerRect.height"
          />
          <circle
            :cx="view.attackerEyes.x"
            :cy="view.attackerEyes.y"
            :r="view.visual.eyePointRadius"
          />
          <text
            :x="view.attackerEyes.x"
            :y="view.attackerEyes.y - view.visual.eyesLabelOffset"
            text-anchor="middle"
          >
            {{ t('sulfurCube.scene.eyes') }}
          </text>
          <text
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
          :x="view.launchEnd.x"
          :y="view.launchEnd.y - view.visual.launchLabelOffset"
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
          <path
            :d="`M ${view.aimPoint.x} ${view.aimPoint.y - view.visual.aimPointRadius} L ${view.aimPoint.x + view.visual.aimPointRadius} ${view.aimPoint.y} L ${view.aimPoint.x} ${view.aimPoint.y + view.visual.aimPointRadius} L ${view.aimPoint.x - view.visual.aimPointRadius} ${view.aimPoint.y} z`"
          />
          <text
            :x="view.aimPoint.x + view.visual.aimLabelOffsetX"
            :y="view.aimPoint.y + view.visual.aimLabelOffsetY"
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
            :cx="view.attackerFeet.x"
            :cy="view.attackerFeet.y"
            :r="view.visual.feetPointRadius"
          />
        </g>
      </svg>
    </div>

    <div class="scene-legend" aria-hidden="true">
      <span>
        <i class="legend-swatch legend-swatch--aim" />
        <span>{{ t('sulfurCube.scene.aim') }}</span>
      </span>
      <span>
        <i class="legend-swatch legend-swatch--launch" />
        <span>{{ t('sulfurCube.scene.launchLegend') }}</span>
      </span>
      <span>
        <i class="legend-swatch legend-swatch--trajectory" />
        <span>{{ t('sulfurCube.scene.trajectoryLegend') }}</span>
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
    var(--color-base, #202122) 4%,
    var(--background-color-base, #fff)
  );
  --scene-cube: #d5a500;
  --scene-cube-dark: #8a6400;
  --scene-attacker: var(--color-base, #202122);
  --scene-aim: #a2a9b1;
  --scene-aim-label: var(--color-subtle, #54595d);
  --scene-limit: #c8ccd1;
  --scene-launch: #00a000;
  --scene-trajectory: #00a000;
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
  top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem;
  border: 1px solid color-mix(in srgb, var(--scene-border) 65%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--background-color-base, #fff) 88%, transparent);
  box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
}

.scene-frame__overlay--left {
  left: 0.5rem;
}

.scene-frame__overlay--right {
  right: 0.5rem;
}

.scene-frame__overlay h3 {
  flex: none;
  color: var(--scene-ink);
  font-size: 0.875rem;
  font-weight: 700;
}

.scene-frame__overlay :deep(.cdx-button) {
  min-width: 1.75rem;
  padding: 0 0.35rem;
  font-size: 0.875rem;
}

.scene-frame {
  position: relative;
  width: 94%;
  width: min(94%, calc(150svh - 9rem));
  margin-inline: auto;
  overflow: hidden;
  border: 1px solid var(--scene-border);
  border-radius: 4px;
  background: var(--scene-background);
}

.scene-figure--compact .scene-frame {
  width: 100%;
}

.scene-svg {
  display: block;
  width: 100%;
  height: auto;
  color: var(--scene-ink);
  font-family: sans-serif;
  font-size: var(--scene-font-size);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.scene-background {
  fill: var(--scene-background);
  cursor: grab;
  touch-action: none;
}

.scene-svg--panning,
.scene-svg--panning * {
  cursor: grabbing !important;
}

.scene-svg--dragging-object,
.scene-svg--dragging-object * {
  cursor: move !important;
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
  stroke: var(--scene-attacker);
  stroke-dasharray: var(--scene-dash-theta);
  stroke-width: var(--scene-stroke-thin);
}

.theta-geometry .theta-arc {
  fill: none;
  stroke: var(--scene-attacker);
  stroke-dasharray: none;
  stroke-width: var(--scene-stroke-regular);
}

.theta-geometry text {
  fill: var(--scene-attacker);
  font-weight: 700;
}

.aim-limits line {
  stroke: var(--scene-limit);
  stroke-dasharray: var(--scene-dash-aim);
  stroke-width: var(--scene-stroke-thin);
}

.look-line {
  stroke: var(--scene-aim);
  stroke-width: var(--scene-stroke-medium);
}

.look-arrow {
  fill: var(--scene-aim);
}

.aim-q-label {
  fill: var(--scene-aim-label);
  font-weight: 700;
  pointer-events: none;
}

.cube-shape rect {
  fill: color-mix(in srgb, var(--scene-cube) 38%, transparent);
  stroke: var(--scene-cube-dark);
  stroke-width: var(--scene-stroke-medium);
}

.cube-shape circle {
  fill: var(--scene-cube-dark);
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
  fill: var(--scene-background);
  stroke: var(--scene-attacker);
  stroke-width: var(--scene-stroke-regular);
}

.attacker-shape text {
  fill: var(--scene-attacker);
  font-weight: 700;
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

.trajectory-line {
  fill: none;
  stroke: var(--scene-trajectory);
  stroke-dasharray: var(--scene-dash-trajectory);
  stroke-linejoin: round;
  stroke-width: var(--scene-stroke-medium);
  opacity: 0.42;
}

.trajectory-tick {
  fill: var(--scene-background);
  stroke: var(--scene-trajectory);
  stroke-width: var(--scene-stroke-thinnest);
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
  cursor: move;
  touch-action: none;
}

.interactive-handle:focus-visible .handle-hit-area {
  fill: none;
  stroke: var(--color-progressive, #36c);
  stroke-width: var(--scene-stroke-bold);
}

.handle-hit-area {
  fill: transparent;
  stroke: transparent;
}

.aim-handle path {
  fill: var(--scene-background);
  stroke: var(--scene-aim);
  stroke-width: var(--scene-stroke-bold);
}

.aim-handle text {
  fill: var(--scene-aim);
  font-weight: 700;
  pointer-events: none;
}

.attacker-handle > circle:last-child {
  fill: var(--scene-attacker);
  stroke: var(--scene-background);
  stroke-width: var(--scene-stroke-regular);
}

.cube-handle > circle:last-child {
  fill: var(--scene-cube-dark);
  stroke: var(--scene-background);
  stroke-width: var(--scene-stroke-regular);
}

.scene-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-top: 0.5rem;
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
  --scene-cube-dark: #e1b82f;
  --scene-attacker: var(--color-base, #eaecf0);
  --scene-aim: #72777d;
  --scene-aim-label: var(--color-base, #eaecf0);
  --scene-limit: #54595d;
  --scene-launch: #33d13f;
  --scene-trajectory: #33d13f;
}

.legend-swatch {
  display: inline-block;
  width: 1.25rem;
  border-top: 3px solid;
}

.legend-swatch--aim {
  border-color: var(--scene-aim);
}

.legend-swatch--launch {
  border-color: var(--scene-launch);
}

.legend-swatch--trajectory {
  border-color: var(--scene-trajectory);
  border-top-style: dashed;
}

figcaption {
  display: grid;
  gap: 0.25rem;
  margin-top: 0.5rem;
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
