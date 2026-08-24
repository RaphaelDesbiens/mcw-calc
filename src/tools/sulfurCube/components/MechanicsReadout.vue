<script setup lang="ts">
import type { DiagnosticEvaluation } from '../presets/diagnostic'
import { CdxAccordion } from '@wikimedia/codex'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface ReadoutRow {
  readonly label: string
  readonly symbol?: string
  readonly value: string
}

const props = defineProps<{
  evaluation: DiagnosticEvaluation
}>()

const { locale, t } = useI18n()

const numberFormatter = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      maximumFractionDigits: 6,
      minimumFractionDigits: 0,
      useGrouping: false,
    }),
)

function formatNumber(value: number): string {
  const normalized = Object.is(value, -0) ? 0 : value

  if (normalized !== 0 && (Math.abs(normalized) < 0.000001 || Math.abs(normalized) >= 1000000)) {
    return normalized.toExponential(4)
  }

  return numberFormatter.value.format(normalized)
}

function formatRadians(value: number): string {
  return t('sulfurCube.readout.angleValue', {
    radians: formatNumber(value),
    degrees: formatNumber((value * 180) / Math.PI),
  })
}

function formatPair(first: number, second: number): string {
  return `(${formatNumber(first)}, ${formatNumber(second)})`
}

function formatVector(x: number, y: number, z: number): string {
  return `(${formatNumber(x)}, ${formatNumber(y)}, ${formatNumber(z)})`
}

const summaryRows = computed<readonly ReadoutRow[]>(() => {
  const { launchSummary, callResult } = props.evaluation

  return [
    {
      label: t('sulfurCube.readout.totalSpeed'),
      value: t('sulfurCube.readout.blocksPerTick', {
        value: formatNumber(launchSummary.totalSpeed),
      }),
    },
    {
      label: t('sulfurCube.readout.horizontalSpeed'),
      value: t('sulfurCube.readout.blocksPerTick', {
        value: formatNumber(launchSummary.horizontalSpeed),
      }),
    },
    {
      label: t('sulfurCube.readout.elevation'),
      value: formatRadians(launchSummary.elevationAngle),
    },
    {
      label: t('sulfurCube.readout.horizontalDirection'),
      value: formatPair(launchSummary.horizontalDirection.x, launchSummary.horizontalDirection.y),
    },
    {
      label: t('sulfurCube.readout.addedVelocity'),
      value: formatVector(
        callResult.addedVelocity.x,
        callResult.addedVelocity.y,
        callResult.addedVelocity.z,
      ),
    },
    {
      label: t('sulfurCube.readout.resultingVelocity'),
      value: formatVector(
        callResult.resultingVelocity.x,
        callResult.resultingVelocity.y,
        callResult.resultingVelocity.z,
      ),
    },
  ]
})

const geometryRows = computed<readonly ReadoutRow[]>(() => {
  const values = props.evaluation.callResult.diagnostics

  return [
    {
      label: t('sulfurCube.readout.verticalAimFactor'),
      symbol: 'q',
      value: formatNumber(values.q),
    },
    {
      label: t('sulfurCube.readout.feetElevationAngle'),
      symbol: 'θ',
      value: formatRadians(values.theta),
    },
    {
      label: t('sulfurCube.readout.horizontalAimDifference'),
      symbol: 'δ',
      value: formatRadians(values.horizontalAngleDelta),
    },
    {
      label: t('sulfurCube.readout.transformedDirection'),
      symbol: 'D′',
      value: formatPair(
        values.transformedHorizontalDirection.x,
        values.transformedHorizontalDirection.y,
      ),
    },
    {
      label: t('sulfurCube.readout.normalizedDirection'),
      value: formatPair(
        values.normalizedHorizontalDirection.x,
        values.normalizedHorizontalDirection.y,
      ),
    },
  ]
})

