<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type {
  DiagnosticFormState,
  PlayerMeleeFormState,
  SceneAttackSummary,
  SceneResetOption,
} from './components/types'
import type { Je26_2ArchetypeId, Je26_2UniformFloorProfileId } from './data/je26_2'
import type { Vec3 } from './model/types'
import type {
  SulfurCubeSectionDropPosition,
  SulfurCubeSectionId,
  SulfurCubeSectionLayouts,
} from './presentation/sectionLayout'
import type { SulfurCubeViewMode } from './presentation/viewMode'
import type { DiagnosticEvaluation } from './presets/diagnostic'
import type { PlayerMeleeEvaluation } from './presets/playerMelee'
import type { CubePropertySelectionState } from './resolution'
import { CdxAccordion, CdxButton, CdxField, CdxMessage, CdxSelect } from '@wikimedia/codex'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'
import { getImageLink } from '@/utils/image'
import AttackOperationTrace from './components/AttackOperationTrace.vue'
import ControlsPanel from './components/ControlsPanel.vue'
import {
  createDiagnosticFormState,
  createPlayerMeleeFormState,
  parseDiagnosticFormState,
  parsePlayerMeleeFormState,
  resetAttackerEyeToStandingPresetInFormState,
  translateAttackerForFeetFormEdit,
  translateAttackerInFormState,
  translateAttackerPreservingCubeBearingInFormState,
  translateCubeInFormState,
  updateAimPointInFormState,
} from './components/formState'
import InfoTooltip from './components/InfoTooltip.vue'
import MechanicsReadout from './components/MechanicsReadout.vue'
import PowerSpaceDiagram from './components/PowerSpaceDiagram.vue'
import SulfurCubeScene from './components/SulfurCubeScene.vue'
import TopDownScene from './components/TopDownScene.vue'
import { je26_2ArchetypeRegistryOrder, je26_2UniformFloorProfileOrder } from './data/je26_2'
import { standardNumerics } from './numerics/standard'
import { blockSpriteFileName, humanizeIdentifier } from './presentation/blockSelector'
import {
  defaultSulfurCubeSectionLayouts,
  moveSulfurCubeSection,
  normalizeSulfurCubeSectionLayouts,
  sulfurCubeSectionWidth,
} from './presentation/sectionLayout'
import { createFullSulfurCubeToolUrl } from './presentation/viewMode'
import {
  createMilestone1DefaultInputs,
  evaluateDiagnosticInputs,
  findDefaultTrajectoryTicks,
} from './presets/diagnostic'
import {
  createDefaultPlayerMeleeInputs,
  deriveMinecraftYawDegreesFromAim,
  evaluatePlayerMeleeInputs,
  findDefaultPlayerMeleeTrajectoryTicks,
} from './presets/playerMelee'
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
const defaultPlayerMeleeInputs = createDefaultPlayerMeleeInputs()
const isCompactView = props.viewMode === 'compact'
const defaultPropertySelection = createDefaultCubePropertySelectionState()
const initialPropertySelection = isCompactView
  ? selectCubePropertyMode(defaultPropertySelection, 'archetype')
  : defaultPropertySelection

const { t } = useI18n()
const sceneSize = ref<'regular' | 'compact'>('compact')
const compactSceneKind = ref<'radial' | 'topDown'>('radial')
const sceneResetVersion = ref(0)
const formState = ref<DiagnosticFormState>(createDiagnosticFormState(defaultInputs))
const playerMeleeState = ref<PlayerMeleeFormState>(
  createPlayerMeleeFormState(defaultPlayerMeleeInputs),
)
const attackerYawDegrees = ref(deriveMinecraftYawDegreesFromAim(defaultInputs, 0))
const propertySelection = ref<CubePropertySelectionState>(initialPropertySelection)
const trajectoryTicksDefaultActive = ref(true)
const sectionLayoutStorageKey = 'mcwCalc:sulfurCube:sectionLayouts:v2'

