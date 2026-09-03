<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type {
  Je26_2ArchetypeId,
  Je26_2PlayerMeleeWeaponPresetId,
  Je26_2UniformFloorProfileId,
} from '../data/je26_2'
import type { CubePropertySelectionResolution, CubePropertySelectionState } from '../resolution'
import type { DiagnosticFormState, NumericFormValue, PlayerMeleeFormState } from './types'
import { CdxButton, CdxField, CdxSelect, CdxTextInput } from '@wikimedia/codex'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getImageLink } from '@/utils/image'
import {
  je26_2ArchetypeRegistryOrder,
  je26_2PlayerMeleeMechanics,
  je26_2PlayerMeleeWeaponPresetOrder,
  je26_2PlayerMeleeWeaponPresets,
  je26_2UniformFloorProfileOrder,
  resolveJe26_2PlayerMeleeWeaponPreset,
} from '../data/je26_2'
import { blockSpriteFileName, humanizeIdentifier } from '../presentation/blockSelector'
import { parseNumericInput, sanitizeNumericInput } from '../presentation/numericInput'
import { maximumTrajectoryTicks } from '../presets/diagnostic'
import {
  je26_2ArchetypeRepresentativeBlocks,
  selectCubePropertyArchetype,
  selectCubePropertyMode,
} from '../resolution'
import InfoTooltip from './InfoTooltip.vue'

const props = defineProps<{
  formValue: DiagnosticFormState
  propertySelection: CubePropertySelectionState
  propertyResolution: CubePropertySelectionResolution
  playerMelee: PlayerMeleeFormState
  trajectoryTicksDefaultActive: boolean
}>()
const emit = defineEmits<{
  'update:formValue': [value: DiagnosticFormState]
  'update:propertySelection': [value: CubePropertySelectionState]
  'update:playerMelee': [value: PlayerMeleeFormState]
  toggleTrajectoryTicksDefault: []
  resetPositionsAim: []
  resetArchetype: []
  resetWeapon: []
  resetFloor: []
  resetLayout: []
  resetEverything: []
}>()
const { t } = useI18n()

const archetypeItems: MenuItemData[] = je26_2ArchetypeRegistryOrder.map((id) => ({
  value: id,
  label: humanizeIdentifier(id),
  thumbnail: {
    url: getImageLink(`en:${blockSpriteFileName(je26_2ArchetypeRepresentativeBlocks[id])}`),
  },
}))
const weaponItems = computed<MenuItemData[]>(() =>
  je26_2PlayerMeleeWeaponPresetOrder.map((id) => ({
    value: id,
    label: t(`sulfurCube.attack.weapon.${id}`),
    ...(je26_2PlayerMeleeWeaponPresets[id].itemId.value === null
      ? {}
      : {
          thumbnail: {
            url: getImageLink(
              `en:ItemSprite_${je26_2PlayerMeleeWeaponPresets[id].itemId
                .value!.replace('minecraft:', '')
                .replace(/_/g, '-')}.png`,
            ),
          },
        }),
  })),
)
const sharpnessItems: MenuItemData[] = Array.from(
  { length: je26_2PlayerMeleeMechanics.ordinarySurvivalSharpnessMaximum + 1 },
  (_, level) => ({ value: level, label: String(level) }),
)
const knockbackItems: MenuItemData[] = Array.from(
  { length: je26_2PlayerMeleeMechanics.ordinarySurvivalKnockbackMaximum + 1 },
  (_, level) => ({ value: level, label: String(level) }),
)
const floorItems = computed<MenuItemData[]>(() =>
  je26_2UniformFloorProfileOrder.map((id) => ({
    value: id,
    label: t(`sulfurCube.floor.${id}`),
  })),
)
const selectedArchetype = computed(
  () =>
    (props.propertySelection.mode === 'archetype'
      ? props.propertySelection.selectedArchetypeId
      : props.propertyResolution.candidateIds[0]) ?? null,
)
const selectedWeapon = computed(
  () =>
    resolveJe26_2PlayerMeleeWeaponPreset(
      props.playerMelee.weaponType === 'bareHand'
        ? { type: 'bareHand' }
        : {
            type: props.playerMelee.weaponType,
            material: props.playerMelee.weaponMaterial,
          },
    ).id,
)
const selectedSharpness = computed(() =>
  props.playerMelee.sharpnessEnabled
    ? (parseNumericInput(props.playerMelee.sharpnessLevel) ?? 0)
    : 0,
)
const selectedKnockback = computed(() =>
  props.playerMelee.knockbackEnabled
    ? (parseNumericInput(props.playerMelee.knockbackLevel) ?? 0)
    : 0,
)
const sharpnessUsesNumericInput = ref(false)
const knockbackUsesNumericInput = ref(false)