const powerRows = computed<readonly ReadoutRow[]>(() => {
  const values = props.evaluation.callResult.diagnostics

  return [
    {
      label: t('sulfurCube.readout.basePower'),
      symbol: '(H₀, V₀)',
      value: formatPair(values.h0, values.v0),
    },
    {
      label: t('sulfurCube.readout.aimTransferredPower'),
      symbol: '(H₁, V₁)',
      value: formatPair(values.h1, values.v1),
    },
    {
      label: t('sulfurCube.readout.elevationRotatedPower'),
      symbol: '(H₂, V₂)',
      value: formatPair(values.h2, values.v2),
    },
    {
      label: t('sulfurCube.readout.cappedPower'),
      symbol: '(H₃, V₃)',
      value: formatPair(values.h3, values.v3),
    },
  ]
})

const capRows = computed<readonly ReadoutRow[]>(() => {
  const values = props.evaluation.callResult.diagnostics

  return [
    { label: t('sulfurCube.readout.horizontalRatio'), value: formatNumber(values.horizontalRatio) },
    { label: t('sulfurCube.readout.verticalRatio'), value: formatNumber(values.verticalRatio) },
    { label: t('sulfurCube.readout.maximumRatio'), value: formatNumber(values.maxRatio) },
    { label: t('sulfurCube.readout.capFactor'), value: formatNumber(values.capFactor) },
  ]
})

const scalingRows = computed<readonly ReadoutRow[]>(() => {
  const values = props.evaluation.callResult.diagnostics

  return [
    {
      label: t('sulfurCube.readout.damageArgument'),
      value: formatNumber(props.evaluation.callResult.input.call.damageArgument),
    },
    {
      label: t('sulfurCube.readout.damageSquareRoot'),
      value: formatNumber(values.damageSquareRoot),
    },
    {
      label: t('sulfurCube.readout.effectFactor'),
      symbol: 'E',
      value: formatNumber(values.effectFactor),
    },
    {
      label: t('sulfurCube.readout.knockbackResistance'),
      symbol: 'R',
      value: formatNumber(props.evaluation.callResult.input.context.properties.knockbackResistance),
    },
    {
      label: t('sulfurCube.readout.resistanceFactor'),
      symbol: '(1 − R)',
      value: formatNumber(values.resistanceFactor),
    },
    { label: t('sulfurCube.readout.multiplier'), symbol: 'M', value: formatNumber(values.m) },
    {
      label: t('sulfurCube.readout.scaledPower'),
      symbol: '(Hᴹ, Vᴹ)',
      value: formatPair(values.hM, values.vM),
    },
  ]
})

const finalRows = computed<readonly ReadoutRow[]>(() => {
  const values = props.evaluation.callResult.diagnostics

  return [
    {
      label: t('sulfurCube.readout.horizontalBeforeClamp'),
      value: formatNumber(values.horizontalBeforeClamp),
    },
    {
      label: t('sulfurCube.readout.horizontalResult'),
      value: formatNumber(values.horizontalResult),
    },
    {
      label: t('sulfurCube.readout.verticalBeforeClamp'),
      value: formatNumber(values.verticalBeforeClamp),
    },
    { label: t('sulfurCube.readout.verticalResult'), value: formatNumber(values.verticalResult) },
  ]
})

const trajectoryRows = computed<readonly ReadoutRow[]>(() => {
  const trajectory = props.evaluation.trajectory

  return [
    { label: t('sulfurCube.readout.tickHorizon'), value: formatNumber(trajectory.ticks.length) },
    { label: t('sulfurCube.readout.gravity'), value: formatNumber(trajectory.assumptions.gravity) },
    { label: t('sulfurCube.readout.drag'), value: formatNumber(trajectory.assumptions.drag) },
    {
      label: t('sulfurCube.readout.cutoff'),
      value: formatNumber(trajectory.assumptions.movementCutoff),
    },
    {
      label: t('sulfurCube.readout.finalPosition'),
      value: formatVector(
        trajectory.resultingPosition.x,
        trajectory.resultingPosition.y,
        trajectory.resultingPosition.z,
      ),
    },
    {
      label: t('sulfurCube.readout.finalVelocity'),
      value: formatVector(
        trajectory.resultingVelocity.x,
        trajectory.resultingVelocity.y,
        trajectory.resultingVelocity.z,
      ),
    },
  ]
})

