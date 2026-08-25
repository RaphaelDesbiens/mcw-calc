import { describe, expect, it } from 'vitest'
import {
  createDiagnosticFormState,
  parseDiagnosticFormState,
  translateAttackerInFormState,
  translateCubeInFormState,
  updateAimPointInFormState,
} from '../components/formState'
import { createPowerSpacePresentation } from '../presentation/powerSpace'
import {
  createRadialProjection,
  projectPointToRadialPlane,
  projectVectorToRadialPlane,
  radialLateralOffset,
  unprojectPointFromRadialPlane,
} from '../presentation/radialPlane'
import {
  aimArrowLength,
  createRadialScenePresentation,
  launchVectorDisplayScale,
  thetaArcRadius,
  thetaLabelVerticalOffset,
  trajectoryEndExtension,
} from '../presentation/scene'
import {
  createWorldBounds,
  createWorldToSvgTransform,
  scaleWorldBoundsAroundPoint,
  translateWorldBounds,
} from '../presentation/worldToSvg'
import {
  diagnosticPresets,
  evaluateDiagnosticInputs,
  getDiagnosticPreset,
} from '../presets/diagnostic'

describe('radial-plane presentation', () => {
  it('projects the cube-to-attacker direction onto positive horizontal screen distance', () => {
    const projection = createRadialProjection({ x: 2, y: 4, z: -3 }, { x: 5, y: 5, z: 1 })

    expect(projection.horizontalAxis.x).toBeCloseTo(0.6, 12)
    expect(projection.horizontalAxis.y).toBeCloseTo(0.8, 12)
    expect(projectPointToRadialPlane({ x: 5, y: 5, z: 1 }, projection)).toEqual({ x: 5, y: 1 })
    expect(projectVectorToRadialPlane({ x: -0.6, y: 2, z: -0.8 }, projection)).toEqual({
      x: -1,
      y: 2,
    })
  })

  it('uses a stable fallback axis for coincident horizontal feet positions', () => {
    const projection = createRadialProjection({ x: 1, y: 0, z: 2 }, { x: 1, y: 3, z: 2 })

    expect(projection.horizontalAxis).toEqual({ x: 0, y: 1 })
  })

  it('round-trips a projected point while preserving its lateral offset', () => {
    const projection = createRadialProjection({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 2 })
    const worldPoint = { x: -0.4, y: 0.49, z: 0.48 }
    const projected = projectPointToRadialPlane(worldPoint, projection)
    const lateralOffset = radialLateralOffset(worldPoint, projection)

    expect(unprojectPointFromRadialPlane(projected, projection, lateralOffset)).toEqual(worldPoint)
  })
})

describe('world-to-SVG presentation', () => {
  const viewport = {
    width: 720,
    height: 420,
    padding: { top: 20, right: 30, bottom: 40, left: 50 },
  } as const

  it('fits points into minimum world bounds with a margin', () => {
    expect(
      createWorldBounds(
        [
          { x: 0, y: 0 },
          { x: 2, y: 1 },
        ],
        4,
        3,
        0.5,
      ),
    ).toEqual({ minX: -1.5, maxX: 3.5, minY: -1.5, maxY: 2.5 })
  })

  it('round-trips fitted SVG coordinates and keeps world Y pointing upward', () => {
    const bounds = { minX: -2, maxX: 6, minY: -3, maxY: 5 }
    const transform = createWorldToSvgTransform(bounds, viewport)
    const bottom = transform.toSvg({ x: 1, y: -2 })
    const top = transform.toSvg({ x: 1, y: 4 })

    expect(top.y).toBeLessThan(bottom.y)
    expect(transform.toWorld(transform.toSvg({ x: 2.5, y: 1.25 }))).toEqual({
      x: 2.5,
      y: 1.25,
    })
  })

  it('rejects invalid bounds instead of leaking infinities into SVG attributes', () => {
    expect(() =>
      createWorldToSvgTransform({ minX: 0, maxX: 0, minY: 0, maxY: 1 }, viewport),
    ).toThrow(/width/)
    expect(() => createWorldBounds([], 4, 4, 1)).toThrow(/point/)
    expect(() => createWorldBounds([{ x: Number.NaN, y: 0 }], 4, 4, 1)).toThrow(/finite/)
  })

  it('pans a fixed camera without changing its scale or dimensions', () => {
    const bounds = { minX: -2, maxX: 6, minY: -3, maxY: 5 }
    const translated = translateWorldBounds(bounds, { x: -1.25, y: 0.5 })

    expect(translated).toEqual({ minX: -3.25, maxX: 4.75, minY: -2.5, maxY: 5.5 })
    expect(createWorldToSvgTransform(translated, viewport).scale).toBe(
      createWorldToSvgTransform(bounds, viewport).scale,
    )
  })

  it('zooms around a fixed world point', () => {
    const bounds = { minX: -2, maxX: 6, minY: -3, maxY: 5 }
    const anchor = { x: 2, y: 1 }
    const zoomed = scaleWorldBoundsAroundPoint(bounds, anchor, 0.5)

    expect(zoomed).toEqual({ minX: 0, maxX: 4, minY: -1, maxY: 3 })
    expect(createWorldToSvgTransform(zoomed, viewport).scale).toBe(
      createWorldToSvgTransform(bounds, viewport).scale * 2,
    )
    expect(() => scaleWorldBoundsAroundPoint(bounds, anchor, 0)).toThrow(/positive/)
  })
})

