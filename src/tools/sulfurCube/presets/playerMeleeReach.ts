import type { ClearRayEntityReachResult } from '../model/reach'
import type { SulfurCubeKnockbackContext } from '../model/types'
import { je26_2OrdinaryPlayerMeleeReach } from '../data/je26_2'
import { resolveCubeClearRayReach } from '../model/reach'

/**
 * Resolves the ordinary bare-hand/iron-sword Survival client reach in an
 * otherwise clear scene. Block and competing-entity occlusion are deliberately
 * outside this diagnostic.
 */
export function resolveOrdinarySurvivalPlayerMeleeReach(
  context: SulfurCubeKnockbackContext,
): ClearRayEntityReachResult {
  return resolveCubeClearRayReach(
    context.attacker,
    context.cube,
    je26_2OrdinaryPlayerMeleeReach.strictMaximumReach,
    je26_2OrdinaryPlayerMeleeReach.sulfurCubePickRadius,
    je26_2OrdinaryPlayerMeleeReach.absorbedSulfurCubeCanBePickedFromInside,
    je26_2OrdinaryPlayerMeleeReach.clipTolerance,
  )
}
