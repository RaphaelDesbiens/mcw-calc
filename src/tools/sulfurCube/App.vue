<script setup lang="ts">
import type { DiagnosticFormState, DiagnosticPresetSelection } from './components/types'
import type { DiagnosticEvaluation, DiagnosticPresetId } from './presets/diagnostic'
import { CdxMessage } from '@wikimedia/codex'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'
import ControlsPanel from './components/ControlsPanel.vue'
import { createDiagnosticFormState, parseDiagnosticFormState } from './components/formState'
import MechanicsReadout from './components/MechanicsReadout.vue'
import { evaluateDiagnosticInputs, getDiagnosticPreset } from './presets/diagnostic'

const defaultPresetId: DiagnosticPresetId = 'M1'

const { t } = useI18n()
const selectedPreset = ref<DiagnosticPresetSelection>(defaultPresetId)
const formState = ref<DiagnosticFormState>(
  createDiagnosticFormState(getDiagnosticPreset(defaultPresetId).inputs),
)

const evaluation = computed<DiagnosticEvaluation | null>(() => {
  try {
    return evaluateDiagnosticInputs(parseDiagnosticFormState(formState.value))
  } catch {
    return null
  }
})

function applyPreset(selection: DiagnosticPresetSelection): void {
  selectedPreset.value = selection

  if (selection === 'custom') {
    return
  }

  formState.value = createDiagnosticFormState(getDiagnosticPreset(selection).inputs)
}

function updateFormState(value: DiagnosticFormState): void {
  formState.value = value
  selectedPreset.value = 'custom'
}

function reset(): void {
  applyPreset(defaultPresetId)
}
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('sulfurCube.title') }}
    </template>

    <div class="sulfur-cube-tool">
      <CdxMessage type="notice">
        {{ t('sulfurCube.scope') }}
      </CdxMessage>

      <div class="assumptions">
        <p>{{ t('sulfurCube.assumptions.intro') }}</p>
        <ul>
          <li>{{ t('sulfurCube.assumptions.call') }}</li>
          <li>{{ t('sulfurCube.assumptions.cube') }}</li>
          <li>{{ t('sulfurCube.assumptions.aim') }}</li>
          <li>{{ t('sulfurCube.assumptions.trajectory') }}</li>
        </ul>
      </div>

      <div class="tool-grid">
        <ControlsPanel
          :model-value="formState"
          :selected-preset="selectedPreset"
          @update:model-value="updateFormState"
          @select-preset="applyPreset"
          @reset="reset"
        />

        <div class="results-column" aria-live="polite">
          <MechanicsReadout v-if="evaluation" :evaluation="evaluation" />
          <CdxMessage v-else type="warning">
            {{ t('sulfurCube.invalidInputs') }}
          </CdxMessage>
        </div>
      </div>
    </div>
  </CalcField>
</template>

<style scoped>
.sulfur-cube-tool {
  display: grid;
  gap: 1rem;
  margin-top: 0.75rem;
}

.assumptions p {
  margin: 0;
}

.assumptions ul {
  margin: 0.25rem 0 0;
  padding-left: 1.5rem;
}

.tool-grid {
  display: grid;
  grid-template-columns: minmax(18rem, 0.8fr) minmax(22rem, 1.2fr);
  gap: 1.5rem;
  align-items: start;
}

.results-column {
  min-width: 0;
}

@media (max-width: 52rem) {
  .tool-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
