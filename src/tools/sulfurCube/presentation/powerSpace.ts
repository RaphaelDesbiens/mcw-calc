import type { KnockbackCallResult } from '../model/types'
import type { PlanePoint, WorldBounds } from './types'
import { createWorldBounds } from './worldToSvg'

export type PowerStageId = 'base' | 'aim' | 'elevation' | 'capped'

export interface PowerStagePresentation {
  readonly id: PowerStageId
  readonly point: PlanePoint
}

export interface PowerSpacePresentation {
  readonly bounds: WorldBounds
  readonly limitBounds: WorldBounds
  readonly aimRange: {
    readonly start: PlanePoint
    readonly end: PlanePoint
  }
  readonly stages: readonly PowerStagePresentation[]
  readonly capApplied: boolean
  readonly capFactor: number
}

export function createPowerSpacePresentation(
  callResult: KnockbackCallResult,
): PowerSpacePresentation {
  const values = callResult.diagnostics
  const limitBounds = {
    minX: -values.h0,
    maxX: values.h0,
    minY: -values.v0,
    maxY: values.v0,
  }
  const stages: readonly PowerStagePresentation[] = [
    { id: 'base', point: { x: values.h0, y: values.v0 } },
    { id: 'aim', point: { x: values.h1, y: values.v1 } },
    { id: 'elevation', point: { x: values.h2, y: values.v2 } },
    { id: 'capped', point: { x: values.h3, y: values.v3 } },
  ]
  const aimTransferScale = callResult.input.context.mechanics.verticalHitAngleScale
  const aimRange = {
    start: {
      x: values.h0 * (1 + aimTransferScale),
      y: values.v0 * (1 - aimTransferScale),
    },
    end: {
      x: values.h0 * (1 - aimTransferScale),
      y: values.v0 * (1 + aimTransferScale),
    },
  }
  const minimumWidth = Math.max(values.h0 * 2.8, 0.5)
  const minimumHeight = Math.max(values.v0 * 4, 0.25)
  const margin = Math.max(values.h0 * 0.12, values.v0 * 0.3, 0.025)
  const bounds = createWorldBounds(
    [
      { x: limitBounds.minX, y: limitBounds.minY },
      { x: limitBounds.maxX, y: limitBounds.maxY },
      { x: 0, y: 0 },
      aimRange.start,
      aimRange.end,
      ...stages.map((stage) => stage.point),
    ],
    minimumWidth,
    minimumHeight,
    margin,
  )

  return {
    bounds,
    limitBounds,
    aimRange,
    stages,
    capApplied: values.capFactor < 1,
    capFactor: values.capFactor,
  }
}
