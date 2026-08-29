<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type { DiagnosticFormState } from './components/types'
import type { Je26_2ArchetypeId } from './data/je26_2'
import type { Vec3 } from './model/types'
import type { SulfurCubeViewMode } from './presentation/viewMode'
import type { DiagnosticEvaluation } from './presets/diagnostic'
import type { CubePropertySelectionState } from './resolution'
import { CdxAccordion, CdxButton, CdxField, CdxMessage, CdxSelect } from '@wikimedia/codex'
import { computed, ref, watch } from 'vue'
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
import { je26_2ArchetypeRegistryOrder } from './data/je26_2'
import { standardNumerics } from './numerics/standard'
import { humanizeIdentifier } from './presentation/blockSelector'
import { createFullSulfurCubeToolUrl } from './presentation/viewMode'
import {
  createMilestone1DefaultInputs,
  evaluateDiagnosticInputs,
  findDefaultTrajectoryTicks,
} from './presets/diagnostic'
import {
  createDefaultCubePropertySelectionState,
  resolveCubePropertySelection,
  selectCubePropertyArchetype,
  selectCubePropertyMode,
} from './resolution'

const props = defineProps<{
  viewMode: SulfurCubeViewMode
}>()

const defaultInputs = createMilestone1DefaultInputs()
const isCompactView = props.viewMode === 'compact'
const defaultPropertySelection = createDefaultCubePropertySelectionState()
const initialPropertySelection = isCompactView
  ? selectCubePropertyMode(defaultPropertySelection, 'archetype')
  : defaultPropertySelection

const { t } = useI18n()
const sceneSize = ref<'regular' | 'compact'>(isCompactView ? 'compact' : 'regular')
const sceneResetVersion = ref(0)
const formState = ref<DiagnosticFormState>(createDiagnosticFormState(defaultInputs))
const propertySelection = ref<CubePropertySelectionState>(initialPropertySelection)
const trajectoryTicksDefaultActive = ref(true)
const propertyResolution = computed(() => resolveCubePropertySelection(propertySelection.value))
const fullToolUrl = createFullSulfurCubeToolUrl(window.location.href)
const compactArchetypeItems: MenuItemData[] = je26_2ArchetypeRegistryOrder.map((archetypeId) => ({
  value: archetypeId,
  label: humanizeIdentifier(archetypeId),
}))

const evaluation = computed<DiagnosticEvaluation | null>(() => {
  const properties = propertyResolution.value.values

  if (properties === null) {
    return null
  }

  try {
    return evaluateDiagnosticInputs(
      parseDiagnosticFormState(formState.value),
      standardNumerics,
      properties,
    )
  } catch {
    return null
  }
})

function updateFormState(value: DiagnosticFormState): void {
  formState.value = value
}

function updatePropertySelection(value: CubePropertySelectionState): void {
  propertySelection.value = value
}

function updateFormStateFromControls(value: DiagnosticFormState): void {
  if (String(formState.value.trajectoryTicks) !== String(value.trajectoryTicks)) {
    trajectoryTicksDefaultActive.value = false
  }

  formState.value = translateAttackerForFeetFormEdit(formState.value, value)
}

function reset(): void {
  trajectoryTicksDefaultActive.value = true
  formState.value = createDiagnosticFormState(defaultInputs)
  sceneResetVersion.value += 1
}

function refreshDefaultTrajectoryTicks(): void {
  if (!trajectoryTicksDefaultActive.value) {
    return
  }

  const properties = propertyResolution.value.values

  if (properties === null) {
    return
  }

  let trajectoryTicks: number

  try {
    trajectoryTicks = findDefaultTrajectoryTicks(
      parseDiagnosticFormState(formState.value),
      standardNumerics,
      properties,
    )
  } catch {
    return
  }

  if (Number(formState.value.trajectoryTicks) !== trajectoryTicks) {
    updateFormState({
      ...formState.value,
      trajectoryTicks,
    })
  }
}

