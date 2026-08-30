import { describe, expect, it } from 'vitest'
import {
  createDiagnosticFormState,
  parseDiagnosticFormState,
  resetAttackerEyeToStandingPresetInFormState,
  translateAttackerForFeetFormEdit,
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
  launchVectorDisplayLength,
  launchVectorMaximumDisplayLength,
  thetaArcRadius,
  thetaLabelHorizontalOffset,
  thetaLabelVerticalOffset,
} from '../presentation/scene'
import {
  clampPointToBoundsFromOrigin,
  createViewportWorldBounds,
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
  it('projects the attacker to the left of the cube in the radial view', () => {
    const projection = createRadialProjection({ x: 2, y: 4, z: -3 }, { x: 5, y: 5, z: 1 })

    expect(projection.horizontalAxis.x).toBeCloseTo(-0.6, 12)
    expect(projection.horizontalAxis.y).toBeCloseTo(-0.8, 12)
    expect(projectPointToRadialPlane({ x: 5, y: 5, z: 1 }, projection)).toEqual({ x: -5, y: 1 })
    expect(projectVectorToRadialPlane({ x: -0.6, y: 2, z: -0.8 }, projection)).toEqual({
      x: 1,
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

  it('maps the SVG wall to world bounds and clamps a point along its source ray', () => {
    const transform = createWorldToSvgTransform({ minX: -2, maxX: 6, minY: -3, maxY: 5 }, viewport)
    const wallBounds = createViewportWorldBounds(transform, 5)
    const origin = transform.toWorld({ x: 360, y: 210 })
    const outside = transform.toWorld({ x: 900, y: 300 })
    const clamped = clampPointToBoundsFromOrigin(origin, outside, wallBounds)
    const clampedSvg = transform.toSvg(clamped)

    expect(clampedSvg.x).toBeCloseTo(viewport.width - 5, 12)
    expect(clampedSvg.y).toBeGreaterThan(5)
    expect(clampedSvg.y).toBeLessThan(viewport.height - 5)
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
    expect(scene.attackerFeet).toEqual({ x: -1.5, y: 0 })
    expect(scene.attackerEyes).toEqual({ x: -1.5, y: 1.62 })
    expect(scene.attackerHitbox).toEqual({
      bottomLeft: { x: -1.8, y: 0 },
      topRight: { x: -1.2, y: 1.8 },
      width: 0.6,
      height: 1.8,
    })
    expect(scene.aimPoint).toEqual({ x: -0.48, y: 0.49 })
    expect(
      Math.hypot(
        scene.aimArrowEnd.x - scene.attackerEyes.x,
        scene.aimArrowEnd.y - scene.attackerEyes.y,
      ),
    ).toBeCloseTo(aimArrowLength, 12)
    expect(scene.aimArrowEnd).not.toEqual(scene.aimPoint)
    const launchSpeed = Math.hypot(0.165, 0.378)
    const expectedDisplayLength = launchVectorDisplayLength(launchSpeed)

    expect(scene.launchDisplayLength).toBeCloseTo(expectedDisplayLength, 12)
    expect(Math.hypot(scene.launchEnd.x, scene.launchEnd.y)).toBeCloseTo(expectedDisplayLength, 12)
    expect(scene.launchEnd.x / scene.launchEnd.y).toBeCloseTo(0.165 / 0.378, 12)
    expect(scene.trajectory[0].point).toEqual(scene.cube.feet)
    expect(scene.cubeFeetLineStart).toEqual({ x: -3, y: 0 })
    expect(scene.cubeFeetLineEnd).toEqual({ x: 3, y: 0 })
    expect(scene.trajectory).toHaveLength(12)
    expect(scene.trajectory[11].tick).toBe(11)
    const trajectoryEnd = scene.trajectoryEndMarker!
    const finalTick = scene.trajectory[11].point
    const previousTick = scene.trajectory[10].point

    expect(trajectoryEnd).toEqual(finalTick)
    expect(previousTick.y).toBeGreaterThan(scene.cube.feet.y)
    expect(finalTick.y).toBe(scene.cube.feet.y)
  })

  it('expands low velocity arrows with a monotonic bounded display curve', () => {
    const speeds = [0, 0.01, 0.05, 0.25, 1, 4, 64]
    const lengths = speeds.map(launchVectorDisplayLength)

    expect(lengths[0]).toBe(0)
    for (let index = 1; index < lengths.length; index += 1) {
      expect(lengths[index]).toBeGreaterThan(lengths[index - 1]!)
    }
    expect(launchVectorDisplayLength(0.01)).toBeLessThan(0.35)
    expect(launchVectorDisplayLength(64)).toBeGreaterThan(7.5)
    expect(lengths[lengths.length - 1]).toBeLessThanOrEqual(launchVectorMaximumDisplayLength)
    expect(() => launchVectorDisplayLength(-1)).toThrow(/nonnegative/)
    expect(() => launchVectorDisplayLength(Number.NaN)).toThrow(/finite/)
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

    expect(scene.thetaLabelPoint.x).toBeGreaterThan(scene.attackerFeet.x)
    expect(scene.thetaLabelPoint.y).toBeLessThan(scene.attackerFeet.y)
    expect(thetaLabelHorizontalOffset).toBeLessThan(0)
    expect(thetaLabelVerticalOffset).toBeLessThan(0)
  })

  it('draws the full 3D mechanics theta when lateral feet offset is hidden by the plane', () => {
    const baseScene = createRadialScenePresentation(
      evaluateDiagnosticInputs(getDiagnosticPreset('M1').inputs),
    )
    const evaluation = evaluateDiagnosticInputs({
      ...getDiagnosticPreset('M1').inputs,
      attackerFeetPosition: { x: 2, y: 1, z: 0 },
      attackerEyePosition: { x: 2, y: 2.62, z: 0 },
      aimPoint: { x: 0, y: 0.49, z: 0 },
    })
    const scene = createRadialScenePresentation(evaluation, baseScene.projection)
    const arcStart = scene.thetaArc[0]!
    const arcEnd = scene.thetaArc[scene.thetaArc.length - 1]!
    const startX = arcStart.x - scene.attackerFeet.x
    const startY = arcStart.y - scene.attackerFeet.y
    const endX = arcEnd.x - scene.attackerFeet.x
    const endY = arcEnd.y - scene.attackerFeet.y
    const displayedTheta = Math.atan2(startX * endY - startY * endX, startX * endX + startY * endY)

    expect(scene.attackerFeet.x).toBeCloseTo(scene.cube.feet.x, 12)
    expect(evaluation.callResult.diagnostics.theta).toBeCloseTo(Math.atan2(1, 2), 12)
    expect(displayedTheta).toBeCloseTo(evaluation.callResult.diagnostics.theta, 12)
  })

  it('preserves lateral aim information outside the simplified radial view', () => {
    const evaluation = evaluateDiagnosticInputs(getDiagnosticPreset('M2').inputs)
    const scene = createRadialScenePresentation(evaluation)

    expect(scene.aimPoint).toEqual({ x: -0.48, y: 0.49 })
    expect(scene.aimLateralOffset).toBeCloseTo(-0.4, 12)
  })

  it('stops drawing at floor contact while preserving the requested maximum length', () => {
    const evaluation = evaluateDiagnosticInputs({
      ...getDiagnosticPreset('M1').inputs,
      trajectoryTicks: 200,
    })
    const scene = createRadialScenePresentation(evaluation)

    expect(scene.renderedTrajectoryTicks).toBe(11)
    expect(scene.requestedTrajectoryTicks).toBe(200)
    expect(evaluation.trajectory.ticks).toHaveLength(11)
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
    expect(movedAttackerTransform.toSvg(movedAttackerScene.attackerFeet).x).toBeLessThan(
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

  it('applies an exact feet-coordinate edit as the same attacker translation', () => {
    const inputs = getDiagnosticPreset('M1').inputs
    const current = createDiagnosticFormState(inputs)
    const updated = parseDiagnosticFormState(
      translateAttackerForFeetFormEdit(current, {
        ...current,
        attackerFeetX: 0.25,
        attackerFeetY: -0.5,
        attackerFeetZ: 2.5,
      }),
    )

    expect(updated.attackerFeetPosition).toEqual({ x: 0.25, y: -0.5, z: 2.5 })
    expect(updated.attackerEyePosition).toEqual({ x: 0.25, y: 1.12, z: 2.5 })
    expect(updated.aimPoint).toEqual({ x: 0.25, y: -0.01, z: 1.48 })
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

  it('restores standing-preset eyes from the current attacker feet', () => {
    const inputs = getDiagnosticPreset('M1').inputs
    const form = createDiagnosticFormState({
      ...inputs,
      attackerFeetPosition: { x: 1, y: 2, z: 3 },
      attackerEyePosition: { x: 99, y: 99, z: 99 },
    })

    expect(parseDiagnosticFormState(resetAttackerEyeToStandingPresetInFormState(form))).toEqual({
      ...inputs,
      attackerFeetPosition: { x: 1, y: 2, z: 3 },
      attackerEyePosition: { x: 1, y: 3.62, z: 3 },
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
    expect(powerSpace.aimArrowEnd).not.toEqual({ x: values.h1, y: values.v1 })
    expect(
      Math.hypot(powerSpace.aimArrowEnd.x - values.h1, powerSpace.aimArrowEnd.y - values.v1),
    ).toBeLessThan(0.03)
    expect(powerSpace.elevationArc[0]).toEqual({ x: values.h1, y: values.v1 })
    const finalElevationArcPoint = powerSpace.elevationArc[powerSpace.elevationArc.length - 1]!

    expect(finalElevationArcPoint.x).toBeCloseTo(values.h2, 12)
    expect(finalElevationArcPoint.y).toBeCloseTo(values.v2, 12)
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

  it('shortens the elevation arrow before the point when elevation rotation occurs', () => {
    const evaluation = evaluateDiagnosticInputs(getDiagnosticPreset('M6').inputs)
    const values = evaluation.callResult.diagnostics
    const powerSpace = createPowerSpacePresentation(evaluation.callResult)

    expect(values.powerRotationAngle).not.toBe(0)
    expect(powerSpace.elevationArrowEnd).not.toEqual({ x: values.h2, y: values.v2 })
    expect(
      Math.hypot(
        powerSpace.elevationArrowEnd.x - values.h2,
        powerSpace.elevationArrowEnd.y - values.v2,
      ),
    ).toBeLessThan(0.03)
  })

  it('keeps the elevation arrow pointing toward its stage for very small rotations', () => {
    const inputs = getDiagnosticPreset('M1').inputs
    const evaluation = evaluateDiagnosticInputs({
      ...inputs,
      attackerFeetPosition: { ...inputs.attackerFeetPosition, y: 0.001 },
      attackerEyePosition: { ...inputs.attackerEyePosition, y: 1.621 },
    })
    const powerSpace = createPowerSpacePresentation(evaluation.callResult)
    const target = powerSpace.stages.find((stage) => stage.id === 'elevation')!.point
    const toArrowEnd = {
      x: powerSpace.elevationArrowEnd.x - powerSpace.elevationArrowStart.x,
      y: powerSpace.elevationArrowEnd.y - powerSpace.elevationArrowStart.y,
    }
    const toTarget = {
      x: target.x - powerSpace.elevationArrowStart.x,
      y: target.y - powerSpace.elevationArrowStart.y,
    }

    expect(evaluation.callResult.diagnostics.powerRotationAngle).not.toBe(0)
    expect(toArrowEnd.x * toTarget.x + toArrowEnd.y * toTarget.y).toBeGreaterThan(0)
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
