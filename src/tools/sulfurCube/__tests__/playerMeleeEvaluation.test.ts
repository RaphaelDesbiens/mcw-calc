import { describe, expect, it } from 'vitest'
import { projectVectorToRadialPlane } from '../presentation/radialPlane'
import { createRadialScenePresentation, launchVectorDisplayLength } from '../presentation/scene'
import { createMilestone1DefaultInputs, evaluateDiagnosticInputs } from '../presets/diagnostic'
import {
  createDefaultPlayerMeleeInputs,
  deriveMinecraftYawDegreesFromAim,
  evaluatePlayerMeleeInputs,
  findDefaultPlayerMeleeTrajectoryTicks,
} from '../presets/playerMelee'

describe('full-tool primary player melee evaluation', () => {
  it('preserves the existing one-call launch for the default bare-hand attack', () => {
    const diagnosticInputs = createMilestone1DefaultInputs()
    const yaw = deriveMinecraftYawDegreesFromAim(diagnosticInputs, 0)
    const existing = evaluateDiagnosticInputs(diagnosticInputs)
    const melee = evaluatePlayerMeleeInputs(diagnosticInputs, createDefaultPlayerMeleeInputs(), yaw)

    expect(Math.abs(yaw)).toBe(180)
    expect(melee.attackResolution.operations).toHaveLength(1)
    expect(melee.attackResolution.diagnostics.damageArgument).toBe(1)
    expect(melee.launchVelocity).toEqual(existing.launchVelocity)
    expect(melee.trajectory).toEqual(existing.trajectory)
  })

  it('keeps a Knockback II sprint hit as two cumulative calls', () => {
    const diagnosticInputs = createMilestone1DefaultInputs()
    const melee = evaluatePlayerMeleeInputs(
      diagnosticInputs,
      {
        ...createDefaultPlayerMeleeInputs(),
        weaponPresetId: 'ironSword',
        sprinting: true,
        knockbackEnchantmentLevel: 2,
      },
      deriveMinecraftYawDegreesFromAim(diagnosticInputs, 0),
    )

    expect(melee.attackResolution.diagnostics).toMatchObject({
      damageArgument: 6,
      combinedKnockback: 1.5,
      effectFactor: 0.375,
    })
    expect(melee.operationSequence.operationResults).toHaveLength(2)
    expect(melee.operationSequence.operationResults[1].existingVelocity).toEqual(
      melee.operationSequence.operationResults[0].resultingVelocity,
    )
    expect(melee.launchVelocity).toEqual(melee.operationSequence.resultingVelocity)
    expect(melee.launchVelocity).not.toEqual(melee.callResult.resultingVelocity)
    expect(melee.trajectory.initialVelocity).toEqual(melee.launchVelocity)

    const scene = createRadialScenePresentation(melee)
    const projectedLaunch = projectVectorToRadialPlane(melee.launchVelocity, scene.projection)
    expect(scene.launchDisplayLength).toBeCloseTo(
      launchVectorDisplayLength(Math.hypot(projectedLaunch.x, projectedLaunch.y)),
      12,
    )
  })

  it('derives critical status rather than accepting the requested conditions as sufficient', () => {
    const diagnosticInputs = createMilestone1DefaultInputs()
    const yaw = deriveMinecraftYawDegreesFromAim(diagnosticInputs, 0)
    const airborne = evaluatePlayerMeleeInputs(
      diagnosticInputs,
      {
        ...createDefaultPlayerMeleeInputs(),
        weaponPresetId: 'ironSword',
        criticalHitConditions: true,
      },
      yaw,
    )
    const sprinting = evaluatePlayerMeleeInputs(
      diagnosticInputs,
      {
        ...createDefaultPlayerMeleeInputs(),
        weaponPresetId: 'ironSword',
        criticalHitConditions: true,
        sprinting: true,
      },
      yaw,
    )

    expect(airborne.attackResolution.diagnostics.critical).toBe(true)
    expect(airborne.attackResolution.diagnostics.damageArgument).toBe(9)
    expect(sprinting.attackResolution.diagnostics.critical).toBe(false)
    expect(sprinting.attackResolution.diagnostics.criticalEligibilityFailures).toContain(
      'sprinting',
    )
  })

  it('retains the previous yaw at a vertically aimed look-direction singularity', () => {
    const inputs = createMilestone1DefaultInputs()

    expect(
      deriveMinecraftYawDegreesFromAim(
        {
          ...inputs,
          aimPoint: {
            x: inputs.attackerEyePosition.x,
            y: inputs.attackerEyePosition.y + 3,
            z: inputs.attackerEyePosition.z,
          },
        },
        -37.5,
      ),
    ).toBe(-37.5)
  })

  it('finds the default two-block-drop horizon from the cumulative velocity', () => {
    const inputs = createMilestone1DefaultInputs()
    const meleeInputs = {
      ...createDefaultPlayerMeleeInputs(),
      weaponPresetId: 'ironSword' as const,
      sprinting: true,
      knockbackEnchantmentLevel: 2 as const,
    }
    const yaw = deriveMinecraftYawDegreesFromAim(inputs, 0)
    const tickCount = findDefaultPlayerMeleeTrajectoryTicks(inputs, meleeInputs, yaw)
    const previous = evaluatePlayerMeleeInputs(
      { ...inputs, trajectoryTicks: tickCount - 1 },
      meleeInputs,
      yaw,
    )
    const current = evaluatePlayerMeleeInputs(
      { ...inputs, trajectoryTicks: tickCount },
      meleeInputs,
      yaw,
    )
    const targetY = inputs.cubeFeetPosition.y - 2

    expect(previous.trajectory.resultingPosition.y).toBeGreaterThan(targetY)
    expect(current.trajectory.resultingPosition.y).toBeLessThanOrEqual(targetY)
  })
})