describe('radial scene presentation', () => {
  const sceneViewport = {
    width: 720,
    height: 480,
    padding: { top: 36, right: 44, bottom: 46, left: 48 },
  } as const

  it('derives the M1 scene entirely from model inputs and outputs', () => {
    const evaluation = evaluateDiagnosticInputs(getDiagnosticPreset('M1').inputs)
    const scene = createRadialScenePresentation(evaluation)

    expect(scene.cube.feet).toEqual({ x: 0, y: 0 })
    expect(scene.cube.width).toBeCloseTo(0.98, 12)
    expect(scene.cube.height).toBeCloseTo(0.98, 12)
    expect(scene.attackerFeet).toEqual({ x: 1.5, y: 0 })
    expect(scene.attackerEyes).toEqual({ x: 1.5, y: 1.62 })
    expect(scene.attackerHitbox).toEqual({
      bottomLeft: { x: 1.2, y: 0 },
      topRight: { x: 1.8, y: 1.8 },
      width: 0.6,
      height: 1.8,
    })
    expect(scene.aimPoint).toEqual({ x: 0.48, y: 0.49 })
    expect(
      Math.hypot(
        scene.aimArrowEnd.x - scene.attackerEyes.x,
        scene.aimArrowEnd.y - scene.attackerEyes.y,
      ),
    ).toBeCloseTo(aimArrowLength, 12)
    expect(scene.aimArrowEnd).not.toEqual(scene.aimPoint)
    expect(scene.launchEnd.x).toBeCloseTo(-0.165 * launchVectorDisplayScale, 12)
    expect(scene.launchEnd.y).toBeCloseTo(0.49 + 0.378 * launchVectorDisplayScale, 12)
    expect(scene.trajectory[0].point).toEqual(scene.cube.center)
    expect(scene.trajectory).toHaveLength(15)
    expect(scene.trajectory[14].tick).toBe(14)
    const trajectoryEnd = scene.trajectoryEndMarker!
    const finalTick = scene.trajectory[14].point

    expect(Math.hypot(trajectoryEnd.x - finalTick.x, trajectoryEnd.y - finalTick.y)).toBeCloseTo(
      trajectoryEndExtension,
      12,
    )
    expect(scene.cube.center.y - finalTick.y).toBeCloseTo(1.986, 3)
  })

  it('anchors the theta arc and label to the attacker-feet angle corner', () => {
    const scene = createRadialScenePresentation(
      evaluateDiagnosticInputs(getDiagnosticPreset('M6').inputs),
    )

    expect(scene.thetaArc).toHaveLength(17)

    for (const point of [scene.thetaArc[0], scene.thetaArc[scene.thetaArc.length - 1]]) {
      expect(
        Math.hypot(point.x - scene.attackerFeet.x, point.y - scene.attackerFeet.y),
      ).toBeCloseTo(thetaArcRadius, 12)
    }

    expect(scene.thetaLabelPoint.x).toBeLessThan(scene.attackerFeet.x)
    expect(scene.thetaLabelPoint.y).toBeLessThan(scene.attackerFeet.y)
    expect(thetaLabelVerticalOffset).toBeLessThan(0)
  })

  it('preserves lateral aim information outside the simplified radial view', () => {
    const evaluation = evaluateDiagnosticInputs(getDiagnosticPreset('M2').inputs)
    const scene = createRadialScenePresentation(evaluation)

    expect(scene.aimPoint).toEqual({ x: 0.48, y: 0.49 })
    expect(scene.aimLateralOffset).toBeCloseTo(0.4, 12)
  })

  it('limits drawing work without changing the requested model horizon', () => {
    const evaluation = evaluateDiagnosticInputs({
      ...getDiagnosticPreset('M1').inputs,
      trajectoryTicks: 200,
    })
    const scene = createRadialScenePresentation(evaluation)

    expect(scene.renderedTrajectoryTicks).toBe(20)
    expect(scene.requestedTrajectoryTicks).toBe(200)
    expect(evaluation.trajectory.ticks).toHaveLength(200)
  })

  it('supports a fixed projection and camera while interactive objects move', () => {
    const baseInputs = getDiagnosticPreset('M1').inputs
    const baseScene = createRadialScenePresentation(evaluateDiagnosticInputs(baseInputs))
    const baseTransform = createWorldToSvgTransform(baseScene.bounds, sceneViewport)
    const baseCubeFeet = baseTransform.toSvg(baseScene.cube.feet)
    const baseAttackerFeet = baseTransform.toSvg(baseScene.attackerFeet)
    const baseAimPoint = baseTransform.toSvg(baseScene.aimPoint)

    const movedAttackerScene = createRadialScenePresentation(
      evaluateDiagnosticInputs({
        ...baseInputs,
        attackerFeetPosition: { ...baseInputs.attackerFeetPosition, x: 0.5, z: 2 },
        attackerEyePosition: { ...baseInputs.attackerEyePosition, x: 0.5, z: 2 },
        aimPoint: { ...baseInputs.aimPoint, x: 0.5, z: 0.98 },
      }),
      baseScene.projection,
    )
    const movedAimScene = createRadialScenePresentation(
      evaluateDiagnosticInputs({
        ...baseInputs,
        aimPoint: { ...baseInputs.aimPoint, y: 0.8 },
      }),
      baseScene.projection,
    )

    expect(movedAttackerScene.projection).toBe(baseScene.projection)
    expect(movedAimScene.projection).toBe(baseScene.projection)

    const movedAttackerTransform = createWorldToSvgTransform(baseScene.bounds, sceneViewport)
    const movedAimTransform = createWorldToSvgTransform(baseScene.bounds, sceneViewport)

    expect(movedAttackerTransform.toSvg(movedAttackerScene.cube.feet)).toEqual(baseCubeFeet)
    expect(movedAimTransform.toSvg(movedAimScene.cube.feet)).toEqual(baseCubeFeet)
    expect(movedAttackerTransform.toSvg(movedAttackerScene.attackerFeet).x).toBeGreaterThan(
      baseAttackerFeet.x,
    )
    expect(movedAimTransform.toSvg(movedAimScene.aimPoint).y).toBeLessThan(baseAimPoint.y)
  })
})