watch(
  () =>
    [
      props.playerMelee.allowNonVanillaEnchantmentLevels,
      props.playerMelee.sharpnessLevel,
      props.playerMelee.knockbackLevel,
    ] as const,
  ([allowed, sharpnessLevel, knockbackLevel]) => {
    if (!allowed) {
      sharpnessUsesNumericInput.value = false
      knockbackUsesNumericInput.value = false
      return
    }

    if (
      (parseNumericInput(sharpnessLevel) ?? 0) >
      je26_2PlayerMeleeMechanics.ordinarySurvivalSharpnessMaximum
    ) {
      sharpnessUsesNumericInput.value = true
    }
    if (
      (parseNumericInput(knockbackLevel) ?? 0) >
      je26_2PlayerMeleeMechanics.ordinarySurvivalKnockbackMaximum
    ) {
      knockbackUsesNumericInput.value = true
    }
  },
  { immediate: true },
)

function updateArchetype(value: string | number | null): void {
  if (
    typeof value !== 'string' ||
    !je26_2ArchetypeRegistryOrder.includes(value as Je26_2ArchetypeId)
  ) {
    return
  }

  emit(
    'update:propertySelection',
    selectCubePropertyArchetype(
      selectCubePropertyMode(props.propertySelection, 'archetype'),
      value as Je26_2ArchetypeId,
    ),
  )
}

function updateWeapon(value: string | number | null): void {
  if (
    typeof value !== 'string' ||
    !je26_2PlayerMeleeWeaponPresetOrder.includes(value as Je26_2PlayerMeleeWeaponPresetId)
  ) {
    return
  }

  const preset = je26_2PlayerMeleeWeaponPresets[value as Je26_2PlayerMeleeWeaponPresetId]
  emit('update:playerMelee', {
    ...props.playerMelee,
    weaponType: preset.weaponType,
    ...(preset.material === null ? {} : { weaponMaterial: preset.material }),
  })
}

function updateEnchantment(
  enchantment: 'sharpness' | 'knockback',
  value: string | number | null,
): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return

  const enabled = value > 0
  const nonVanilla =
    (enchantment === 'sharpness' &&
      value > je26_2PlayerMeleeMechanics.ordinarySurvivalSharpnessMaximum) ||
    (enchantment === 'knockback' &&
      value > je26_2PlayerMeleeMechanics.ordinarySurvivalKnockbackMaximum)

  emit('update:playerMelee', {
    ...props.playerMelee,
    ...(enchantment === 'sharpness'
      ? { sharpnessEnabled: enabled, sharpnessLevel: enabled ? String(value) : '1' }
      : { knockbackEnabled: enabled, knockbackLevel: enabled ? String(value) : '1' }),
    allowNonVanillaEnchantmentLevels:
      props.playerMelee.allowNonVanillaEnchantmentLevels || nonVanilla,
  })
}

function updateNumericEnchantment(
  enchantment: 'sharpness' | 'knockback',
  value: NumericFormValue,
): void {
  const parsed = parseNumericInput(sanitizeNumericInput(value))
  const level = Math.min(
    je26_2PlayerMeleeMechanics.maximumDecodedEnchantmentLevel,
    Math.max(0, Math.trunc(parsed ?? 0)),
  )

  updateEnchantment(enchantment, level)
}

function updateFloor(value: string | number | null): void {
  if (
    typeof value === 'string' &&
    je26_2UniformFloorProfileOrder.includes(value as Je26_2UniformFloorProfileId)
  ) {
    emit('update:formValue', {
      ...props.formValue,
      floorProfileId: value as Je26_2UniformFloorProfileId,
    })
  }
}

function updateTrajectoryTicks(value: NumericFormValue): void {
  emit('update:formValue', {
    ...props.formValue,
    trajectoryTicks: sanitizeNumericInput(value),
  })
}
</script>