function loadSectionLayouts(): SulfurCubeSectionLayouts {
  try {
    const stored = window.localStorage.getItem(sectionLayoutStorageKey)

    return normalizeSulfurCubeSectionLayouts(stored === null ? null : JSON.parse(stored))
  } catch {
    return normalizeSulfurCubeSectionLayouts(null)
  }
}

const sectionLayouts = ref<SulfurCubeSectionLayouts>(loadSectionLayouts())
const draggedSectionId = ref<SulfurCubeSectionId | null>(null)
const sectionDropTarget = ref<{
  readonly sectionId: SulfurCubeSectionId
  readonly position: SulfurCubeSectionDropPosition
} | null>(null)
const collapsedSectionIds = ref<readonly SulfurCubeSectionId[]>([])
const propertyResolution = computed(() => resolveCubePropertySelection(propertySelection.value))
const selectedCubeVisual = computed(() => {
  if (propertySelection.value.mode === 'custom') {
    return {
      blockId: null,
      blockLabel: t('sulfurCube.scene.customBlockSelection'),
      archetypeLabel: t('sulfurCube.properties.mode.custom'),
      spriteUrl: null,
    }
  }

  const blockId = propertySelection.value.selectedBlockId

  return {
    blockId,
    blockLabel: humanizeIdentifier(blockId),
    archetypeLabel: propertyResolution.value.candidateIds.map(humanizeIdentifier).join(' / '),
    spriteUrl: getImageLink(`en:${blockSpriteFileName(blockId)}`),
  }
})
const fullToolUrl = createFullSulfurCubeToolUrl(window.location.href)
const compactArchetypeItems: MenuItemData[] = je26_2ArchetypeRegistryOrder.map((archetypeId) => ({
  value: archetypeId,
  label: humanizeIdentifier(archetypeId),
}))
const compactFloorItems: MenuItemData[] = je26_2UniformFloorProfileOrder.map((floorProfileId) => ({
  value: floorProfileId,
  label: t(`sulfurCube.floor.${floorProfileId}`),
}))
const selectedFloorLabel = computed(() => t(`sulfurCube.floor.${formState.value.floorProfileId}`))

const playerMeleeEvaluation = computed<PlayerMeleeEvaluation | null>(() => {
  if (isCompactView) {
    return null
  }

  const properties = propertyResolution.value.values

  if (properties === null) {
    return null
  }

  try {
    const inputs = parseDiagnosticFormState(formState.value)

    return evaluatePlayerMeleeInputs(
      inputs,
      parsePlayerMeleeFormState(playerMeleeState.value),
      deriveMinecraftYawDegreesFromAim(inputs, attackerYawDegrees.value),
      standardNumerics,
      properties,
    )
  } catch {
    return null
  }
})

const sceneAttackSummary = computed<SceneAttackSummary | null>(() => {
  const current = playerMeleeEvaluation.value

  if (current === null && !isCompactView) {
    return null
  }

  const inputs = current?.playerMeleeInputs ?? defaultPlayerMeleeInputs
  const knockbackLabel =
    inputs.knockbackEnchantmentLevel === 0
      ? null
      : t(
          inputs.knockbackEnchantmentLevel === 1
            ? 'sulfurCube.attack.knockback.one'
            : 'sulfurCube.attack.knockback.two',
        )

  return {
    weaponLabel: t(`sulfurCube.attack.weapon.${inputs.weaponPresetId}`),
    attackStrengthPercent: inputs.attackStrength * 100,
    knockbackLabel,
    sprinting: inputs.sprinting,
    criticalHit: inputs.criticalHitConditions,
  }
})