describe('scene interaction form updates', () => {
  it('moves feet, eyes, and aim together when the attacker is translated', () => {
    const inputs = getDiagnosticPreset('M1').inputs
    const translated = parseDiagnosticFormState(
      translateAttackerInFormState(createDiagnosticFormState(inputs), {
        x: 0.25,
        y: -0.5,
        z: 1,
      }),
    )

    expect(translated.attackerFeetPosition).toEqual({ x: 0.25, y: -0.5, z: 2.5 })
    expect(translated.attackerEyePosition).toEqual({ x: 0.25, y: 1.12, z: 2.5 })
    expect(translated.aimPoint).toEqual({ x: 0.25, y: -0.01, z: 1.48 })
  })

  it('changes only the aim coordinates when the aim handle moves', () => {
    const inputs = getDiagnosticPreset('M1').inputs
    const form = createDiagnosticFormState(inputs)
    const updated = updateAimPointInFormState(form, { x: -0, y: 0.123456, z: 2 })

    expect(parseDiagnosticFormState(updated)).toEqual({
      ...inputs,
      aimPoint: { x: 0, y: 0.1235, z: 2 },
    })
  })

  it('changes only cube feet when the cube-center handle moves', () => {
    const inputs = getDiagnosticPreset('M1').inputs
    const translated = parseDiagnosticFormState(
      translateCubeInFormState(createDiagnosticFormState(inputs), {
        x: -0.25,
        y: 0.5,
        z: 1,
      }),
    )

    expect(translated).toEqual({
      ...inputs,
      cubeFeetPosition: { x: -0.25, y: 0.5, z: 1 },
    })
  })
})