<template>
  <section class="launch-summary" aria-labelledby="sulfur-cube-summary-title">
    <div class="launch-summary__intro">
      <h3 id="sulfur-cube-summary-title">{{ t('sulfurCube.summary.title') }}</h3>
      <p>{{ t('sulfurCube.summary.intro') }}</p>
    </div>

    <div class="launch-summary__controls">
      <CdxField>
        <template #label>{{ t('sulfurCube.properties.title') }}</template>
        <CdxSelect
          :selected="selectedArchetype"
          :menu-items="archetypeItems"
          :menu-config="{ showThumbnail: true }"
          @update:selected="updateArchetype"
        />
      </CdxField>
      <CdxField>
        <template #label>{{ t('sulfurCube.attack.weapon') }}</template>
        <CdxSelect
          :selected="selectedWeapon"
          :menu-items="weaponItems"
          :menu-config="{ showThumbnail: true }"
          @update:selected="updateWeapon"
        />
      </CdxField>
      <CdxField>
        <template #label>{{ t('sulfurCube.attack.sharpness') }}</template>
        <CdxTextInput
          v-if="sharpnessUsesNumericInput"
          :model-value="String(selectedSharpness)"
          input-type="number"
          min="0"
          :max="je26_2PlayerMeleeMechanics.maximumDecodedEnchantmentLevel"
          step="1"
          @update:model-value="updateNumericEnchantment('sharpness', $event)"
        />
        <CdxSelect
          v-else
          :selected="selectedSharpness"
          :menu-items="sharpnessItems"
          @update:selected="updateEnchantment('sharpness', $event)"
        />
      </CdxField>
      <CdxField>
        <template #label>{{ t('sulfurCube.attack.knockback') }}</template>
        <CdxTextInput
          v-if="knockbackUsesNumericInput"
          :model-value="String(selectedKnockback)"
          input-type="number"
          min="0"
          :max="je26_2PlayerMeleeMechanics.maximumDecodedEnchantmentLevel"
          step="1"
          @update:model-value="updateNumericEnchantment('knockback', $event)"
        />
        <CdxSelect
          v-else
          :selected="selectedKnockback"
          :menu-items="knockbackItems"
          @update:selected="updateEnchantment('knockback', $event)"
        />
      </CdxField>
      <CdxField>
        <template #label>{{ t('sulfurCube.controls.uniformFloor') }}</template>
        <CdxSelect
          :selected="formValue.floorProfileId"
          :menu-items="floorItems"
          @update:selected="updateFloor"
        />
      </CdxField>
      <div class="launch-summary__trajectory">
        <CdxField>
          <template #label>
            <span class="launch-summary__label-with-info">
              {{ t('sulfurCube.controls.trajectoryTicks') }}
              <InfoTooltip
                :text="t('sulfurCube.controls.trajectoryTicksHelp')"
                :label="t('sulfurCube.controls.trajectoryTicksHelpLabel')"
              />
            </span>
          </template>
          <CdxTextInput
            :model-value="formValue.trajectoryTicks"
            input-type="number"
            min="0"
            :max="maximumTrajectoryTicks"
            step="1"
            @update:model-value="updateTrajectoryTicks"
          />
        </CdxField>
        <CdxButton
          :action="trajectoryTicksDefaultActive ? 'progressive' : 'default'"
          :aria-pressed="trajectoryTicksDefaultActive"
          @click="emit('toggleTrajectoryTicksDefault')"
        >
          {{ t('sulfurCube.controls.trajectoryTicksDefault') }}
        </CdxButton>
      </div>
    </div>

    <div class="launch-summary__resets">
      <strong>{{ t('sulfurCube.reset.options') }}</strong>
      <div class="launch-summary__reset-buttons">
        <CdxButton size="small" action="destructive" @click="emit('resetPositionsAim')">
          {{ t('sulfurCube.summary.resetPositionsAim') }}
        </CdxButton>
        <CdxButton size="small" action="destructive" @click="emit('resetArchetype')">
          {{ t('sulfurCube.summary.resetArchetype') }}
        </CdxButton>
        <CdxButton size="small" action="destructive" @click="emit('resetWeapon')">
          {{ t('sulfurCube.summary.resetWeapon') }}
        </CdxButton>
        <CdxButton size="small" action="destructive" @click="emit('resetFloor')">
          {{ t('sulfurCube.summary.resetFloor') }}
        </CdxButton>
        <CdxButton size="small" action="destructive" @click="emit('resetEverything')">
          {{ t('sulfurCube.summary.resetEverything') }}
        </CdxButton>
        <CdxButton
          class="launch-summary__reset-layout"
          size="small"
          action="destructive"
          @click="emit('resetLayout')"
        >
          {{ t('sulfurCube.summary.resetLayout') }}
        </CdxButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.launch-summary {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #c69732;
  border-radius: 3px;
  background: var(--background-color-neutral-subtle, #f8f9fa);
}
.launch-summary__intro h3,
.launch-summary__intro p {
  margin: 0;
}
.launch-summary__intro p {
  margin-top: 0.2rem;
  color: var(--color-subtle, #54595d);
}
.launch-summary__controls {
  display: grid;
  grid-template-columns: 10.25rem 10.5rem 6rem 6rem 11rem 12.5rem;
  gap: 0.75rem;
  align-items: end;
}
.launch-summary__controls > * {
  min-width: 0;
}
.launch-summary__controls :deep(.cdx-select-vue),
.launch-summary__controls :deep(.cdx-select-vue__handle) {
  width: 100%;
  min-width: 0;
}
.launch-summary__trajectory {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.4rem;
  align-items: end;
}
.launch-summary__label-with-info {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.launch-summary__trajectory :deep(.cdx-text-input) {
  width: 100%;
  min-width: 0;
}
.launch-summary__resets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
}
.launch-summary__reset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.launch-summary__reset-layout {
  margin-left: auto;
}
@media (max-width: 72rem) {
  .launch-summary__controls {
    grid-template-columns: repeat(3, minmax(9rem, 1fr));
  }
}
@media (max-width: 42rem) {
  .launch-summary__controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 28rem) {
  .launch-summary__controls {
    grid-template-columns: 1fr;
  }
}
</style>
