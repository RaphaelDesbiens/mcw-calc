import type { NumericBackend } from '../numerics/types'
import { describe, expect, it } from 'vitest'
import {
  bouncyArchetype,
  je26_2ArchetypesById,
  je26_2Constants,
  je26_2KnockbackMechanics,
  je26_2UniformFloorProfileDefinitions,
  je26_2UniformFloorProfiles,
  provenance,
} from '../data/je26_2'
import { standardNumerics } from '../numerics/standard'
import { resolveArchetype } from '../resolution/cubeProperties'
import {
  createAdultSulfurCubeGeometry,
  createBouncyTrajectoryAssumptions,
  createMilestone1Scenario,
  createRestingGroundVelocity,
} from '../presets/milestone1'
import { createStandingPlayerGeometry } from '../presets/standingPlayer'

const sourceFloatNumerics: NumericBackend = Object.freeze({
  ...standardNumerics,
  id: 'fixture-source-float',
  sourceFloat: Math.fround,
})

describe('java Edition 26.2 milestone data', () => {
  it('transcribes the Bouncy archetype without discarding later physical properties', () => {
    expect(bouncyArchetype.knockbackModifiers.horizontalPower.value).toBe(0.4125)
    expect(bouncyArchetype.knockbackModifiers.verticalPower.value).toBe(0.105)
    expect(bouncyArchetype.effectiveProperties.knockbackResistance.value).toBe(-2)
    expect(bouncyArchetype.effectiveProperties.explosionKnockbackResistance.value).toBe(0)
    expect(bouncyArchetype.effectiveProperties.airDragModifier.value).toBe(0.009999999776482582)
    expect(bouncyArchetype.effectiveProperties.bounciness.value).toBe(0.8999999761581421)
    expect(bouncyArchetype.effectiveProperties.frictionModifier.value).toBeCloseTo(
      0.300000011920929,
      14,
    )
    expect(bouncyArchetype.buoyant.value).toBe(true)
    expect(bouncyArchetype.attributeModifiers).toHaveLength(5)
  })

  it('derives the adult dimensions and launch-relevant effective values', () => {
    expect(createAdultSulfurCubeGeometry({ x: 0, y: 0, z: 0 }).dimensions).toEqual({
      width: 0.98,
      height: 0.98,
    })
    expect(1 - bouncyArchetype.effectiveProperties.knockbackResistance.value).toBe(3)
    expect(createBouncyTrajectoryAssumptions(standardNumerics).drag).toBeCloseTo(
      0.9991000294685364,
      7,
    )
  })

  it('materializes the exact final formula parameters separately', () => {
    expect(je26_2KnockbackMechanics.horizontalResultScale).toBe(0.4)
    expect(je26_2KnockbackMechanics.verticalResultScale).toBe(1.2)
    expect(je26_2KnockbackMechanics.resultClampMinimum).toBe(-128)
    expect(je26_2KnockbackMechanics.resultClampMaximum).toBe(128)
    expect(je26_2Constants.standingPlayerEyeHeight.value).toBe(1.62)
    expect(je26_2Constants.standingPlayerDimensions.value).toEqual({ width: 0.6, height: 1.8 })
  })

  it('keeps source-backed uniform floor properties separate from cube properties', () => {
    expect(je26_2UniformFloorProfiles.ordinary_full_block).toMatchObject({
      surfaceHeightWithinBlock: 1,
      friction: 0.6000000238418579,
      bounceRestitution: 0,
      speedFactor: 1,
      suppressesBounce: false,
      afterTravel: 'none',
    })
    expect(je26_2UniformFloorProfiles.slime_block).toMatchObject({
      friction: 0.800000011920929,
      bounceRestitution: 1,
      afterTravel: 'slimeStepOn',
    })
    expect(je26_2UniformFloorProfiles.honey_block).toMatchObject({
      surfaceHeightWithinBlock: 0.9375,
      speedFactor: 0.4000000059604645,
      suppressesBounce: true,
    })
    expect(je26_2UniformFloorProfileDefinitions.bed.bounceRestitution.provenance).toContain(
      'uniformFloorProperties',
    )
  })

  it('derives archetype-sensitive resting-ground Motion with Java float operations', () => {
    const hot = resolveArchetype(je26_2ArchetypesById['minecraft:hot'])

    expect(
      createRestingGroundVelocity(
        { airDragModifier: bouncyArchetype.effectiveProperties.airDragModifier.value },
        sourceFloatNumerics,
      ),
    ).toEqual({ x: 0, y: -0.07992800235748292, z: 0 })
    expect(
      createRestingGroundVelocity(
        { airDragModifier: hot.attributes['minecraft:air_drag_modifier'].effectiveValue },
        sourceFloatNumerics,
      ),
    ).toEqual({ x: 0, y: -0.07927999973297119, z: 0 })
  })

  it('keeps the first milestone to one ordinary call from grounded tick-boundary Motion', () => {
    const scenario = createMilestone1Scenario(
      createStandingPlayerGeometry({ x: 0, y: 0, z: 1.5 }, { x: 0, y: -0.5, z: -1 }),
      { x: 0, y: 0, z: 0 },
      { x: 0, z: 1.5 },
      1,
    )

    expect(scenario.initialVelocity).toEqual(
      createRestingGroundVelocity({
        airDragModifier: bouncyArchetype.effectiveProperties.airDragModifier.value,
      }),
    )
    expect(scenario.initialVelocity.y).toBeLessThan(0)
    expect(scenario.call.scaling).toEqual({ kind: 'ordinaryDamage' })
    expect(scenario.call.damageArgument).toBe(1)
  })

  it('uses repository-relative provenance for every source ledger entry', () => {
    for (const record of Object.values(provenance)) {
      expect(record.edition).toBe('Java Edition')
      expect(record.version).toBe('26.2')
      expect(record.sourcePath).not.toMatch(/^\//)
      expect(record.sourcePath).not.toContain('fandom')
      expect(record.locator.length).toBeGreaterThan(0)
    }
  })
})
