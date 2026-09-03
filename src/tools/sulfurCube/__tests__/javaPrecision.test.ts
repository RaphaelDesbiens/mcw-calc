import type {
  Je26_2ToolMaterialId,
  Je26_2UniformFloorProfileId,
} from '../data/je26_2'
import type { DiagnosticInputs } from '../presets/diagnostic'
import type { PlayerMeleeInputs } from '../presets/playerMelee'
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { je26_2Constants } from '../data/je26_2'
import { normalizeVec3 } from '../model/vectors'
import {
  javaPrecisionNumerics,
  minecraftCos,
  minecraftSin,
} from '../numerics/javaPrecision'
import {
  calculateJe26_2ViewVector,
  deriveJe26_2PlayerAim,
  minecraftAtan2,
  minecraftWrapDegreesFloat,
} from '../numerics/je26_2PlayerAim'
import { standardNumerics } from '../numerics/standard'
import {
  deriveMinecraftYawDegreesFromAim,
  evaluatePlayerMeleeInputs,
  findDefaultPlayerMeleeTrajectoryTicks,
} from '../presets/playerMelee'
import {
  createDefaultCubePropertySelectionState,
  resolveCubePropertySelection,
  selectCubePropertyBlock,
} from '../resolution'

interface EndpointFixture {
  readonly row: number
  readonly absorbedBlock: string
  readonly weapon: string
  readonly sharpnessLevel: number
  readonly knockbackLevel: number
  readonly floorSurface: string
  readonly cubeFeet: readonly [number, number, number]
  readonly playerFeet: readonly [number, number, number]
  readonly aimPoint: readonly [number, number, number]
  readonly standardEndpoint: readonly [number, number, number]
  readonly observedEndpoint: readonly [number, number, number]
}

const fixtureUrl = new URL('./fixtures/je26_2MeleeEndpointValidation.csv', import.meta.url)

function parseFixtureCsv(): readonly EndpointFixture[] {
  const [headerLine, ...lines] = fs.readFileSync(fixtureUrl, 'utf8').trim().split(/\r?\n/)
  const headers = headerLine!.split(',')

  return lines.map((line) => {
    const columns = Object.fromEntries(
      line.split(',').map((value, index) => [headers[index]!, value]),
    )
    const number = (key: string) => Number(columns[key])

    return {
      row: number('row'),
      absorbedBlock: columns.absorbed_block!,
      weapon: columns.weapon!,
      sharpnessLevel: number('sharpness_level'),
      knockbackLevel: number('knockback_level'),
      floorSurface: columns.floor_surface!,
      cubeFeet: [number('cube_feet_x'), number('cube_feet_y'), number('cube_feet_z')],
      playerFeet: [
        number('player_feet_x'),
        number('player_feet_y'),
        number('player_feet_z'),
      ],
      aimPoint: [number('aim_point_x'), number('aim_point_y'), number('aim_point_z')],
      standardEndpoint: [
        number('predicted_final_cube_feet_x'),
        number('predicted_final_cube_feet_y'),
        number('predicted_final_cube_feet_z'),
      ],
      observedEndpoint: [
        number('actual_final_cube_feet_x'),
        number('actual_final_cube_feet_y'),
        number('actual_final_cube_feet_z'),
      ],
    }
  })
}

const endpointFixtures = parseFixtureCsv()

function floorProfile(blockId: string): Je26_2UniformFloorProfileId {
  if (blockId === 'minecraft:slime_block') return 'slime_block'
  if (blockId === 'minecraft:honey_block') return 'honey_block'
  if (blockId === 'minecraft:packed_ice') return 'ice_0_98'
  if (blockId === 'minecraft:blue_ice') return 'blue_ice'
  if (blockId === 'minecraft:soul_sand') return 'soul_sand'
  if (blockId.endsWith('_bed')) return 'bed'
  return 'ordinary_full_block'
}

function weaponChoice(itemId: string): PlayerMeleeInputs['weapon'] {
  if (itemId === 'none') return { type: 'bareHand' }

  const match =
    /^minecraft:(wooden|stone|copper|golden|iron|diamond|netherite)_(sword|axe)$/.exec(itemId)
  if (match === null) throw new RangeError(`unknown fixture weapon: ${itemId}`)

  return {
    type: match[2] as 'sword' | 'axe',
    material: match[1] as Je26_2ToolMaterialId,
  }
}

