<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type {
  DiagnosticFormState,
  PlayerMeleeFormState,
  RadialSceneDisplayOptions,
  SceneAttackSummary,
} from './components/types'
import type { Je26_2ArchetypeId, Je26_2UniformFloorProfileId } from './data/je26_2'
import type { Vec3 } from './model/types'
import type {
  SulfurCubeSectionColumn,
  SulfurCubeSectionColumnLayout,
  SulfurCubeSectionDropPosition,
  SulfurCubeSectionId,
  SulfurCubeSectionLayouts,
} from './presentation/sectionLayout'
import type { SulfurCubeViewMode } from './presentation/viewMode'
import type { DiagnosticEvaluation } from './presets/diagnostic'
import type { PlayerMeleeEvaluation } from './presets/playerMelee'
import type { CubePropertySelectionState } from './resolution'
import { CdxAccordion, CdxButton, CdxField, CdxMessage, CdxSelect } from '@wikimedia/codex'
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
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
import LaunchSummaryPanel from './components/LaunchSummaryPanel.vue'
import MechanicsReadout from './components/MechanicsReadout.vue'
import PowerSpaceDiagram from './components/PowerSpaceDiagram.vue'
import SulfurCubeScene from './components/SulfurCubeScene.vue'
import TopDownScene from './components/TopDownScene.vue'
import { je26_2ArchetypeRegistryOrder, je26_2UniformFloorProfileOrder } from './data/je26_2'
import { javaPrecisionNumerics } from './numerics/javaPrecision'
import { deriveJe26_2PlayerAim } from './numerics/je26_2PlayerAim'
import { blockSpriteFileName, humanizeIdentifier } from './presentation/blockSelector'
import { parseNumericInput } from './presentation/numericInput'
import {
  defaultSulfurCubeSectionLayouts,
  findSulfurCubeSectionColumn,
  moveSulfurCubeSection,
  normalizeSulfurCubeSectionLayouts,
  sulfurCubeSectionColumns,
  sulfurCubeSectionIds,
} from './presentation/sectionLayout'
import { createFullSulfurCubeToolUrl } from './presentation/viewMode'
import {
  createMilestone1DefaultInputs,
  evaluateDiagnosticInputs,
  findDefaultTrajectoryTicks,
  maximumTrajectoryTicks,
} from './presets/diagnostic'
import {
  createDefaultPlayerMeleeInputs,
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

const toolNumerics = javaPrecisionNumerics
const defaultInputs = createMilestone1DefaultInputs(toolNumerics)
const defaultPlayerMeleeInputs = createDefaultPlayerMeleeInputs()
const isCompactView = props.viewMode === 'compact'
const defaultPropertySelection = createDefaultCubePropertySelectionState()
const initialPropertySelection = isCompactView
  ? selectCubePropertyMode(defaultPropertySelection, 'archetype')
  : defaultPropertySelection

const { t } = useI18n()
const sceneSize = ref<'regular' | 'compact'>('compact')
const radialSceneSizeControlEnabled = false
const compactSceneKind = ref<'radial' | 'topDown'>('radial')
const sceneResetVersion = ref(0)
const formState = ref<DiagnosticFormState>(createDiagnosticFormState(defaultInputs))
const playerMeleeState = ref<PlayerMeleeFormState>(
  createPlayerMeleeFormState(defaultPlayerMeleeInputs),
)
const propertySelection = ref<CubePropertySelectionState>(initialPropertySelection)
const trajectoryTicksDefaultActive = ref(true)
const sectionLayoutStorageKey = 'mcwCalc:sulfurCube:sectionLayouts:v3'
const defaultCollapsedSectionIds: readonly SulfurCubeSectionId[] = ['power', 'trace', 'details']
const radialSceneDisplayOptions = ref<RadialSceneDisplayOptions>({
  velocity: true,
  cube: true,
  player: true,
  aim: true,
  heightAngle: true,
  information: true,
  trajectoryLine: true,
  trajectory: true,
  floor: true,
})

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
const draggedSectionHeight = ref(0)
const dragPreviewLayout = ref<SulfurCubeSectionColumnLayout | null>(null)
const sectionDropTarget = ref<{
  readonly column: SulfurCubeSectionColumn
  readonly sectionId: SulfurCubeSectionId | null
  readonly position: SulfurCubeSectionDropPosition
} | null>(null)
const collapsedSectionIds = ref<readonly SulfurCubeSectionId[]>([...defaultCollapsedSectionIds])
let suppressSectionHeaderClick = false
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
const selectedFloorSpriteUrl = computed(() => {
  const blockIds: Record<Je26_2UniformFloorProfileId, string> = {
    ordinary_full_block: 'minecraft:grass_block',
    slime_block: 'minecraft:slime_block',
    honey_block: 'minecraft:honey_block',
    ice_0_98: 'minecraft:packed_ice',
    blue_ice: 'minecraft:blue_ice',
    soul_sand: 'minecraft:soul_sand',
    bed: 'minecraft:red_bed',
  }

  return getImageLink(`en:${blockSpriteFileName(blockIds[formState.value.floorProfileId])}`)
})
const sulfurCubeImageUrl = getImageLink('en:Sulfur Cube JE2 BE2.png')
const visualTrajectoryTicks = computed(() => {
  const value = parseNumericInput(formState.value.trajectoryTicks)

  return value !== null && Number.isInteger(value) && value >= 0 && value <= maximumTrajectoryTicks
    ? value
    : 0
})

function parseFullTrajectoryInputs() {
  const inputs = parseDiagnosticFormState(formState.value)

  if (
    !Number.isInteger(inputs.trajectoryTicks) ||
    inputs.trajectoryTicks < 0 ||
    inputs.trajectoryTicks > maximumTrajectoryTicks
  ) {
    throw new RangeError(`trajectoryTicks must be an integer from 0 to ${maximumTrajectoryTicks}`)
  }

  return { ...inputs, trajectoryTicks: maximumTrajectoryTicks }
}

const playerMeleeEvaluation = computed<PlayerMeleeEvaluation | null>(() => {
  if (isCompactView) {
    return null
  }

  const properties = propertyResolution.value.values

  if (properties === null) {
    return null
  }

  try {
    const inputs = parseFullTrajectoryInputs()
    const playerAim = deriveJe26_2PlayerAim(inputs.attackerEyePosition, inputs.aimPoint)

    return evaluatePlayerMeleeInputs(
      inputs,
      parsePlayerMeleeFormState(playerMeleeState.value),
      playerAim.yawDegrees,
      toolNumerics,
      properties,
      playerAim.lookDirection,
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
  const weaponPreset = current?.weaponPreset
  const weaponPresetId = weaponPreset?.id ?? 'bareHand'
  const sharpnessLabel = inputs.sharpness.enabled
    ? t('sulfurCube.attack.enchantmentWithLevel', {
        enchantment: t('sulfurCube.attack.sharpness'),
        level: inputs.sharpness.level,
      })
    : null
  const knockbackLabel = inputs.knockback.enabled
    ? t('sulfurCube.attack.enchantmentWithLevel', {
        enchantment: t('sulfurCube.attack.knockback'),
        level: inputs.knockback.level,
      })
    : null

  return {
    weaponLabel: t(`sulfurCube.attack.weapon.${weaponPresetId}`),
    attackStrengthPercent: inputs.attackStrength * 100,
    sharpnessLabel,
    knockbackLabel,
    sharpnessLevel: inputs.sharpness.enabled ? inputs.sharpness.level : null,
    knockbackLevel: inputs.knockback.enabled ? inputs.knockback.level : null,
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
    const inputs = parseFullTrajectoryInputs()
    const playerAim = deriveJe26_2PlayerAim(inputs.attackerEyePosition, inputs.aimPoint)
    return evaluateDiagnosticInputs(inputs, toolNumerics, properties, playerAim.lookDirection)
  } catch {
    return null
  }
})

const lastValidSceneEvaluation = shallowRef<DiagnosticEvaluation | null>(null)

watch(
  evaluation,
  (value) => {
    if (value !== null) {
      lastValidSceneEvaluation.value = value
    }
  },
  { immediate: true },
)

const sceneEvaluation = computed(() => evaluation.value ?? lastValidSceneEvaluation.value)
const sceneInputsInvalid = computed(() => evaluation.value === null)

function isSectionVisible(sectionId: SulfurCubeSectionId): boolean {
  if (sectionId === 'scene' || sectionId === 'topDown' || sectionId === 'controls') {
    return true
  }

  if (sectionId === 'trace') {
    return playerMeleeEvaluation.value !== null
  }

  return evaluation.value !== null
}

const visibleSectionColumns = computed(() => {
  const layout = sectionLayouts.value[sceneSize.value]

  return {
    left: layout.left.filter(isSectionVisible),
    right: layout.right.filter(isSectionVisible),
  }
})

const dragPreviewColumn = computed(() => {
  const sourceId = draggedSectionId.value
  const layout = dragPreviewLayout.value

  return sourceId === null || layout === null ? null : findSulfurCubeSectionColumn(layout, sourceId)
})

function sectionVisualOrder(
  column: SulfurCubeSectionColumn,
  sectionId: SulfurCubeSectionId,
): number {
  const layout = dragPreviewLayout.value ?? sectionLayouts.value[sceneSize.value]
  const index = layout[column].indexOf(sectionId)

  return index < 0 ? sulfurCubeSectionIds.length * 2 : index * 2
}

function dragPreviewOrder(column: SulfurCubeSectionColumn): number {
  const sourceId = draggedSectionId.value
  const layout = dragPreviewLayout.value

  if (sourceId === null || layout === null) return sulfurCubeSectionIds.length * 2

  const index = layout[column].indexOf(sourceId)
  return index < 0 ? sulfurCubeSectionIds.length * 2 : index * 2
}

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

function updateActiveSectionLayout(layout: SulfurCubeSectionColumnLayout): void {
  sectionLayouts.value = {
    ...sectionLayouts.value,
    [sceneSize.value]: {
      left: [...layout.left],
      right: [...layout.right],
    },
  }
}

async function focusSectionHandle(sectionId: SulfurCubeSectionId): Promise<void> {
  await nextTick()
  document.querySelector<HTMLElement>(`[data-section-move-handle="${sectionId}"]`)?.focus()
}

function moveSectionByKeyboard(sectionId: SulfurCubeSectionId, event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggleSectionCollapsed(sectionId)
    return
  }

  const layout = sectionLayouts.value[sceneSize.value]
  const sourceColumn = findSulfurCubeSectionColumn(layout, sectionId)

  if (sourceColumn === null) return

  const sourceSections = visibleSectionColumns.value[sourceColumn]
  const sourceIndex = sourceSections.indexOf(sectionId)
  let targetColumn = sourceColumn
  let targetId: SulfurCubeSectionId | null | undefined
  let position: SulfurCubeSectionDropPosition = 'after'

  switch (event.key) {
    case 'ArrowUp':
      targetId = sourceSections[sourceIndex - 1]
      position = 'before'
      break
    case 'ArrowDown':
      targetId = sourceSections[sourceIndex + 1]
      position = 'after'
      break
    case 'ArrowLeft':
    case 'ArrowRight': {
      const requestedColumn = event.key === 'ArrowLeft' ? 'left' : 'right'
      if (requestedColumn === sourceColumn) return
      targetColumn = requestedColumn
      const targetSections = visibleSectionColumns.value[targetColumn]
      targetId =
        targetSections[Math.min(sourceIndex, Math.max(0, targetSections.length - 1))] ?? null
      position = 'before'
      break
    }
    case 'Home':
      targetId = sourceSections[0]
      position = 'before'
      break
    case 'End':
      targetId = sourceSections[sourceSections.length - 1]
      position = 'after'
      break
    default:
      return
  }

  event.preventDefault()

  if (targetId === undefined || (targetId === sectionId && targetColumn === sourceColumn)) return

  updateActiveSectionLayout(
    moveSulfurCubeSection(layout, sectionId, targetColumn, targetId, position),
  )
  void focusSectionHandle(sectionId)
}

function startSectionDrag(sectionId: SulfurCubeSectionId, event: DragEvent): void {
  suppressSectionHeaderClick = true
  draggedSectionId.value = sectionId
  draggedSectionHeight.value =
    event.currentTarget instanceof HTMLElement
      ? (event.currentTarget.closest<HTMLElement>('.interaction-grid__slot')?.offsetHeight ?? 0)
      : 0
  dragPreviewLayout.value = {
    left: [...sectionLayouts.value[sceneSize.value].left],
    right: [...sectionLayouts.value[sceneSize.value].right],
  }
  sectionDropTarget.value = null

  if (event.dataTransfer !== null) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', sectionId)
  }
}

function previewSectionDrop(
  column: SulfurCubeSectionColumn,
  sectionId: SulfurCubeSectionId | null,
  position: SulfurCubeSectionDropPosition,
): void {
  const sourceId = draggedSectionId.value

  if (sourceId === null || sourceId === sectionId) return

  const currentLayout = dragPreviewLayout.value ?? sectionLayouts.value[sceneSize.value]
  dragPreviewLayout.value = moveSulfurCubeSection(
    currentLayout,
    sourceId,
    column,
    sectionId,
    position,
  )
  sectionDropTarget.value = { column, sectionId, position }
}

function updateSectionDropTarget(
  column: SulfurCubeSectionColumn,
  sectionId: SulfurCubeSectionId,
  event: DragEvent,
): void {
  if (draggedSectionId.value === null) return

  event.preventDefault()

  if (event.dataTransfer !== null) {
    event.dataTransfer.dropEffect = 'move'
  }

  const target = event.currentTarget

  if (!(target instanceof HTMLElement)) {
    return
  }

  const bounds = target.getBoundingClientRect()
  const position = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after'
  previewSectionDrop(column, sectionId, position)
}

function updateColumnDropTarget(column: SulfurCubeSectionColumn, event: DragEvent): void {
  if (draggedSectionId.value === null || event.target !== event.currentTarget) return

  event.preventDefault()

  if (event.dataTransfer !== null) event.dataTransfer.dropEffect = 'move'
  previewSectionDrop(column, null, 'after')
}

function dropSection(event: DragEvent): void {
  event.preventDefault()
  const sourceId = draggedSectionId.value
  const preview = dragPreviewLayout.value

  draggedSectionId.value = null
  draggedSectionHeight.value = 0
  dragPreviewLayout.value = null
  sectionDropTarget.value = null

  if (sourceId === null || preview === null) return

  updateActiveSectionLayout(preview)
  void focusSectionHandle(sourceId)
}

function endSectionDrag(): void {
  draggedSectionId.value = null
  draggedSectionHeight.value = 0
  dragPreviewLayout.value = null
  sectionDropTarget.value = null
  window.setTimeout(() => {
    suppressSectionHeaderClick = false
  }, 0)
}

function activateSectionHeader(sectionId: SulfurCubeSectionId): void {
  if (suppressSectionHeaderClick) return
  toggleSectionCollapsed(sectionId)
}

function resetPageLayout(): void {
  sectionLayouts.value = {
    regular: {
      left: [...defaultSulfurCubeSectionLayouts.regular.left],
      right: [...defaultSulfurCubeSectionLayouts.regular.right],
    },
    compact: {
      left: [...defaultSulfurCubeSectionLayouts.compact.left],
      right: [...defaultSulfurCubeSectionLayouts.compact.right],
    },
  }
  collapsedSectionIds.value = [...defaultCollapsedSectionIds]
  sceneSize.value = 'compact'
}

function updateRadialSceneDisplayOptions(value: RadialSceneDisplayOptions): void {
  radialSceneDisplayOptions.value = value
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
    const playerAim = deriveJe26_2PlayerAim(inputs.attackerEyePosition, inputs.aimPoint)
    trajectoryTicks = isCompactView
      ? findDefaultTrajectoryTicks(inputs, toolNumerics, properties, playerAim.lookDirection)
      : findDefaultPlayerMeleeTrajectoryTicks(
          inputs,
          parsePlayerMeleeFormState(playerMeleeState.value),
          playerAim.yawDegrees,
          toolNumerics,
          properties,
          playerAim.lookDirection,
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
    updateFormState(resetAttackerEyeToStandingPresetInFormState(formState.value, toolNumerics))
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
  <CalcField v-if="isCompactView">
    <template #heading>
      {{ t('sulfurCube.title') }}
    </template>

    <div class="sulfur-cube-compact" lang="en">
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
        <CdxButton class="sulfur-cube-reset" @click="resetEverything">
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
        v-if="sceneEvaluation && compactSceneKind === 'radial'"
        :key="sceneResetVersion"
        v-model:scene-size="sceneSize"
        :evaluation="sceneEvaluation"
        :inputs-invalid="sceneInputsInvalid"
        :initial-zoom-steps="2"
        :show-aim-q-label="false"
        :show-comparison-help="false"
        :show-size-control="false"
        :selected-block-label="selectedCubeVisual.blockLabel"
        :selected-archetype-label="selectedCubeVisual.archetypeLabel"
        :selected-block-sprite-url="selectedCubeVisual.spriteUrl"
        :attack-summary="sceneAttackSummary"
        :floor-surface-label="selectedFloorLabel"
        :floor-surface-sprite-url="selectedFloorSpriteUrl"
        :display-options="radialSceneDisplayOptions"
        :trajectory-tick-limit="visualTrajectoryTicks"
        @update-aim-point="updateAimPoint"
        @translate-attacker="translateAttacker"
        @translate-cube="translateCube"
      />

      <TopDownScene
        v-else-if="sceneEvaluation"
        :key="`compact-top-down-${sceneResetVersion}`"
        :evaluation="sceneEvaluation"
        :inputs-invalid="sceneInputsInvalid"
        scene-size="compact"
        :selected-block-label="selectedCubeVisual.blockLabel"
        :selected-archetype-label="selectedCubeVisual.archetypeLabel"
        :selected-block-sprite-url="selectedCubeVisual.spriteUrl"
        :attack-summary="sceneAttackSummary"
        :floor-surface-label="selectedFloorLabel"
        @update-aim-point="updateAimPoint"
        @translate-attacker-preserving-cube-bearing="translateAttackerPreservingCubeBearing"
        @translate-cube="translateCube"
      />

      <CdxMessage v-else type="warning">
        {{ t('sulfurCube.invalidInputs') }}
      </CdxMessage>
    </div>
  </CalcField>

  <CalcField v-else>
    <div class="sulfur-cube-tool" lang="en">
      <header class="tool-title-band">
        <img class="tool-title-band__image" :src="sulfurCubeImageUrl" alt="" />
        <div class="tool-title-band__text">
          <h2>{{ t('sulfurCube.title') }}</h2>
          <p>{{ t('sulfurCube.titleThemes') }}</p>
        </div>
        <span class="tool-title-band__edition">{{ t('sulfurCube.scope') }}</span>
      </header>

      <LaunchSummaryPanel
        :form-value="formState"
        :property-selection="propertySelection"
        :property-resolution="propertyResolution"
        :player-melee="playerMeleeState"
        :trajectory-ticks-default-active="trajectoryTicksDefaultActive"
        :radial-display-options="radialSceneDisplayOptions"
        @update:form-value="updateFormStateFromControls"
        @update:property-selection="updatePropertySelection"
        @update:player-melee="updatePlayerMeleeState"
        @toggle-trajectory-ticks-default="toggleTrajectoryTicksDefault"
        @reset-positions-aim="resetPositionsAim"
        @reset-archetype="resetArchetype"
        @reset-weapon="resetWeapon"
        @reset-floor="resetFloor"
        @reset-layout="resetPageLayout"
        @reset-everything="resetEverything"
        @update:radial-display-options="updateRadialSceneDisplayOptions"
      />

      <div
        class="interaction-grid"
        :class="{ 'interaction-grid--drag-active': draggedSectionId !== null }"
        @drop.stop="dropSection"
      >
        <div
          v-for="column in sulfurCubeSectionColumns"
          :key="column"
          class="interaction-grid__column"
          :class="`interaction-grid__column--${column}`"
          @dragover="updateColumnDropTarget(column, $event)"
        >
          <div
            v-if="dragPreviewColumn === column && sectionDropTarget !== null"
            class="interaction-grid__drop-preview"
            :style="{
              height: `${draggedSectionHeight}px`,
              order: dragPreviewOrder(column),
            }"
            aria-hidden="true"
            @dragover.stop.prevent
            @drop.stop="dropSection"
          />
          <section
            v-for="sectionId in visibleSectionColumns[column]"
            :key="sectionId"
            class="interaction-grid__slot"
            :style="{ order: sectionVisualOrder(column, sectionId) }"
            :class="{
              'interaction-grid__slot--dragging': draggedSectionId === sectionId,
              'interaction-grid__slot--dragging-active':
                draggedSectionId === sectionId && sectionDropTarget !== null,
              'interaction-grid__slot--drop-before':
                sectionDropTarget?.sectionId === sectionId &&
                sectionDropTarget.position === 'before',
              'interaction-grid__slot--drop-after':
                sectionDropTarget?.sectionId === sectionId &&
                sectionDropTarget.position === 'after',
            }"
            :data-section-id="sectionId"
            @dragover.stop="updateSectionDropTarget(column, sectionId, $event)"
            @drop.stop="dropSection"
          >
            <div
              class="section-layout-handle-bar"
              role="button"
              tabindex="0"
              :draggable="true"
              :data-section-move-handle="sectionId"
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
              aria-keyshortcuts="Enter Space ArrowLeft ArrowRight ArrowUp ArrowDown Home End"
              @click="activateSectionHeader(sectionId)"
              @keydown="moveSectionByKeyboard(sectionId, $event)"
              @dragstart="startSectionDrag(sectionId, $event)"
              @dragend="endSectionDrag"
            >
              <div class="section-layout-heading">
                <span class="section-layout-handle__grip" aria-hidden="true">⠿</span>
                <span class="section-layout-title">{{ sectionTitle(sectionId) }}</span>
                <InfoTooltip
                  v-if="sectionId === 'scene'"
                  class="section-layout-info"
                  :text="t('sulfurCube.scene.projectionHelp')"
                  :label="t('sulfurCube.scene.projectionHelpLabel')"
                  placement="top"
                />
                <InfoTooltip
                  v-else-if="sectionId === 'topDown'"
                  class="section-layout-info"
                  :text="t('sulfurCube.topDown.help')"
                  :label="t('sulfurCube.topDown.helpLabel')"
                  placement="top"
                />
                <InfoTooltip
                  v-else-if="sectionId === 'power'"
                  class="section-layout-info"
                  :text="t('sulfurCube.power.caveat')"
                  :label="t('sulfurCube.power.caveatLabel')"
                  placement="top"
                />
              </div>
              <span class="section-layout-collapse" aria-hidden="true">
                {{ isSectionCollapsed(sectionId) ? '▸' : '▾' }}
              </span>
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
                @update:model-value="updateFormStateFromControls"
                @update:property-selection="updatePropertySelection"
                @update:player-melee="updatePlayerMeleeState"
                @reset-attacker-eye-standing="resetAttackerEyeStanding"
                @reset-positions-aim="resetPositionsAim"
                @reset-archetype="resetArchetype"
                @reset-weapon="resetWeapon"
                @reset-floor="resetFloor"
              />

              <template v-else-if="sectionId === 'scene'">
                <SulfurCubeScene
                  v-if="sceneEvaluation"
                  :key="sceneResetVersion"
                  v-model:scene-size="sceneSize"
                  class="interaction-grid__scene"
                  :evaluation="sceneEvaluation"
                  :inputs-invalid="sceneInputsInvalid"
                  :show-heading-title="false"
                  :show-size-control="radialSceneSizeControlEnabled"
                  :selected-block-label="selectedCubeVisual.blockLabel"
                  :selected-archetype-label="selectedCubeVisual.archetypeLabel"
                  :selected-block-sprite-url="selectedCubeVisual.spriteUrl"
                  :attack-summary="sceneAttackSummary"
                  :floor-surface-label="selectedFloorLabel"
                  :floor-surface-sprite-url="selectedFloorSpriteUrl"
                  :display-options="radialSceneDisplayOptions"
                  :trajectory-tick-limit="visualTrajectoryTicks"
                  @update-aim-point="updateAimPoint"
                  @translate-attacker="translateAttacker"
                  @translate-cube="translateCube"
                />

                <CdxMessage v-else class="interaction-grid__scene" type="warning">
                  {{ t('sulfurCube.invalidInputs') }}
                </CdxMessage>
              </template>

              <TopDownScene
                v-else-if="sectionId === 'topDown' && sceneEvaluation"
                :key="`top-down-${sceneResetVersion}`"
                class="interaction-grid__horizontal"
                :evaluation="sceneEvaluation"
                :inputs-invalid="sceneInputsInvalid"
                :scene-size="sceneSize"
                :selected-block-label="selectedCubeVisual.blockLabel"
                :selected-archetype-label="selectedCubeVisual.archetypeLabel"
                :selected-block-sprite-url="selectedCubeVisual.spriteUrl"
                :attack-summary="sceneAttackSummary"
                :floor-surface-label="selectedFloorLabel"
                :show-heading-title="false"
                @update-aim-point="updateAimPoint"
                @translate-attacker-preserving-cube-bearing="translateAttackerPreservingCubeBearing"
                @translate-cube="translateCube"
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

:global(.sulfur-cube-reset.cdx-button),
:global(.launch-summary__reset-layout.cdx-button) {
  border-color: var(--border-color-error, #b32424);
  background-color: var(--background-color-interactive-subtle, #f8f9fa);
  color: var(--color-base, #202122);
}

:global(.sulfur-cube-reset.cdx-button:hover),
:global(.launch-summary__reset-layout.cdx-button:hover) {
  border-color: var(--border-color-error--hover, #9f2626);
  background-color: var(--background-color-interactive-subtle--hover, #eaecf0);
  color: var(--color-base, #202122);
}

.tool-title-band {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 6.5rem;
  padding: 1rem 8rem;
  overflow: hidden;
  border: 1px solid #d5a43a;
  border-radius: 4px;
  background: linear-gradient(135deg, #fff1b8, #f5c65d);
  color: #202122;
}

.tool-title-band__image {
  width: 72px;
  height: 72px;
  margin-right: 1rem;
  object-fit: contain;
}

.tool-title-band__text {
  text-align: center;
}

.tool-title-band__text h2,
.tool-title-band__text p {
  margin: 0;
}

.tool-title-band__text h2 {
  font-size: clamp(1.65rem, 3vw, 2.25rem);
  line-height: 1.15;
}

.tool-title-band__text p {
  margin-top: 0.35rem;
  font-size: 0.95rem;
}

.tool-title-band__edition {
  position: absolute;
  top: 0.6rem;
  right: 0.75rem;
  width: max-content;
  border: 1px solid rgb(32 33 34 / 18%);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  background: rgb(255 255 255 / 58%);
  color: #54595d;
  font-size: 0.75rem;
  font-weight: 500;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
  min-width: 0;
  max-width: 100%;
}

.interaction-grid__column {
  position: relative;
  display: grid;
  align-content: start;
  gap: 1.5rem;
  min-width: 0;
  min-height: 5rem;
  border-radius: 4px;
  transition: background-color 120ms ease;
}

.interaction-grid--drag-active .interaction-grid__column {
  background: color-mix(
    in srgb,
    var(--background-color-progressive-subtle, #eaf3ff) 45%,
    transparent
  );
}

.interaction-grid__slot {
  position: relative;
  display: grid;
  gap: 0;
  min-width: 0;
  overflow: visible;
  border: 2px solid #c69732;
  border-radius: 3px;
}

.interaction-grid__slot--dragging {
  border-color: var(--border-color-progressive, #36c);
  opacity: 0.62;
}

.interaction-grid__slot--dragging-active {
  position: absolute;
  width: 100%;
  height: 0;
  overflow: hidden;
  border: 0;
  opacity: 0;
  pointer-events: none;
}

.interaction-grid__drop-preview {
  position: relative;
  box-sizing: border-box;
  min-height: 3.25rem;
  border: 3px dashed var(--border-color-progressive, #36c);
  border-radius: 4px;
  background: color-mix(
    in srgb,
    var(--background-color-progressive-subtle, #eaf3ff) 72%,
    transparent
  );
  outline: 3px dashed var(--border-color-progressive, #36c);
  outline-offset: -5px;
  pointer-events: auto;
  transition: height 120ms ease;
}

.interaction-grid__slot--drop-before::after,
.interaction-grid__slot--drop-after::after {
  position: absolute;
  z-index: 5;
  content: '';
  pointer-events: none;
}

.interaction-grid__slot--drop-before::after,
.interaction-grid__slot--drop-after::after {
  right: 0;
  left: 0;
  height: 4px;
  background: var(--border-color-progressive, #36c);
}

.interaction-grid__slot--drop-before::after {
  top: 0;
}

.interaction-grid__slot--drop-after::after {
  bottom: 0;
}

.section-layout-handle-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
  border-bottom: 2px solid #c69732;
  padding: 0.2rem 0.35rem;
  background: linear-gradient(135deg, #fff1b8, #f5c65d);
  color: var(--color-base, #202122);
  user-select: none;
  cursor:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23202122' stroke-width='1.8' stroke-linejoin='round' d='M8.5 11V5.5a1.5 1.5 0 0 1 3 0V10 4.5a1.5 1.5 0 0 1 3 0V10 6a1.5 1.5 0 0 1 3 0v5-2a1.5 1.5 0 0 1 3 0v4.5c0 4-2.5 7-6.5 7h-1c-2.6 0-4.2-1.3-5.5-3.4L4.7 13a1.55 1.55 0 0 1 2.5-1.8z'/%3E%3C/svg%3E")
      8 7,
    grab;
}

.section-layout-handle-bar:active {
  cursor: grabbing;
}

.section-layout-handle-bar:focus-visible {
  outline: 3px solid var(--border-color-progressive, #36c);
  outline-offset: 2px;
}

.section-layout-heading {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  min-width: 0;
  align-self: stretch;
}

.section-layout-title {
  min-width: 0;
  color: var(--color-base, #202122);
  font-size: 1.05rem;
  font-weight: 700;
}

.section-layout-info {
  position: relative;
  z-index: 4;
  cursor: default;
  user-select: none;
}

.section-layout-info :deep(*) {
  cursor: default;
  user-select: none;
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
  pointer-events: none;
}

.section-layout-content {
  min-width: 0;
  overflow: hidden;
  padding: 0.75rem;
}

.interaction-grid__slot[data-section-id='controls'] .section-layout-content {
  overflow: visible;
}

:global(.dark) .section-layout-handle-bar {
  background: linear-gradient(135deg, #594914, #80671a);
  color: #eaecf0;
}

:global(.dark) .section-layout-title,
:global(.dark) .section-layout-collapse {
  color: #eaecf0;
}

@media (max-width: 48rem) {
  .tool-title-band {
    padding: 2.5rem 1rem 1rem;
  }

  .tool-title-band__image {
    width: 56px;
    height: 56px;
  }
}

@media (max-width: 52rem) {
  .interaction-grid {
    grid-template-columns: minmax(0, 1fr);
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
