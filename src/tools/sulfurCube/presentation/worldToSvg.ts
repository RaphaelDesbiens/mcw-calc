import type { PlanePoint, SvgViewport, WorldBounds, WorldToSvgTransform } from './types'

function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be finite and positive`)
  }
}

export function createWorldBounds(
  points: readonly PlanePoint[],
  minimumWidth: number,
  minimumHeight: number,
  margin: number,
): WorldBounds {
  if (points.length === 0) {
    throw new RangeError('world bounds require at least one point')
  }

  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new RangeError('world bounds points must be finite')
    }
  }

  assertPositive(minimumWidth, 'minimumWidth')
  assertPositive(minimumHeight, 'minimumHeight')

  if (!Number.isFinite(margin) || margin < 0) {
    throw new RangeError('margin must be finite and nonnegative')
  }

  let minX = Math.min(...points.map((point) => point.x))
  let maxX = Math.max(...points.map((point) => point.x))
  let minY = Math.min(...points.map((point) => point.y))
  let maxY = Math.max(...points.map((point) => point.y))
  const widthExpansion = Math.max(0, minimumWidth - (maxX - minX)) / 2
  const heightExpansion = Math.max(0, minimumHeight - (maxY - minY)) / 2

  minX -= widthExpansion + margin
  maxX += widthExpansion + margin
  minY -= heightExpansion + margin
  maxY += heightExpansion + margin

  return { minX, maxX, minY, maxY }
}

export function createWorldToSvgTransform(
  bounds: WorldBounds,
  viewport: SvgViewport,
): WorldToSvgTransform {
  const worldWidth = bounds.maxX - bounds.minX
  const worldHeight = bounds.maxY - bounds.minY
  const availableWidth = viewport.width - viewport.padding.left - viewport.padding.right
  const availableHeight = viewport.height - viewport.padding.top - viewport.padding.bottom

  assertPositive(worldWidth, 'world bounds width')
  assertPositive(worldHeight, 'world bounds height')
  assertPositive(availableWidth, 'viewport content width')
  assertPositive(availableHeight, 'viewport content height')

  const scale = Math.min(availableWidth / worldWidth, availableHeight / worldHeight)
  const renderedWidth = worldWidth * scale
  const renderedHeight = worldHeight * scale
  const left = viewport.padding.left + (availableWidth - renderedWidth) / 2
  const top = viewport.padding.top + (availableHeight - renderedHeight) / 2

  return {
    scale,
    bounds,
    viewport,
    toSvg(point) {
      return {
        x: left + (point.x - bounds.minX) * scale,
        y: top + (bounds.maxY - point.y) * scale,
      }
    },
    toWorld(point) {
      return {
        x: bounds.minX + (point.x - left) / scale,
        y: bounds.maxY - (point.y - top) / scale,
      }
    },
  }
}

export function translateWorldBounds(bounds: WorldBounds, delta: PlanePoint): WorldBounds {
  return {
    minX: bounds.minX + delta.x,
    maxX: bounds.maxX + delta.x,
    minY: bounds.minY + delta.y,
    maxY: bounds.maxY + delta.y,
  }
}

export function scaleWorldBoundsAroundPoint(
  bounds: WorldBounds,
  anchor: PlanePoint,
  factor: number,
): WorldBounds {
  assertPositive(factor, 'world bounds scale factor')

  if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) {
    throw new RangeError('world bounds scale anchor must be finite')
  }

  return {
    minX: anchor.x + (bounds.minX - anchor.x) * factor,
    maxX: anchor.x + (bounds.maxX - anchor.x) * factor,
    minY: anchor.y + (bounds.minY - anchor.y) * factor,
    maxY: anchor.y + (bounds.maxY - anchor.y) * factor,
  }
}
