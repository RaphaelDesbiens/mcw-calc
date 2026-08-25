<script setup lang="ts">
import type { MenuItemData, MenuItemValue } from '@wikimedia/codex'
import type { DiagnosticFormState, DiagnosticPresetSelection, NumericFormValue } from './types'
import { CdxAccordion, CdxButton, CdxField, CdxSelect, CdxTextInput } from '@wikimedia/codex'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { diagnosticPresets } from '../presets/diagnostic'

const props = defineProps<{
  modelValue: DiagnosticFormState
  selectedPreset: DiagnosticPresetSelection
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DiagnosticFormState]
  selectPreset: [value: DiagnosticPresetSelection]
  reset: []
  resetTrajectoryTicksDefault: []
}>()

const { t } = useI18n()

const presetItems = computed<MenuItemData[]>(() => [
  ...diagnosticPresets.map((preset) => ({
    value: preset.id,
    label: t(`sulfurCube.presets.${preset.id}`),
  })),
  {
    value: 'custom',
    label: t('sulfurCube.presets.custom'),
  },
])

function updateField(field: keyof DiagnosticFormState, value: NumericFormValue): void {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

function selectPreset(value: MenuItemValue | null): void {
  if (typeof value === 'string') {
    emit('selectPreset', value as DiagnosticPresetSelection)
  }
}
</script>

<template>
  <section class="controls-panel" aria-labelledby="sulfur-cube-controls-title">
    <h3 id="sulfur-cube-controls-title" class="controls-panel__title">
      {{ t('sulfurCube.controls.title') }}
    </h3>

    <div class="controls-panel__preset-row">
      <CdxField class="controls-panel__preset">
        <template #label>{{ t('sulfurCube.controls.preset') }}</template>
        <template #description>{{ t('sulfurCube.controls.presetHelp') }}</template>
        <CdxSelect
          :selected="selectedPreset"
          :menu-items="presetItems"
          @update:selected="selectPreset"
        />
      </CdxField>
      <CdxButton @click="emit('reset')">
        {{ t('sulfurCube.controls.reset') }}
      </CdxButton>
    </div>

    <CdxField>
      <template #label>{{ t('sulfurCube.controls.damageArgument') }}</template>
      <template #description>{{ t('sulfurCube.controls.damageArgumentHelp') }}</template>
      <CdxTextInput
        :model-value="modelValue.damageArgument"
        input-type="number"
        min="0"
        step="0.1"
        @update:model-value="updateField('damageArgument', $event)"
      />
    </CdxField>

    <CdxAccordion heading-level="h4" separation="outline">
      <template #title>{{ t('sulfurCube.controls.coordinates') }}</template>
      <template #description>{{ t('sulfurCube.controls.coordinatesHelp') }}</template>

      <div class="coordinate-sections">
        <CdxField is-fieldset>
          <template #label>{{ t('sulfurCube.controls.cubeFeet') }}</template>
          <template #description>{{ t('sulfurCube.controls.cubeFeetHelp') }}</template>
          <div class="coordinate-grid">
            <CdxField>
              <template #label>X</template>
              <CdxTextInput
                :model-value="modelValue.cubeFeetX"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('cubeFeetX', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Y</template>
              <CdxTextInput
                :model-value="modelValue.cubeFeetY"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('cubeFeetY', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Z</template>
              <CdxTextInput
                :model-value="modelValue.cubeFeetZ"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('cubeFeetZ', $event)"
              />
            </CdxField>
          </div>
        </CdxField>

        <CdxField is-fieldset>
          <template #label>{{ t('sulfurCube.controls.attackerFeet') }}</template>
          <template #description>{{ t('sulfurCube.controls.attackerFeetHelp') }}</template>
          <div class="coordinate-grid">
            <CdxField>
              <template #label>X</template>
              <CdxTextInput
                :model-value="modelValue.attackerFeetX"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('attackerFeetX', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Y</template>
              <CdxTextInput
                :model-value="modelValue.attackerFeetY"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('attackerFeetY', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Z</template>
              <CdxTextInput
                :model-value="modelValue.attackerFeetZ"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('attackerFeetZ', $event)"
              />
            </CdxField>
          </div>
        </CdxField>

        <CdxField is-fieldset>
          <template #label>{{ t('sulfurCube.controls.attackerEyes') }}</template>
          <template #description>{{ t('sulfurCube.controls.attackerEyesHelp') }}</template>
          <div class="coordinate-grid">
            <CdxField>
              <template #label>X</template>
              <CdxTextInput
                :model-value="modelValue.attackerEyeX"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('attackerEyeX', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Y</template>
              <CdxTextInput
                :model-value="modelValue.attackerEyeY"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('attackerEyeY', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Z</template>
              <CdxTextInput
                :model-value="modelValue.attackerEyeZ"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('attackerEyeZ', $event)"
              />
            </CdxField>
          </div>
        </CdxField>

        <CdxField is-fieldset>
          <template #label>{{ t('sulfurCube.controls.aimPoint') }}</template>
          <template #description>{{ t('sulfurCube.controls.aimPointHelp') }}</template>
          <div class="coordinate-grid">
            <CdxField>
              <template #label>X</template>
              <CdxTextInput
                :model-value="modelValue.aimX"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('aimX', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Y</template>
              <CdxTextInput
                :model-value="modelValue.aimY"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('aimY', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Z</template>
              <CdxTextInput
                :model-value="modelValue.aimZ"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('aimZ', $event)"
              />
            </CdxField>
          </div>
        </CdxField>
      </div>
    </CdxAccordion>

    <div class="trajectory-row">
      <CdxField class="trajectory-row__input">
        <template #label>{{ t('sulfurCube.controls.trajectoryTicks') }}</template>
        <template #description>{{ t('sulfurCube.controls.trajectoryTicksHelp') }}</template>
        <CdxTextInput
          :model-value="modelValue.trajectoryTicks"
          input-type="number"
          min="0"
          max="200"
          step="1"
          @update:model-value="updateField('trajectoryTicks', $event)"
        />
      </CdxField>
      <CdxButton @click="emit('resetTrajectoryTicksDefault')">
        {{ t('sulfurCube.controls.trajectoryTicksDefault') }}
      </CdxButton>
    </div>
  </section>
</template>

<style scoped>
.controls-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.controls-panel__title {
  margin: 0;
}

.controls-panel__preset-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 0.75rem;
}

.controls-panel__preset {
  min-width: 0;
}

.trajectory-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 0.75rem;
}

.trajectory-row__input {
  min-width: 0;
}

.coordinate-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(4.5rem, 1fr));
  gap: 0.5rem;
}

.coordinate-sections {
  display: grid;
  gap: 1rem;
}

@media (max-width: 32rem) {
  .controls-panel__preset-row,
  .trajectory-row {
    grid-template-columns: 1fr;
  }

  .controls-panel__preset-row > :last-child,
  .trajectory-row > :last-child {
    justify-self: start;
  }
}
</style>
