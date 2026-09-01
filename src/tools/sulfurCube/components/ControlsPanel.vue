<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type { Je26_2UniformFloorProfileId } from '../data/je26_2'
import type { CubePropertySelectionResolution, CubePropertySelectionState } from '../resolution'
import type { DiagnosticFormState, NumericFormValue, PlayerMeleeFormState } from './types'
import { CdxAccordion, CdxButton, CdxField, CdxSelect, CdxTextInput } from '@wikimedia/codex'
import { useI18n } from 'vue-i18n'
import { je26_2UniformFloorProfileOrder } from '../data/je26_2'
import { maximumTrajectoryTicks } from '../presets/diagnostic'
import CubePropertyControls from './CubePropertyControls.vue'
import InfoTooltip from './InfoTooltip.vue'
import PlayerMeleeControls from './PlayerMeleeControls.vue'

const props = withDefaults(
  defineProps<{
    modelValue: DiagnosticFormState
    propertySelection: CubePropertySelectionState
    propertyResolution: CubePropertySelectionResolution
    trajectoryTicksDefaultActive: boolean
    playerMelee: PlayerMeleeFormState
    showTitle?: boolean
  }>(),
  {
    showTitle: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: DiagnosticFormState]
  'update:propertySelection': [value: CubePropertySelectionState]
  'update:playerMelee': [value: PlayerMeleeFormState]
  reset: []
  resetAttackerEyeStanding: []
  toggleTrajectoryTicksDefault: []
}>()

const { t } = useI18n()
const floorItems: MenuItemData[] = je26_2UniformFloorProfileOrder.map((id) => ({
  value: id,
  label: t(`sulfurCube.floor.${id}`),
}))

function updateField(
  field: Exclude<keyof DiagnosticFormState, 'floorProfileId'>,
  value: NumericFormValue,
): void {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

function updateFloor(value: string | number | null): void {
  if (
    typeof value === 'string' &&
    je26_2UniformFloorProfileOrder.includes(value as Je26_2UniformFloorProfileId)
  ) {
    emit('update:modelValue', {
      ...props.modelValue,
      floorProfileId: value as Je26_2UniformFloorProfileId,
    })
  }
}
</script>

<template>
  <section
    class="controls-panel"
    :aria-labelledby="showTitle ? 'sulfur-cube-controls-title' : undefined"
    :aria-label="showTitle ? undefined : t('sulfurCube.controls.title')"
  >
    <div
      class="controls-panel__heading"
      :class="{ 'controls-panel__heading--without-title': !showTitle }"
    >
      <h3 v-if="showTitle" id="sulfur-cube-controls-title" class="controls-panel__title">
        {{ t('sulfurCube.controls.title') }}
      </h3>
      <CdxButton @click="emit('reset')">
        {{ t('sulfurCube.controls.reset') }}
      </CdxButton>
    </div>

    <CubePropertyControls
      :model-value="propertySelection"
      :resolution="propertyResolution"
      @update:model-value="emit('update:propertySelection', $event)"
    />

    <PlayerMeleeControls
      :model-value="playerMelee"
      @update:model-value="emit('update:playerMelee', $event)"
    />

    <CdxAccordion heading-level="h4" separation="outline">
      <template #title>
        <span class="field-label-with-info">
          {{ t('sulfurCube.controls.coordinates') }}
          <InfoTooltip
            :text="t('sulfurCube.controls.coordinatesHelp')"
            :label="t('sulfurCube.controls.coordinatesHelpLabel')"
          />
        </span>
      </template>

      <div class="coordinate-sections">
        <CdxField is-fieldset>
          <template #label>
            <span class="field-label-with-info">
              {{ t('sulfurCube.controls.cubeFeet') }}
              <InfoTooltip
                :text="t('sulfurCube.controls.cubeFeetHelp')"
                :label="t('sulfurCube.controls.cubeFeetHelpLabel')"
              />
            </span>
          </template>
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
          <template #label>
            <span class="field-label-with-info">
              {{ t('sulfurCube.controls.attackerFeet') }}
              <InfoTooltip
                :text="t('sulfurCube.controls.attackerFeetHelp')"
                :label="t('sulfurCube.controls.attackerFeetHelpLabel')"
              />
            </span>
          </template>
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

        <CdxAccordion heading-level="h5" separation="outline">
          <template #title>
            <span class="field-label-with-info">
              {{ t('sulfurCube.controls.attackerEyes') }}
              <InfoTooltip
                :text="t('sulfurCube.controls.attackerEyesHelp')"
                :label="t('sulfurCube.controls.attackerEyesHelpLabel')"
              />
            </span>
          </template>

          <div class="eye-preset-row">
            <CdxButton @click="emit('resetAttackerEyeStanding')">
              {{ t('sulfurCube.controls.attackerEyesStandingDefault') }}
            </CdxButton>
          </div>
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
        </CdxAccordion>

        <CdxField is-fieldset>
          <template #label>
            <span class="field-label-with-info">
              {{ t('sulfurCube.controls.aimPoint') }}
              <InfoTooltip
                :text="t('sulfurCube.controls.aimPointHelp')"
                :label="t('sulfurCube.controls.aimPointHelpLabel')"
              />
            </span>
          </template>
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

    <CdxField>
      <template #label>
        <span class="field-label-with-info">
          {{ t('sulfurCube.controls.uniformFloor') }}
          <InfoTooltip
            :text="t('sulfurCube.controls.uniformFloorHelp')"
            :label="t('sulfurCube.controls.uniformFloorHelpLabel')"
          />
        </span>
      </template>
      <CdxSelect
        :selected="modelValue.floorProfileId"
        :menu-items="floorItems"
        @update:selected="updateFloor"
      />
    </CdxField>

    <div class="trajectory-row">
      <CdxField class="trajectory-row__input">
        <template #label>
          <span class="field-label-with-info">
            {{ t('sulfurCube.controls.trajectoryTicks') }}
            <InfoTooltip
              :text="t('sulfurCube.controls.trajectoryTicksHelp')"
              :label="t('sulfurCube.controls.trajectoryTicksHelpLabel')"
            />
          </span>
        </template>
        <CdxTextInput
          :model-value="modelValue.trajectoryTicks"
          input-type="number"
          min="0"
          :max="maximumTrajectoryTicks"
          step="1"
          @update:model-value="updateField('trajectoryTicks', $event)"
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
  </section>
</template>

<style scoped>
.controls-panel {
  --numeric-input-width: calc(5.5rem + 1cm);

  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.controls-panel__title {
  margin: 0;
}

.controls-panel__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.controls-panel__heading--without-title {
  justify-content: flex-end;
}

.field-label-with-info {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.controls-panel :deep(.cdx-text-input) {
  min-width: var(--numeric-input-width);
  width: var(--numeric-input-width);
  max-width: var(--numeric-input-width);
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  width: min(100%, calc(17.5rem + 3cm));
  max-width: 100%;
}

.coordinate-grid > * {
  width: 100%;
  min-width: 0;
}

.coordinate-grid :deep(.cdx-text-input) {
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.coordinate-grid :deep(label) {
  padding-left: 0.25rem;
}

.coordinate-sections {
  display: grid;
  gap: 1rem;
}

.eye-preset-row {
  margin-bottom: 0.75rem;
}

@media (max-width: 32rem) {
  .trajectory-row {
    grid-template-columns: 1fr;
  }

  .trajectory-row > :last-child {
    justify-self: start;
  }
}
</style>
