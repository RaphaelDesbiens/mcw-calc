import type { Vec3 } from '../model/types'
import { describe, expect, it } from 'vitest'
import { createDiagnosticFormState, parseDiagnosticFormState } from '../components/formState'
import {
  diagnosticPresets,
  evaluateDiagnosticInputs,
  getDiagnosticPreset,
} from '../presets/diagnostic'
import { directMeleeFixtures } from './experimentFixtures'

const standardExperimentTolerance = 0.00015

function expectVec3Within(actual: Vec3, expected: Vec3, tolerance: number): void {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.z - expected.z)).toBeLessThanOrEqual(tolerance)
}

describe('stage 3 diagnostic orchestration', () => {
  it.each(diagnosticPresets)('reproduces the $id direct-melee fixture', (preset) => {
    const fixture = directMeleeFixtures.find((candidate) => candidate.id.startsWith(preset.id))
    const evaluation = evaluateDiagnosticInputs({ ...preset.inputs, trajectoryTicks: 10 })

    expect(fixture).toBeDefined()
    expectVec3Within(
      evaluation.callResult.addedVelocity,
      fixture!.expectedAddedVelocity,
      standardExperimentTolerance,
    )
  })

  it('summarizes the M1 launch and requested trajectory horizon', () => {
    const evaluation = evaluateDiagnosticInputs({
      ...getDiagnosticPreset('M1').inputs,
      trajectoryTicks: 10,
    })

    expect(evaluation.launchSummary.horizontalSpeed).toBeCloseTo(0.165, 12)
    expect(evaluation.launchSummary.totalSpeed).toBeCloseTo(0.41244271, 7)
    expect(evaluation.launchSummary.horizontalDirection).toEqual({ x: 0, y: -1 })
    expect(evaluation.trajectory.ticks).toHaveLength(10)
    expect(evaluation.trajectory.resultingPosition).toEqual(
      evaluation.trajectory.ticks[9].resultingPosition,
    )
  })

  it('keeps feet and eye positions independently supplied', () => {
    const preset = getDiagnosticPreset('M1')
    const evaluation = evaluateDiagnosticInputs({
      ...preset.inputs,
      attackerFeetPosition: { ...preset.inputs.attackerFeetPosition, y: 3 },
      attackerEyePosition: { ...preset.inputs.attackerEyePosition, y: 1.7 },
    })

    expect(evaluation.callResult.input.context.attacker.feetPosition.y).toBe(3)
    expect(evaluation.callResult.input.context.attacker.eyePosition.y).toBe(1.7)
  })

  it('does not mutate shared preset inputs', () => {
    const preset = getDiagnosticPreset('M2')
    const before = JSON.parse(JSON.stringify(preset))

    evaluateDiagnosticInputs(preset.inputs)

    expect(preset).toEqual(before)
  })

  it('round-trips a preset through the numeric form boundary', () => {
    const inputs = getDiagnosticPreset('M6').inputs

    expect(parseDiagnosticFormState(createDiagnosticFormState(inputs))).toEqual(inputs)
  })

  it('rejects incomplete numeric fields at the form boundary', () => {
    const form = createDiagnosticFormState(getDiagnosticPreset('M1').inputs)

    expect(() => parseDiagnosticFormState({ ...form, damageArgument: '' })).toThrow(/empty/)
    expect(() => parseDiagnosticFormState({ ...form, aimY: 'not-a-number' })).toThrow(/finite/)
  })

  it('rejects invalid product-facing inputs before rendering', () => {
    const preset = getDiagnosticPreset('M1')

    expect(() => evaluateDiagnosticInputs({ ...preset.inputs, damageArgument: -1 })).toThrow(
      /damageArgument/,
    )
    expect(() => evaluateDiagnosticInputs({ ...preset.inputs, trajectoryTicks: 201 })).toThrow(
      /trajectoryTicks/,
    )
    expect(() =>
      evaluateDiagnosticInputs({
        ...preset.inputs,
        attackerEyePosition: { ...preset.inputs.attackerEyePosition, x: Number.NaN },
      }),
    ).toThrow(/finite/)
    expect(() =>
      evaluateDiagnosticInputs({
        ...preset.inputs,
        aimPoint: preset.inputs.attackerEyePosition,
      }),
    ).toThrow(/look direction/)
  })
})