function createEvaluationInputs(
  fixture: EndpointFixture,
  standingEyeHeight: number,
): { diagnostic: DiagnosticInputs; melee: PlayerMeleeInputs } {
  const [playerX, playerY, playerZ] = fixture.playerFeet

  return {
    diagnostic: {
      cubeFeetPosition: {
        x: fixture.cubeFeet[0],
        y: fixture.cubeFeet[1],
        z: fixture.cubeFeet[2],
      },
      attackerFeetPosition: { x: playerX, y: playerY, z: playerZ },
      attackerEyePosition: {
        x: playerX,
        y: playerY + standingEyeHeight,
        z: playerZ,
      },
      aimPoint: {
        x: fixture.aimPoint[0],
        y: fixture.aimPoint[1],
        z: fixture.aimPoint[2],
      },
      damageArgument: 1,
      trajectoryTicks: 0,
      floorProfileId: floorProfile(fixture.floorSurface),
    },
    melee: {
      weapon: weaponChoice(fixture.weapon),
      attackStrength: 1,
      sprinting: false,
      criticalHitConditions: false,
      sharpness:
        fixture.sharpnessLevel === 0
          ? { enabled: false }
          : { enabled: true, level: fixture.sharpnessLevel },
      knockback:
        fixture.knockbackLevel === 0
          ? { enabled: false }
          : { enabled: true, level: fixture.knockbackLevel },
    },
  }
}

function resolvedProperties(blockId: string) {
  const resolution = resolveCubePropertySelection(
    selectCubePropertyBlock(createDefaultCubePropertySelectionState(), blockId),
  )

  if (resolution.values === null) {
    throw new RangeError(`fixture block did not resolve: ${blockId}`)
  }
  return resolution.values
}

function endpointFor(fixture: EndpointFixture, mode: 'standard' | 'java') {
  const numerics = mode === 'java' ? javaPrecisionNumerics : standardNumerics
  const eyeHeight =
    mode === 'java'
      ? Math.fround(je26_2Constants.standingPlayerEyeHeight.value)
      : je26_2Constants.standingPlayerEyeHeight.value
  const { diagnostic, melee } = createEvaluationInputs(fixture, eyeHeight)
  const properties = resolvedProperties(fixture.absorbedBlock)
  const javaAim =
    mode === 'java'
      ? deriveJe26_2PlayerAim(diagnostic.attackerEyePosition, diagnostic.aimPoint)
      : null
  const yaw =
    javaAim?.yawDegrees ?? deriveMinecraftYawDegreesFromAim(diagnostic, 0, standardNumerics)
  const trajectoryTicks = findDefaultPlayerMeleeTrajectoryTicks(
    diagnostic,
    melee,
    yaw,
    numerics,
    properties,
    javaAim?.lookDirection,
  )
  const evaluation = evaluatePlayerMeleeInputs(
    { ...diagnostic, trajectoryTicks },
    melee,
    yaw,
    numerics,
    properties,
    javaAim?.lookDirection,
  )

  return evaluation.trajectory.endpoint.feetPosition
}