const readoutSections = computed(() => [
  { id: 'geometry', title: t('sulfurCube.readout.geometry'), rows: geometryRows.value },
  { id: 'power', title: t('sulfurCube.readout.powerStages'), rows: powerRows.value },
  { id: 'cap', title: t('sulfurCube.readout.cap'), rows: capRows.value },
  { id: 'scaling', title: t('sulfurCube.readout.scaling'), rows: scalingRows.value },
  { id: 'final', title: t('sulfurCube.readout.finalScalars'), rows: finalRows.value },
  { id: 'trajectory', title: t('sulfurCube.readout.trajectory'), rows: trajectoryRows.value },
])
</script>

<template>
  <section class="mechanics-readout" aria-labelledby="sulfur-cube-results-title">
    <h3 id="sulfur-cube-results-title" class="mechanics-readout__title">
      {{ t('sulfurCube.readout.title') }}
    </h3>

    <dl class="summary-grid">
      <div v-for="row in summaryRows" :key="row.label" class="summary-grid__item">
        <dt>{{ row.label }}</dt>
        <dd>{{ row.value }}</dd>
      </div>
    </dl>

    <CdxAccordion open>
      <template #title>{{ t('sulfurCube.readout.details') }}</template>

      <div class="readout-sections">
        <table v-for="section in readoutSections" :key="section.id" class="readout-table">
          <caption>
            {{
              section.title
            }}
          </caption>
          <tbody>
            <tr v-for="row in section.rows" :key="`${section.id}-${row.label}`">
              <th scope="row">
                {{ row.label }}
                <code v-if="row.symbol">{{ row.symbol }}</code>
              </th>
              <td>{{ row.value }}</td>
            </tr>
          </tbody>
        </table>

        <section class="provenance" aria-labelledby="sulfur-cube-provenance-title">
          <h4 id="sulfur-cube-provenance-title">
            {{ t('sulfurCube.readout.provenance') }}
          </h4>
          <ul>
            <li>{{ t('sulfurCube.readout.provenanceBehavior') }}</li>
            <li>{{ t('sulfurCube.readout.provenanceData') }}</li>
            <li>{{ t('sulfurCube.readout.standardMath') }}</li>
          </ul>
        </section>
      </div>
    </CdxAccordion>
  </section>
</template>

<style scoped>
.mechanics-readout {
  min-width: 0;
}

.mechanics-readout__title {
  margin: 0 0 0.75rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin: 0 0 1rem;
}

.summary-grid__item {
  min-width: 0;
  padding: 0.625rem;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: 2px;
  background: var(--background-color-interactive-subtle, #f8f9fa);
}

.summary-grid dt {
  color: var(--color-subtle, #54595d);
  font-size: 0.875em;
}

.summary-grid dd {
  margin: 0.125rem 0 0;
  overflow-wrap: anywhere;
  font-family: monospace;
  font-variant-numeric: tabular-nums;
}

.readout-sections {
  display: grid;
  gap: 1rem;
}

.readout-table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

.readout-table caption {
  padding-bottom: 0.25rem;
  font-weight: 700;
  text-align: left;
}

.readout-table th,
.readout-table td {
  padding: 0.3rem 0.4rem;
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
  text-align: left;
  vertical-align: top;
}

.readout-table th {
  width: 54%;
  font-weight: 400;
}

.readout-table td {
  overflow-wrap: anywhere;
  font-family: monospace;
}

.readout-table code {
  display: inline-block;
  margin-left: 0.25rem;
  white-space: nowrap;
}

.provenance h4 {
  margin-top: 0;
}

.provenance ul {
  margin: 0.25rem 0 0;
  padding-left: 1.5rem;
}

@media (max-width: 32rem) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .readout-table th,
  .readout-table td {
    display: block;
    width: auto;
  }

  .readout-table td {
    padding-top: 0;
    border-top: 0;
  }
}
</style>