const evaluation = computed<DiagnosticEvaluation | null>(() => {
  if (!isCompactView) {
    return playerMeleeEvaluation.value
  }

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

const visibleSectionOrder = computed(() =>
  sectionLayouts.value[sceneSize.value].filter((sectionId) => {
    if (sectionId === 'scene' || sectionId === 'controls') {
      return true
    }

    if (sectionId === 'trace') {
      return playerMeleeEvaluation.value !== null
    }

    return evaluation.value !== null
  }),
)

function sectionTitle(sectionId: SulfurCubeSectionId): string {
  switch (sectionId) {
    case 'scene':
      return t('sulfurCube.scene.title')
    case 'topDown':
      return t('sulfurCube.topDown.title')
    case 'power':
      return t('sulfurCube.power.title')
    case 'controls':
      return t('sulfurCube.controls.title')
    case 'readout':
      return t('sulfurCube.readout.title')
    case 'trace':
      return t('sulfurCube.attack.trace.title')
    case 'details':
      return t('sulfurCube.readout.details')
  }
}

function updateActiveSectionOrder(order: readonly SulfurCubeSectionId[]): void {
  sectionLayouts.value = {
    ...sectionLayouts.value,
    [sceneSize.value]: [...order],
  }
}

async function focusSectionHandle(sectionId: SulfurCubeSectionId): Promise<void> {
  await nextTick()
  document.querySelector<HTMLElement>(`[data-section-move-handle="${sectionId}"]`)?.focus()
}

function moveSectionByKeyboard(sectionId: SulfurCubeSectionId, event: KeyboardEvent): void {
  const order = sectionLayouts.value[sceneSize.value]
  const visibleOrder = visibleSectionOrder.value
  const sourceIndex = visibleOrder.indexOf(sectionId)
  let targetId: SulfurCubeSectionId | undefined
  let position: SulfurCubeSectionDropPosition

  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      targetId = visibleOrder[sourceIndex - 1]
      position = 'before'
      break
    case 'ArrowRight':
    case 'ArrowDown':
      targetId = visibleOrder[sourceIndex + 1]
      position = 'after'
      break
    case 'Home':
      targetId = visibleOrder[0]
      position = 'before'
      break
    case 'End':
      targetId = visibleOrder[visibleOrder.length - 1]
      position = 'after'
      break
    default:
      return
  }

  event.preventDefault()

  if (targetId === undefined || targetId === sectionId) {
    return
  }

  updateActiveSectionOrder(moveSulfurCubeSection(order, sectionId, targetId, position))
  void focusSectionHandle(sectionId)
}

function startSectionDrag(sectionId: SulfurCubeSectionId, event: DragEvent): void {
  draggedSectionId.value = sectionId
  sectionDropTarget.value = null

  if (event.dataTransfer !== null) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', sectionId)
  }
}

function updateSectionDropTarget(sectionId: SulfurCubeSectionId, event: DragEvent): void {
  const sourceId = draggedSectionId.value

  if (sourceId === null || sourceId === sectionId) {
    sectionDropTarget.value = null
    return
  }

  event.preventDefault()

  if (event.dataTransfer !== null) {
    event.dataTransfer.dropEffect = 'move'
  }

  const target = event.currentTarget

  if (!(target instanceof HTMLElement)) {
    return
  }

  const bounds = target.getBoundingClientRect()
  const width = sulfurCubeSectionWidth(sectionId, sceneSize.value)
  const isSingleColumn = window.matchMedia('(max-width: 52rem)').matches
  const position =
    width === 'full' || isSingleColumn
      ? event.clientY < bounds.top + bounds.height / 2
        ? 'before'
        : 'after'
      : event.clientX < bounds.left + bounds.width / 2
        ? 'before'
        : 'after'

  sectionDropTarget.value = { sectionId, position }
}

function dropSection(sectionId: SulfurCubeSectionId, event: DragEvent): void {
  event.preventDefault()
  const sourceId = draggedSectionId.value
  const position =
    sectionDropTarget.value?.sectionId === sectionId ? sectionDropTarget.value.position : 'after'

  draggedSectionId.value = null
  sectionDropTarget.value = null

  if (sourceId === null || sourceId === sectionId) {
    return
  }

  updateActiveSectionOrder(
    moveSulfurCubeSection(sectionLayouts.value[sceneSize.value], sourceId, sectionId, position),
  )
  void focusSectionHandle(sourceId)
}

