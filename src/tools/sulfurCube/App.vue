<script setup lang="ts">
import type { DiagnosticFormState, DiagnosticPresetSelection } from './components/types'
import type { Vec3 } from './model/types'
import type { DiagnosticEvaluation, DiagnosticPresetId } from './presets/diagnostic'
import { CdxAccordion, CdxMessage } from '@wikimedia/codex'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'
import ControlsPanel from './components/ControlsPanel.vue'
import {
  createDiagnosticFormState,
  parseDiagnosticFormState,
  translateAttackerInFormState,
  translateCubeInFormState,
  updateAimPointInFormState,
} from './components/formState'
import MechanicsReadout from './components/MechanicsReadout.vue'
import PowerSpaceDiagram from './components/PowerSpaceDiagram.vue'
import SulfurCubeScene from './components/SulfurCubeScene.vue'
import { evaluateDiagnosticInputs, getDiagnosticPreset } from './presets/diagnostic'

const defaultPresetId: DiagnosticPresetId = 'M1'

const { t } = useI18n()
const selectedPreset = ref<DiagnosticPresetSelection>(defaultPresetId)
const sceneSize = ref<'regular' | 'compact'>('regular')
const sceneObjectDragActive = ref(false)
const sceneChangedDuringDrag = ref(false)
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
  sceneObjectDragActive.value = false
  sceneChangedDuringDrag.value = false
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

function updateAimPoint(point: Vec3): void {
  updateFormStateFromScene(updateAimPointInFormState(formState.value, point))
}

function translateAttacker(delta: Vec3): void {
  updateFormStateFromScene(translateAttackerInFormState(formState.value, delta))
}

function translateCube(delta: Vec3): void {
  updateFormStateFromScene(translateCubeInFormState(formState.value, delta))
}

function updateFormStateFromScene(value: DiagnosticFormState): void {
  formState.value = value

  if (sceneObjectDragActive.value) {
    sceneChangedDuringDrag.value = true
  } else {
    selectedPreset.value = 'custom'
  }
}

function setSceneObjectDragActive(active: boolean): void {
  sceneObjectDragActive.value = active

  if (!active && sceneChangedDuringDrag.value) {
    selectedPreset.value = 'custom'
    sceneChangedDuringDrag.value = false
  }
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

      <div class="interaction-grid" :class="`interaction-grid--${sceneSize}`">
        <ControlsPanel
          class="interaction-grid__controls"
          :model-value="formState"
          :selected-preset="selectedPreset"
          @update:model-value="updateFormState"
          @select-preset="applyPreset"
          @reset="reset"
        />

        <SulfurCubeScene
          v-if="evaluation"
          v-model:scene-size="sceneSize"
          class="interaction-grid__scene"
          :evaluation="evaluation"
          @object-drag-active="setSceneObjectDragActive"
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
      </div>

      <MechanicsReadout v-if="evaluation" :evaluation="evaluation" />

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
  margin-top: 0.75rem;
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
}

.interaction-grid--regular {
  grid-template-areas:
    'scene scene'
    'controls power';
  grid-template-columns: minmax(18rem, 0.8fr) minmax(22rem, 1.2fr);
}

.interaction-grid--compact {
  grid-template-areas:
    'controls scene'
    'power power';
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

@media (max-width: 52rem) {
  .interaction-grid,
  .interaction-grid--regular,
  .interaction-grid--compact {
    grid-template-areas:
      'scene'
      'controls'
      'power';
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
