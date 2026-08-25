<script setup lang="ts">
import type { DiagnosticFormState } from './components/types'
import type { Vec3 } from './model/types'
import type { DiagnosticEvaluation } from './presets/diagnostic'
import { CdxAccordion, CdxMessage } from '@wikimedia/codex'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'
import ControlsPanel from './components/ControlsPanel.vue'
import {
  createDiagnosticFormState,
  parseDiagnosticFormState,
  resetAttackerEyeToStandingPresetInFormState,
  translateAttackerForFeetFormEdit,
  translateAttackerInFormState,
  translateCubeInFormState,
  updateAimPointInFormState,
} from './components/formState'
import MechanicsReadout from './components/MechanicsReadout.vue'
import PowerSpaceDiagram from './components/PowerSpaceDiagram.vue'
import SulfurCubeScene from './components/SulfurCubeScene.vue'
import {
  createMilestone1DefaultInputs,
  evaluateDiagnosticInputs,
  findDefaultTrajectoryTicks,
} from './presets/diagnostic'

const defaultInputs = createMilestone1DefaultInputs()

const { t } = useI18n()
const sceneSize = ref<'regular' | 'compact'>('regular')
const formState = ref<DiagnosticFormState>(createDiagnosticFormState(defaultInputs))

const evaluation = computed<DiagnosticEvaluation | null>(() => {
  try {
    return evaluateDiagnosticInputs(parseDiagnosticFormState(formState.value))
  } catch {
    return null
  }
})

function updateFormState(value: DiagnosticFormState): void {
  formState.value = value
}

function updateFormStateFromControls(value: DiagnosticFormState): void {
  formState.value = translateAttackerForFeetFormEdit(formState.value, value)
}

function reset(): void {
  formState.value = createDiagnosticFormState(defaultInputs)
}

function resetTrajectoryTicksDefault(): void {
  let trajectoryTicks: number

  try {
    trajectoryTicks = findDefaultTrajectoryTicks(parseDiagnosticFormState(formState.value))
  } catch {
    return
  }

  updateFormState({
    ...formState.value,
    trajectoryTicks,
  })
}

function resetAttackerEyeStanding(): void {
  try {
    updateFormState(resetAttackerEyeToStandingPresetInFormState(formState.value))
  } catch {
    // Ignore until numeric fields are valid enough to derive the preset eye position.
  }
}

function updateAimPoint(point: Vec3): void {
  updateFormState(updateAimPointInFormState(formState.value, point))
}

function translateAttacker(delta: Vec3): void {
  updateFormState(translateAttackerInFormState(formState.value, delta))
}

function translateCube(delta: Vec3): void {
  updateFormState(translateCubeInFormState(formState.value, delta))
}
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('sulfurCube.title') }}
    </template>

    <div class="sulfur-cube-tool" lang="en">
      <CdxMessage type="notice">
        {{ t('sulfurCube.scope') }}
      </CdxMessage>

      <div class="interaction-grid" :class="`interaction-grid--${sceneSize}`">
        <ControlsPanel
          class="interaction-grid__controls"
          :model-value="formState"
          @update:model-value="updateFormStateFromControls"
          @reset-attacker-eye-standing="resetAttackerEyeStanding"
          @reset-trajectory-ticks-default="resetTrajectoryTicksDefault"
          @reset="reset"
        />

        <SulfurCubeScene
          v-if="evaluation"
          v-model:scene-size="sceneSize"
          class="interaction-grid__scene"
          :evaluation="evaluation"
          @update-aim-point="updateAimPoint"
          @translate-attacker="translateAttacker"
          @translate-cube="translateCube"
        />

        <CdxMessage v-else class="interaction-grid__scene" type="warning">
          {{ t('sulfurCube.invalidInputs') }}
        </CdxMessage>

        <PowerSpaceDiagram
          v-if="evaluation"
          class="interaction-grid__power"
          :evaluation="evaluation"
        />

        <MechanicsReadout
          v-if="evaluation"
          class="interaction-grid__readout"
          :evaluation="evaluation"
          :show-details="false"
          :summary-layout="sceneSize === 'compact' ? 'single' : 'grid'"
        />

        <MechanicsReadout
          v-if="evaluation"
          class="interaction-grid__details"
          :evaluation="evaluation"
          :show-summary="false"
        />
      </div>

      <CdxAccordion class="assumptions-disclosure" separation="outline">
        <template #title>{{ t('sulfurCube.assumptions.title') }}</template>

        <div class="assumptions">
          <p>{{ t('sulfurCube.assumptions.intro') }}</p>
          <ul>
            <li>{{ t('sulfurCube.assumptions.call') }}</li>
            <li>{{ t('sulfurCube.assumptions.cube') }}</li>
            <li>{{ t('sulfurCube.assumptions.aim') }}</li>
            <li>{{ t('sulfurCube.assumptions.trajectory') }}</li>
          </ul>
        </div>
      </CdxAccordion>
    </div>
  </CalcField>
</template>

<style scoped>
.sulfur-cube-tool {
  display: grid;
  gap: 1rem;
  min-width: 0;
  max-width: 100%;
  margin-top: 0.75rem;
}

:global(html.sulfur-cube-embedded),
:global(html.sulfur-cube-embedded body) {
  overflow: hidden;
}

.assumptions p {
  margin: 0;
}

.assumptions ul {
  margin: 0.25rem 0 0;
  padding-left: 1.5rem;
}

.interaction-grid {
  display: grid;
  gap: 1.5rem;
  align-items: start;
  min-width: 0;
  max-width: 100%;
}

.interaction-grid > * {
  min-width: 0;
}

.interaction-grid--regular {
  grid-template-areas:
    'scene scene'
    'controls power'
    'readout readout'
    'details details';
  grid-template-columns: minmax(18rem, 0.8fr) minmax(22rem, 1.2fr);
}

.interaction-grid--compact {
  grid-template-areas:
    'power scene'
    'controls readout'
    'details details';
  grid-template-columns: minmax(18rem, 0.85fr) minmax(22rem, 1.15fr);
}

.interaction-grid__controls {
  grid-area: controls;
}

.interaction-grid__scene {
  grid-area: scene;
}

.interaction-grid__power {
  grid-area: power;
}

.interaction-grid__readout {
  grid-area: readout;
}

.interaction-grid__details {
  grid-area: details;
}

@media (max-width: 52rem) {
  .interaction-grid,
  .interaction-grid--regular,
  .interaction-grid--compact {
    grid-template-areas:
      'scene'
      'power'
      'controls'
      'readout'
      'details';
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