describe('je 26.2 Java-precision numerics', () => {
  it('uses source Float32 boundaries without changing Java double primitives', () => {
    expect(javaPrecisionNumerics.sourceFloat(1 / 3)).toBe(Math.fround(1 / 3))
    expect(javaPrecisionNumerics.sqrt(2)).toBe(Math.sqrt(2))
    expect(Math.fround(javaPrecisionNumerics.sqrt(Math.fround(2)))).toBe(1.4142135381698608)
  })

  it('reproduces the quantized sine table, including negative lookup indices', () => {
    expect(minecraftSin(0)).toBe(0)
    expect(minecraftCos(0)).toBe(1)
    expect(minecraftSin(1)).toBe(0.8414514064788818)
    expect(minecraftSin(-1)).toBe(-0.8414514064788818)
    expect(minecraftCos(-1)).toBe(0.540252149105072)
    expect(minecraftSin(Math.PI * 2)).toBe(0)
  })

  it('reproduces float wrapDegrees at and around its branch boundary', () => {
    expect(minecraftWrapDegreesFloat(180)).toBe(-180)
    expect(minecraftWrapDegreesFloat(-180)).toBe(-180)
    expect(minecraftWrapDegreesFloat(179.99999)).toBe(179.99998474121094)
    expect(minecraftWrapDegreesFloat(180.00001)).toBe(-179.99998474121094)
    expect(minecraftWrapDegreesFloat(-180.00001)).toBe(179.99998474121094)
  })

  it('keeps the Mth atan2 approximation inside the command-facing adapter', () => {
    expect(minecraftAtan2(1, 1)).toBe(0.7853981366411399)
    expect(javaPrecisionNumerics.atan2(1, 1)).toBe(Math.PI / 4)
  })

  it('reconstructs Entity lookAt rotation and calculateViewVector', () => {
    const result = deriveJe26_2PlayerAim(
      { x: 0, y: 1.62, z: 0 },
      { x: 1, y: 0.4, z: 2 },
    )

    expect(result.pitchDegrees).toBe(28.616657257080078)
    expect(result.yawDegrees).toBe(-26.565032958984375)
    expect(result.lookDirection).toEqual({
      x: 0.39259248971939087,
      y: -0.47890472412109375,
      z: 0.7851887941360474,
    })
    expect(calculateJe26_2ViewVector(result.pitchDegrees, result.yawDegrees)).toEqual(
      result.lookDirection,
    )
  })

  it('preserves the source vertical-look and signed-zero branch behavior', () => {
    expect(
      deriveJe26_2PlayerAim({ x: 0, y: 1.62, z: 0 }, { x: 0, y: 4, z: 0 }),
    ).toEqual({
      pitchDegrees: -90,
      yawDegrees: -90,
      lookDirection: { x: 0, y: 1, z: 0 },
    })
    expect(Object.is(minecraftAtan2(-0, 1), 0)).toBe(true)
    expect(Object.is(minecraftAtan2(0, -0), 0)).toBe(true)
  })

  it('uses the Float32 Vec3 normalization cutoff with the source strict comparison', () => {
    const cutoff = Math.fround(1e-5)

    expect(normalizeVec3({ x: cutoff / 2, y: 0, z: 0 }, javaPrecisionNumerics, cutoff)).toEqual(
      { x: 0, y: 0, z: 0 },
    )
    expect(normalizeVec3({ x: cutoff, y: 0, z: 0 }, javaPrecisionNumerics, cutoff)).toEqual({
      x: 1,
      y: 0,
      z: 0,
    })
  })
})

describe('je 26.2 in-game melee endpoint validation', () => {
  it('contains all 100 completed experiment rows', () => {
    expect(endpointFixtures).toHaveLength(100)
    expect(endpointFixtures.map(({ row }) => row)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1),
    )
  })

  it('keeps Standard-mode endpoints stable to the recorded six-decimal outputs', () => {
    for (const fixture of endpointFixtures) {
      const endpoint = endpointFor(fixture, 'standard')

      expect(endpoint.x, `row ${fixture.row} X`).toBeCloseTo(fixture.standardEndpoint[0], 6)
      expect(endpoint.y, `row ${fixture.row} Y`).toBeCloseTo(fixture.standardEndpoint[1], 6)
      expect(endpoint.z, `row ${fixture.row} Z`).toBeCloseTo(fixture.standardEndpoint[2], 6)
    }
  })

  it('matches all observed Java endpoints at full stored precision', () => {
    for (const fixture of endpointFixtures) {
      const endpoint = endpointFor(fixture, 'java')

      expect(endpoint.x, `row ${fixture.row} X`).toBe(fixture.observedEndpoint[0])
      expect(endpoint.y, `row ${fixture.row} Y`).toBe(fixture.observedEndpoint[1])
      expect(endpoint.z, `row ${fixture.row} Z`).toBe(fixture.observedEndpoint[2])
    }
  })

  it.each([44, 85, 93, 94, 97])('locks named extreme row %i', (row) => {
    const fixture = endpointFixtures[row - 1]!
    const endpoint = endpointFor(fixture, 'java')

    expect([endpoint.x, endpoint.y, endpoint.z]).toEqual(fixture.observedEndpoint)
  })
})