describe('power-space presentation', () => {
  it('maps the four model-returned power stages without recalculating them', () => {
    const evaluation = evaluateDiagnosticInputs(getDiagnosticPreset('M1').inputs)
    const values = evaluation.callResult.diagnostics
    const powerSpace = createPowerSpacePresentation(evaluation.callResult)

    expect(powerSpace.stages).toEqual([
      { id: 'base', point: { x: values.h0, y: values.v0 } },
      { id: 'aim', point: { x: values.h1, y: values.v1 } },
      { id: 'elevation', point: { x: values.h2, y: values.v2 } },
      { id: 'capped', point: { x: values.h3, y: values.v3 } },
    ])
    expect(powerSpace.limitBounds).toEqual({
      minX: -values.h0,
      maxX: values.h0,
      minY: -values.v0,
      maxY: values.v0,
    })
    expect(powerSpace.aimRange).toEqual({
      start: {
        x: values.h0 * (1 + evaluation.callResult.input.context.mechanics.verticalHitAngleScale),
        y: values.v0 * (1 - evaluation.callResult.input.context.mechanics.verticalHitAngleScale),
      },
      end: {
        x: values.h0 * (1 - evaluation.callResult.input.context.mechanics.verticalHitAngleScale),
        y: values.v0 * (1 + evaluation.callResult.input.context.mechanics.verticalHitAngleScale),
      },
    })
    expect(powerSpace.capApplied).toBe(true)
    expect(powerSpace.capFactor).toBe(values.capFactor)
  })

  it('includes every stage and the component-limit rectangle in its fitted bounds', () => {
    const powerSpace = createPowerSpacePresentation(
      evaluateDiagnosticInputs(getDiagnosticPreset('M6').inputs).callResult,
    )

    for (const stage of powerSpace.stages) {
      expect(stage.point.x).toBeGreaterThanOrEqual(powerSpace.bounds.minX)
      expect(stage.point.x).toBeLessThanOrEqual(powerSpace.bounds.maxX)
      expect(stage.point.y).toBeGreaterThanOrEqual(powerSpace.bounds.minY)
      expect(stage.point.y).toBeLessThanOrEqual(powerSpace.bounds.maxY)
    }
  })

  it.each(diagnosticPresets)('keeps the $id scene and power SVG mappings finite', (preset) => {
    const evaluation = evaluateDiagnosticInputs(preset.inputs)
    const scene = createRadialScenePresentation(evaluation)
    const powerSpace = createPowerSpacePresentation(evaluation.callResult)
    const sceneTransform = createWorldToSvgTransform(scene.bounds, {
      width: 720,
      height: 480,
      padding: { top: 36, right: 44, bottom: 46, left: 48 },
    })
    const powerTransform = createWorldToSvgTransform(powerSpace.bounds, {
      width: 560,
      height: 340,
      padding: { top: 34, right: 42, bottom: 44, left: 46 },
    })
    const scenePoints = [
      scene.cube.feet,
      scene.cube.center,
      scene.cube.top,
      scene.cube.bottom,
      scene.attackerFeet,
      scene.attackerEyes,
      scene.aimPoint,
      scene.launchEnd,
      ...scene.trajectory.map((sample) => sample.point),
    ]

    for (const point of scenePoints.map(sceneTransform.toSvg)) {
      expect(Number.isFinite(point.x)).toBe(true)
      expect(Number.isFinite(point.y)).toBe(true)
    }

    for (const point of powerSpace.stages.map((stage) => powerTransform.toSvg(stage.point))) {
      expect(Number.isFinite(point.x)).toBe(true)
      expect(Number.isFinite(point.y)).toBe(true)
    }
  })
})