function endSectionDrag(): void {
  draggedSectionId.value = null
  sectionDropTarget.value = null
}

function resetSectionOrder(): void {
  updateActiveSectionOrder(defaultSulfurCubeSectionLayouts[sceneSize.value])
}

function isSectionCollapsed(sectionId: SulfurCubeSectionId): boolean {
  return collapsedSectionIds.value.includes(sectionId)
}

function toggleSectionCollapsed(sectionId: SulfurCubeSectionId): void {
  collapsedSectionIds.value = isSectionCollapsed(sectionId)
    ? collapsedSectionIds.value.filter((candidate) => candidate !== sectionId)
    : [...collapsedSectionIds.value, sectionId]
}

function updateFormState(value: DiagnosticFormState): void {
  formState.value = value
}

function updatePlayerMeleeState(value: PlayerMeleeFormState): void {
  playerMeleeState.value = value
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

function createInitialPropertySelection(): CubePropertySelectionState {
  const selection = createDefaultCubePropertySelectionState()

  return isCompactView ? selectCubePropertyMode(selection, 'archetype') : selection
}

function resetSceneInputs(): void {
  trajectoryTicksDefaultActive.value = true
  formState.value = createDiagnosticFormState(defaultInputs)
  playerMeleeState.value = createPlayerMeleeFormState(defaultPlayerMeleeInputs)
  attackerYawDegrees.value = deriveMinecraftYawDegreesFromAim(defaultInputs, 0)
  sceneResetVersion.value += 1
}

function resetEverything(): void {
  resetSceneInputs()
  propertySelection.value = createInitialPropertySelection()
}

function switchCompactScene(): void {
  compactSceneKind.value = compactSceneKind.value === 'radial' ? 'topDown' : 'radial'
  resetSceneInputs()
}

function resetPositionsAim(): void {
  const defaults = createDiagnosticFormState(defaultInputs)

  formState.value = {
    ...formState.value,
    cubeFeetX: defaults.cubeFeetX,
    cubeFeetY: defaults.cubeFeetY,
    cubeFeetZ: defaults.cubeFeetZ,
    attackerFeetX: defaults.attackerFeetX,
    attackerFeetY: defaults.attackerFeetY,
    attackerFeetZ: defaults.attackerFeetZ,
    attackerEyeX: defaults.attackerEyeX,
    attackerEyeY: defaults.attackerEyeY,
    attackerEyeZ: defaults.attackerEyeZ,
    aimX: defaults.aimX,
    aimY: defaults.aimY,
    aimZ: defaults.aimZ,
  }
  attackerYawDegrees.value = deriveMinecraftYawDegreesFromAim(defaultInputs, 0)
  sceneResetVersion.value += 1
}

function resetArchetype(): void {
  propertySelection.value = createInitialPropertySelection()
}

function resetWeapon(): void {
  playerMeleeState.value = createPlayerMeleeFormState(defaultPlayerMeleeInputs)
}

function resetFloor(): void {
  formState.value = {
    ...formState.value,
    floorProfileId: defaultInputs.floorProfileId,
  }
}

function resetOption(option: SceneResetOption): void {
  switch (option) {
    case 'everything':
      resetEverything()
      break
    case 'positionsAim':
      resetPositionsAim()
      break
    case 'archetype':
      resetArchetype()
      break
    case 'weapon':
      resetWeapon()
      break
    case 'floor':
      resetFloor()
      break
  }
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
    const inputs = parseDiagnosticFormState(formState.value)
    trajectoryTicks = isCompactView
      ? findDefaultTrajectoryTicks(inputs, standardNumerics, properties)
      : findDefaultPlayerMeleeTrajectoryTicks(
          inputs,
          parsePlayerMeleeFormState(playerMeleeState.value),
          deriveMinecraftYawDegreesFromAim(inputs, attackerYawDegrees.value),
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

function translateAttackerPreservingCubeBearing(delta: Vec3): void {
  updateFormState(translateAttackerPreservingCubeBearingInFormState(formState.value, delta))
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

function updateCompactFloor(value: string | number | null): void {
  if (
    typeof value !== 'string' ||
    !je26_2UniformFloorProfileOrder.includes(value as Je26_2UniformFloorProfileId)
  ) {
    return
  }

  updateFormState({
    ...formState.value,
    floorProfileId: value as Je26_2UniformFloorProfileId,
  })
}

watch(
  formState,
  () => {
    try {
      const inputs = parseDiagnosticFormState(formState.value)
      attackerYawDegrees.value = deriveMinecraftYawDegreesFromAim(inputs, attackerYawDegrees.value)
    } catch {
      // Retain the last source-relevant yaw while position or aim fields are incomplete.
    }
  },
  { deep: true },
)

watch([formState, playerMeleeState, propertyResolution], refreshDefaultTrajectoryTicks, {
  deep: true,
  immediate: true,
})

watch(
  sectionLayouts,
  (layouts) => {
    try {
      window.localStorage.setItem(sectionLayoutStorageKey, JSON.stringify(layouts))
    } catch {
      // Reordering remains available for this page load if storage is unavailable.
    }
  },
  { deep: true },
)
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
        <CdxField class="compact-toolbar__floor">
          <template #label>{{ t('sulfurCube.controls.uniformFloor') }}</template>
          <CdxSelect
            :selected="formState.floorProfileId"
            :menu-items="compactFloorItems"
            @update:selected="updateCompactFloor"
          />
        </CdxField>
        <CdxButton @click="resetEverything">
          {{ t('sulfurCube.reset.everything') }}
        </CdxButton>
        <CdxButton @click="switchCompactScene">
          {{
            t(
              compactSceneKind === 'radial'
                ? 'sulfurCube.compact.showTopDown'
                : 'sulfurCube.compact.showRadial',
            )
          }}
        </CdxButton>
        <a class="compact-toolbar__full-link" :href="fullToolUrl" target="_blank" rel="noopener">
          {{ t('sulfurCube.compact.openFullTool') }}
          <span aria-hidden="true">↗</span>
        </a>
      </div>

      <SulfurCubeScene
        v-if="evaluation && compactSceneKind === 'radial'"
        :key="sceneResetVersion"
        v-model:scene-size="sceneSize"
        :evaluation="evaluation"
        :initial-zoom-steps="2"
        :show-aim-q-label="false"
        :show-comparison-help="false"
        :show-size-control="false"
        :selected-block-label="selectedCubeVisual.blockLabel"
        :selected-archetype-label="selectedCubeVisual.archetypeLabel"
        :selected-block-sprite-url="selectedCubeVisual.spriteUrl"
        :attack-summary="sceneAttackSummary"
        :floor-surface-label="selectedFloorLabel"
        @update-aim-point="updateAimPoint"
        @translate-attacker="translateAttacker"
        @translate-cube="translateCube"
        @reset="resetOption"
      />

      <TopDownScene
        v-else-if="evaluation"
        :key="`compact-top-down-${sceneResetVersion}`"
        :evaluation="evaluation"
        scene-size="compact"
        :selected-block-label="selectedCubeVisual.blockLabel"
        :selected-archetype-label="selectedCubeVisual.archetypeLabel"
        :selected-block-sprite-url="selectedCubeVisual.spriteUrl"
        :attack-summary="sceneAttackSummary"
        @update-aim-point="updateAimPoint"
        @translate-attacker-preserving-cube-bearing="translateAttackerPreservingCubeBearing"
        @translate-cube="translateCube"
        @reset="resetOption"
      />

      <CdxMessage v-else type="warning">
        {{ t('sulfurCube.invalidInputs') }}
      </CdxMessage>
    </div>

    <div v-else class="sulfur-cube-tool" lang="en">
      <CdxMessage type="notice">
        {{ t('sulfurCube.scope') }}
      </CdxMessage>

      <div class="section-layout-toolbar">
        <CdxButton size="small" weight="quiet" @click="resetSectionOrder">
          {{ t('sulfurCube.layout.reset') }}
        </CdxButton>
      </div>

      <div class="interaction-grid">
        <section
          v-for="sectionId in visibleSectionOrder"
          :key="sectionId"
          class="interaction-grid__slot"
          :class="[
            `interaction-grid__slot--${sulfurCubeSectionWidth(sectionId, sceneSize)}`,
            {
              'interaction-grid__slot--dragging': draggedSectionId === sectionId,
              'interaction-grid__slot--drop-before':
                sectionDropTarget?.sectionId === sectionId &&
                sectionDropTarget.position === 'before',
              'interaction-grid__slot--drop-after':
                sectionDropTarget?.sectionId === sectionId &&
                sectionDropTarget.position === 'after',
            },
          ]"
          :data-section-id="sectionId"
          @dragover="updateSectionDropTarget(sectionId, $event)"
          @drop="dropSection(sectionId, $event)"
        >
          <div class="section-layout-handle-bar">
            <div class="section-layout-heading">
              <CdxButton
                class="section-layout-handle"
                size="small"
                weight="quiet"
                :draggable="true"
                :data-section-move-handle="sectionId"
                :aria-label="
                  t('sulfurCube.layout.moveSection', { section: sectionTitle(sectionId) })
                "
                aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
                :title="t('sulfurCube.layout.moveSection', { section: sectionTitle(sectionId) })"
                @dragstart="startSectionDrag(sectionId, $event)"
                @dragend="endSectionDrag"
                @keydown="moveSectionByKeyboard(sectionId, $event)"
              >
                <span class="section-layout-handle__grip" aria-hidden="true">⠿</span>
                <span>{{ sectionTitle(sectionId) }}</span>
              </CdxButton>
              <InfoTooltip
                v-if="sectionId === 'scene'"
                :text="t('sulfurCube.scene.projectionHelp')"
                :label="t('sulfurCube.scene.projectionHelpLabel')"
                placement="right"
              />
              <InfoTooltip
                v-else-if="sectionId === 'topDown'"
                :text="t('sulfurCube.topDown.help')"
                :label="t('sulfurCube.topDown.helpLabel')"
                placement="right"
              />
              <InfoTooltip
                v-else-if="sectionId === 'power'"
                :text="t('sulfurCube.power.caveat')"
                :label="t('sulfurCube.power.caveatLabel')"
                placement="right"
              />
            </div>
            <CdxButton
              class="section-layout-collapse"
              size="small"
              weight="quiet"
              :aria-expanded="!isSectionCollapsed(sectionId)"
              :aria-controls="`sulfur-cube-section-content-${sectionId}`"
              :aria-label="
                t(
                  isSectionCollapsed(sectionId)
                    ? 'sulfurCube.layout.expandSection'
                    : 'sulfurCube.layout.collapseSection',
                  { section: sectionTitle(sectionId) },
                )
              "
              :title="
                t(
                  isSectionCollapsed(sectionId)
                    ? 'sulfurCube.layout.expandSection'
                    : 'sulfurCube.layout.collapseSection',
                  { section: sectionTitle(sectionId) },
                )
              "
              @click="toggleSectionCollapsed(sectionId)"
            >
              <span aria-hidden="true">{{ isSectionCollapsed(sectionId) ? '▸' : '▾' }}</span>
            </CdxButton>
          </div>

          <div
            v-show="!isSectionCollapsed(sectionId)"
            :id="`sulfur-cube-section-content-${sectionId}`"
            class="section-layout-content"
          >
            <ControlsPanel
              v-if="sectionId === 'controls'"
              class="interaction-grid__controls"
              :model-value="formState"
              :property-selection="propertySelection"
              :property-resolution="propertyResolution"
              :player-melee="playerMeleeState"
              :show-title="false"
              :trajectory-ticks-default-active="trajectoryTicksDefaultActive"
              @update:model-value="updateFormStateFromControls"
              @update:property-selection="updatePropertySelection"
              @update:player-melee="updatePlayerMeleeState"
              @reset-attacker-eye-standing="resetAttackerEyeStanding"
              @toggle-trajectory-ticks-default="toggleTrajectoryTicksDefault"
              @reset-everything="resetEverything"
              @reset-positions-aim="resetPositionsAim"
              @reset-archetype="resetArchetype"
              @reset-weapon="resetWeapon"
              @reset-floor="resetFloor"
            />

            <template v-else-if="sectionId === 'scene'">
              <SulfurCubeScene
                v-if="evaluation"
                :key="sceneResetVersion"
                v-model:scene-size="sceneSize"
                class="interaction-grid__scene"
                :evaluation="evaluation"
                :show-heading-title="false"
                :show-size-control="true"
                :selected-block-label="selectedCubeVisual.blockLabel"
                :selected-archetype-label="selectedCubeVisual.archetypeLabel"
                :selected-block-sprite-url="selectedCubeVisual.spriteUrl"
                :attack-summary="sceneAttackSummary"
                :floor-surface-label="selectedFloorLabel"
                @update-aim-point="updateAimPoint"
                @translate-attacker="translateAttacker"
                @translate-cube="translateCube"
                @reset="resetOption"
              />

              <CdxMessage v-else class="interaction-grid__scene" type="warning">
                {{ t('sulfurCube.invalidInputs') }}
              </CdxMessage>
            </template>

            <TopDownScene
              v-else-if="sectionId === 'topDown' && evaluation"
              :key="`top-down-${sceneResetVersion}`"
              class="interaction-grid__horizontal"
              :evaluation="evaluation"
              :scene-size="sceneSize"
              :selected-block-label="selectedCubeVisual.blockLabel"
              :selected-archetype-label="selectedCubeVisual.archetypeLabel"
              :selected-block-sprite-url="selectedCubeVisual.spriteUrl"
              :attack-summary="sceneAttackSummary"
              :show-heading-title="false"
              @update-aim-point="updateAimPoint"
              @translate-attacker-preserving-cube-bearing="translateAttackerPreservingCubeBearing"
              @translate-cube="translateCube"
              @reset="resetOption"
            />

            <PowerSpaceDiagram
              v-else-if="sectionId === 'power' && evaluation"
              class="interaction-grid__power"
              :evaluation="evaluation"
              :show-heading-title="false"
            />

            <MechanicsReadout
              v-else-if="sectionId === 'readout' && evaluation"
              class="interaction-grid__readout"
              :evaluation="evaluation"
              :show-details="false"
              :show-title="false"
              :summary-layout="sceneSize === 'compact' ? 'single' : 'grid'"
            />

            <AttackOperationTrace
              v-else-if="sectionId === 'trace' && playerMeleeEvaluation"
              class="interaction-grid__trace"
              :evaluation="playerMeleeEvaluation"
              :show-title="false"
            />

            <MechanicsReadout
              v-else-if="sectionId === 'details' && evaluation"
              class="interaction-grid__details"
              :evaluation="evaluation"
              :show-details-title="false"
              :show-summary="false"
            />
          </div>
        </section>
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
  grid-template-columns: repeat(2, minmax(11rem, 1fr)) auto auto;
  align-items: end;
  gap: 0.75rem;
}

.compact-toolbar__archetype :deep(.cdx-select),
.compact-toolbar__floor :deep(.cdx-select) {
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

.section-layout-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 2rem;
}

.section-layout-toolbar :deep(.cdx-button) {
  flex: 0 0 auto;
}

.interaction-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
  align-items: start;
  min-width: 0;
  max-width: 100%;
}

.interaction-grid__slot {
  position: relative;
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.interaction-grid__slot--half {
  grid-column: span 1;
}

.interaction-grid__slot--full {
  grid-column: 1 / -1;
}

.interaction-grid__slot--dragging {
  opacity: 0.5;
}

.interaction-grid__slot--drop-before::after,
.interaction-grid__slot--drop-after::after {
  position: absolute;
  z-index: 5;
  content: '';
  pointer-events: none;
}

.interaction-grid__slot--half.interaction-grid__slot--drop-before::after,
.interaction-grid__slot--half.interaction-grid__slot--drop-after::after {
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--border-color-progressive, #36c);
}

.interaction-grid__slot--half.interaction-grid__slot--drop-before::after {
  left: -0.75rem;
}

.interaction-grid__slot--half.interaction-grid__slot--drop-after::after {
  right: -0.75rem;
}

.interaction-grid__slot--full.interaction-grid__slot--drop-before::after,
.interaction-grid__slot--full.interaction-grid__slot--drop-after::after {
  right: 0;
  left: 0;
  height: 4px;
  background: var(--border-color-progressive, #36c);
}

.interaction-grid__slot--full.interaction-grid__slot--drop-before::after {
  top: -0.75rem;
}

.interaction-grid__slot--full.interaction-grid__slot--drop-after::after {
  bottom: -0.75rem;
}

.section-layout-handle-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
  color: var(--color-base, #202122);
}

.section-layout-heading {
  display: flex;
  align-items: center;
  min-width: 0;
}

.section-layout-handle {
  min-width: 0;
  color: var(--color-base, #202122);
  font-size: 1.05rem;
  font-weight: 700;
  cursor:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23202122' stroke-width='1.5' stroke-linejoin='round' d='M12 1l3 3h-2v6h6V8l3 3-3 3v-2h-6v6h2l-3 3-3-3h2v-6H5v2l-3-3 3-3v2h6V4H9z'/%3E%3C/svg%3E")
      12 12,
    move;
}

.section-layout-handle *,
.section-layout-handle:active,
.section-layout-handle:active * {
  cursor:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23202122' stroke-width='1.5' stroke-linejoin='round' d='M12 1l3 3h-2v6h6V8l3 3-3 3v-2h-6v6h2l-3 3-3-3h2v-6H5v2l-3-3 3-3v2h6V4H9z'/%3E%3C/svg%3E")
      12 12,
    move;
}

.section-layout-handle :deep(.cdx-button__content) {
  min-width: 0;
}

.section-layout-handle__grip {
  margin-right: 0.25rem;
  font-size: 1.05rem;
  line-height: 1;
}

.section-layout-collapse {
  flex: 0 0 auto;
  color: var(--color-base, #202122);
  font-size: 1rem;
}

.section-layout-content {
  min-width: 0;
}

@media (max-width: 52rem) {
  .interaction-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .interaction-grid__slot--half,
  .interaction-grid__slot--full {
    grid-column: 1;
  }

  .interaction-grid__slot--half.interaction-grid__slot--drop-before::after,
  .interaction-grid__slot--half.interaction-grid__slot--drop-after::after {
    right: 0;
    left: 0;
    width: auto;
    height: 4px;
  }

  .interaction-grid__slot--half.interaction-grid__slot--drop-before::after {
    top: -0.75rem;
    bottom: auto;
  }

  .interaction-grid__slot--half.interaction-grid__slot--drop-after::after {
    top: auto;
    bottom: -0.75rem;
  }
}

@media (max-width: 40rem) {
  .compact-toolbar {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .compact-toolbar__archetype,
  .compact-toolbar__floor {
    grid-column: 1 / -1;
  }
}

@media (max-width: 26rem) {
  .compact-toolbar {
    grid-template-columns: 1fr;
  }

  .compact-toolbar__archetype,
  .compact-toolbar__floor {
    grid-column: auto;
  }

  .compact-toolbar > * {
    width: 100%;
  }
}
</style>