function toggleTrajectoryTicksDefault(): void {
  if (trajectoryTicksDefaultActive.value) {
    trajectoryTicksDefaultActive.value = false
    return
  }

  trajectoryTicksDefaultActive.value = true
  refreshDefaultTrajectoryTicks()
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

function updateCompactArchetype(value: string | number | null): void {
  if (
    typeof value !== 'string' ||
    !je26_2ArchetypeRegistryOrder.includes(value as Je26_2ArchetypeId)
  ) {
    return
  }

  propertySelection.value = selectCubePropertyArchetype(
    selectCubePropertyMode(propertySelection.value, 'archetype'),
    value as Je26_2ArchetypeId,
  )
}

watch([formState, propertyResolution], refreshDefaultTrajectoryTicks, {
  deep: true,
  immediate: true,
})
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('sulfurCube.title') }}
    </template>

    <div v-if="isCompactView" class="sulfur-cube-compact" lang="en">
      <div class="compact-toolbar">
        <CdxField class="compact-toolbar__archetype">
          <template #label>{{ t('sulfurCube.compact.archetype') }}</template>
          <CdxSelect
            :selected="propertySelection.selectedArchetypeId"
            :menu-items="compactArchetypeItems"
            @update:selected="updateCompactArchetype"
          />
        </CdxField>
        <CdxButton @click="reset">
          {{ t('sulfurCube.controls.reset') }}
        </CdxButton>
        <a class="compact-toolbar__full-link" :href="fullToolUrl" target="_blank" rel="noopener">
          {{ t('sulfurCube.compact.openFullTool') }}
          <span aria-hidden="true">↗</span>
        </a>
      </div>

      <SulfurCubeScene
        v-if="evaluation"
        :key="sceneResetVersion"
        v-model:scene-size="sceneSize"
        :evaluation="evaluation"
        :show-comparison-help="false"
        :show-size-control="false"
        @update-aim-point="updateAimPoint"
        @translate-attacker="translateAttacker"
        @translate-cube="translateCube"
      />

      <CdxMessage v-else type="warning">
        {{ t('sulfurCube.invalidInputs') }}
      </CdxMessage>
    </div>

    <div v-else class="sulfur-cube-tool" lang="en">
      <CdxMessage type="notice">
        {{ t('sulfurCube.scope') }}
      </CdxMessage>

      <div class="interaction-grid" :class="`interaction-grid--${sceneSize}`">
        <ControlsPanel
          class="interaction-grid__controls"
          :model-value="formState"
          :property-selection="propertySelection"
          :property-resolution="propertyResolution"
          :trajectory-ticks-default-active="trajectoryTicksDefaultActive"
          @update:model-value="updateFormStateFromControls"
          @update:property-selection="updatePropertySelection"
          @reset-attacker-eye-standing="resetAttackerEyeStanding"
          @toggle-trajectory-ticks-default="toggleTrajectoryTicksDefault"
          @reset="reset"
        />

        <SulfurCubeScene
          v-if="evaluation"
          :key="sceneResetVersion"
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
.sulfur-cube-compact {
  display: grid;
  gap: 0.75rem;
  width: min(100%, 64rem);
  margin: 0.75rem auto 0;
}

.compact-toolbar {
  display: grid;
  grid-template-columns: minmax(12rem, 1fr) auto auto;
  align-items: end;
  gap: 0.75rem;
}

.compact-toolbar__archetype :deep(.cdx-select) {
  width: 100%;
  max-width: 24rem;
}

.compact-toolbar__full-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  box-sizing: border-box;
  min-height: 2rem;
  border: 1px solid var(--border-color-progressive, #36c);
  border-radius: 2px;
  padding: 0.25rem 0.75rem;
  background: var(--background-color-progressive, #36c);
  color: var(--color-inverted-fixed, #fff);
  font-weight: 700;
  line-height: 1.5rem;
  text-decoration: none;
}

.compact-toolbar__full-link:visited {
  color: var(--color-inverted-fixed, #fff);
}

.compact-toolbar__full-link:hover {
  border-color: var(--border-color-progressive--hover, #3056a9);
  background: var(--background-color-progressive--hover, #3056a9);
  color: var(--color-inverted-fixed, #fff);
  text-decoration: none;
}

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

@media (max-width: 40rem) {
  .compact-toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .compact-toolbar__archetype {
    grid-column: 1 / -1;
  }
}

@media (max-width: 26rem) {
  .compact-toolbar {
    grid-template-columns: 1fr;
  }

  .compact-toolbar__archetype {
    grid-column: auto;
  }

  .compact-toolbar > * {
    width: 100%;
  }
}
</style>
