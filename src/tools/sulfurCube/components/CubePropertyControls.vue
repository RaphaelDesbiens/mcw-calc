<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type {
  CubePropertySelectionResolution,
  CubePropertySelectionState,
  CustomPropertyField,
  CustomPropertyInput,
} from '../resolution'
import {
  CdxButton,
  CdxField,
  CdxImage,
  CdxMessage,
  CdxSearchInput,
  CdxSelect,
  CdxTextInput,
  CdxToggleButtonGroup,
} from '@wikimedia/codex'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getImageLink } from '@/utils/image'
import {
  je26_2ArchetypeRegistryOrder,
  je26_2BlockMembershipIndex,
  je26_2SwallowableItemIds,
} from '../data/je26_2'
import {
  blockSelectorSearchText,
  blockSpriteFileName,
  humanizeIdentifier,
} from '../presentation/blockSelector'
import {
  copyCurrentResolvedCubeProperties,
  selectCubePropertyArchetype,
  selectCubePropertyBlock,
  selectCubePropertyMode,
  updateCustomCubeProperty,
} from '../resolution'
import InfoTooltip from './InfoTooltip.vue'

const props = defineProps<{
  modelValue: CubePropertySelectionState
  resolution: CubePropertySelectionResolution
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CubePropertySelectionState]
}>()

const { t } = useI18n()
const blockSearch = ref('')
const numberFormatter = new Intl.NumberFormat('en', {
  maximumFractionDigits: 8,
  useGrouping: false,
})

interface BlockSelectorItem {
  readonly id: string
  readonly label: string
  readonly searchText: string
  readonly spriteUrl: string
}

const allBlockItems: BlockSelectorItem[] = [...je26_2SwallowableItemIds]
  .map(
    (itemId): BlockSelectorItem => ({
      id: itemId,
      label: humanizeIdentifier(itemId),
      searchText: blockSelectorSearchText(itemId),
      spriteUrl: getImageLink(`en:${blockSpriteFileName(itemId)}`),
    }),
  )
  .sort((a, b) => a.label.localeCompare(b.label))

const filteredBlockItems = computed<BlockSelectorItem[]>(() => {
  const query = blockSearch.value.trim().toLowerCase()

  if (query === '') {
    return allBlockItems
  }

  return allBlockItems.filter(({ searchText }) => searchText.toLowerCase().includes(query))
})

const archetypeItems: MenuItemData[] = je26_2ArchetypeRegistryOrder.map((archetypeId) => ({
  value: archetypeId,
  label: humanizeIdentifier(archetypeId),
}))

const modeButtons = computed(() => [
  { value: 'block', label: t('sulfurCube.properties.mode.block') },
  {
    value: 'archetype',
    label: t('sulfurCube.properties.mode.archetype'),
  },
  { value: 'custom', label: t('sulfurCube.properties.mode.custom') },
])

const customFormState = computed(() => props.modelValue.customWorkingCopy?.formState ?? null)
const currentLockedArchetypeIds = computed<readonly string[]>(() => {
  if (props.modelValue.lastLockedMode === 'block') {
    return je26_2BlockMembershipIndex[props.modelValue.selectedBlockId]?.orderedCandidateIds ?? []
  }

  return [props.modelValue.selectedArchetypeId]
})
const currentLockedArchetypeLabel = computed(() =>
  currentLockedArchetypeIds.value.map(humanizeIdentifier).join(' + '),
)
const matchingArchetypeLabels = computed(() =>
  props.resolution.candidateIds.map(humanizeIdentifier).join(', '),
)

const lockedPropertyRows = computed(() => {
  const values = props.resolution.values

  if (values === null) {
    return []
  }

  return [
    {
      label: t('sulfurCube.properties.horizontalPower'),
      value: numberFormatter.format(values.horizontalPower),
    },
    {
      label: t('sulfurCube.properties.verticalPower'),
      value: numberFormatter.format(values.verticalPower),
    },
    {
      label: t('sulfurCube.properties.knockbackResistance'),
      value: numberFormatter.format(values.knockbackResistance),
    },
    {
      label: t('sulfurCube.properties.airDragModifier'),
      value: numberFormatter.format(values.airDragModifier),
    },
  ]
})

function updateMode(value: string | number | null | (string | number)[]): void {
  if (value === 'block' || value === 'archetype' || value === 'custom') {
    emit('update:modelValue', selectCubePropertyMode(props.modelValue, value))
  }
}

function updateBlock(value: string): void {
  emit('update:modelValue', selectCubePropertyBlock(props.modelValue, value))
}

function updateArchetype(value: string | number | null): void {
  if (
    typeof value === 'string' &&
    je26_2ArchetypeRegistryOrder.includes(value as (typeof je26_2ArchetypeRegistryOrder)[number])
  ) {
    emit(
      'update:modelValue',
      selectCubePropertyArchetype(
        props.modelValue,
        value as (typeof je26_2ArchetypeRegistryOrder)[number],
      ),
    )
  }
}

function updateCustomField(field: CustomPropertyField, value: CustomPropertyInput): void {
  emit('update:modelValue', updateCustomCubeProperty(props.modelValue, field, value))
}

function copyCurrentResolvedValues(): void {
  emit('update:modelValue', copyCurrentResolvedCubeProperties(props.modelValue))
}

function customFieldHasError(field: CustomPropertyField): boolean {
  return props.resolution.diagnostics.some(
    (diagnostic) =>
      (diagnostic.kind === 'invalid_custom_number' ||
        diagnostic.kind === 'custom_value_out_of_range') &&
      diagnostic.field === field,
  )
}
</script>

<template>
  <section class="property-controls" aria-labelledby="sulfur-cube-properties-title">
    <div class="property-controls__heading">
      <h4 id="sulfur-cube-properties-title">{{ t('sulfurCube.properties.title') }}</h4>
      <InfoTooltip
        :text="t('sulfurCube.properties.archetypeDefinition')"
        :label="t('sulfurCube.properties.archetypeDefinitionLabel')"
        placement="right"
      />
    </div>

    <CdxToggleButtonGroup
      :model-value="modelValue.mode"
      :buttons="modeButtons"
      @update:model-value="updateMode"
    />

    <CdxField v-if="modelValue.mode === 'block'">
      <template #label>
        <span class="field-label-with-info">
          {{ t('sulfurCube.properties.absorbedBlock') }}
          <InfoTooltip
            :text="t('sulfurCube.properties.absorbedBlockHelp')"
            :label="t('sulfurCube.properties.absorbedBlockHelpLabel')"
          />
        </span>
      </template>
      <div class="block-picker">
        <CdxSearchInput
          v-model="blockSearch"
          :use-button="false"
          clearable
          :aria-label="t('sulfurCube.properties.blockSearchLabel')"
          :placeholder="t('sulfurCube.properties.blockSearchPlaceholder')"
        />
        <div
          class="block-picker__results"
          :aria-label="t('sulfurCube.properties.blockResultsLabel')"
        >
          <CdxButton
            v-for="item in filteredBlockItems"
            :key="item.id"
            class="block-picker__item"
            :class="{ 'block-picker__item--selected': item.id === modelValue.selectedBlockId }"
            :aria-pressed="item.id === modelValue.selectedBlockId"
            :title="item.label"
            @click="updateBlock(item.id)"
          >
            <CdxImage
              :src="item.spriteUrl"
              alt=""
              width="32"
              height="32"
              loading-priority="lazy"
              object-fit="contain"
            />
            <span>{{ item.label }}</span>
          </CdxButton>
          <p v-if="filteredBlockItems.length === 0" class="block-picker__empty">
            {{ t('sulfurCube.properties.blockNoResults') }}
          </p>
        </div>
        <p class="block-picker__count" aria-live="polite">
          {{
            t('sulfurCube.properties.blockResultCount', {
              shown: filteredBlockItems.length,
              total: allBlockItems.length,
            })
          }}
        </p>
      </div>
    </CdxField>

    <CdxField v-else-if="modelValue.mode === 'archetype'">
      <template #label>
        <span class="field-label-with-info">
          {{ t('sulfurCube.properties.archetype') }}
          <InfoTooltip
            :text="t('sulfurCube.properties.archetypeHelp')"
            :label="t('sulfurCube.properties.archetypeHelpLabel')"
          />
        </span>
      </template>
      <CdxSelect
        :selected="modelValue.selectedArchetypeId"
        :menu-items="archetypeItems"
        @update:selected="updateArchetype"
      />
    </CdxField>

    <template v-else>
      <p class="property-controls__custom-help">
        {{ t('sulfurCube.properties.customHelp') }}
      </p>

      <CdxMessage v-if="!resolution.supported" type="warning">
        {{ t('sulfurCube.properties.customInvalid') }}
      </CdxMessage>

      <div v-if="customFormState" class="property-controls__custom-editor">
        <div class="property-controls__custom-grid">
          <CdxField :status="customFieldHasError('horizontalPower') ? 'error' : 'default'">
            <template #label>{{ t('sulfurCube.properties.horizontalPower') }}</template>
            <CdxTextInput
              :model-value="customFormState.horizontalPower"
              :status="customFieldHasError('horizontalPower') ? 'error' : 'default'"
              input-type="number"
              step="0.01"
              @update:model-value="updateCustomField('horizontalPower', $event)"
            />
          </CdxField>
          <CdxField :status="customFieldHasError('verticalPower') ? 'error' : 'default'">
            <template #label>{{ t('sulfurCube.properties.verticalPower') }}</template>
            <CdxTextInput
              :model-value="customFormState.verticalPower"
              :status="customFieldHasError('verticalPower') ? 'error' : 'default'"
              input-type="number"
              step="0.01"
              @update:model-value="updateCustomField('verticalPower', $event)"
            />
          </CdxField>
          <CdxField :status="customFieldHasError('knockbackResistance') ? 'error' : 'default'">
            <template #label>{{ t('sulfurCube.properties.knockbackResistance') }}</template>
            <CdxTextInput
              :model-value="customFormState.knockbackResistance"
              :status="customFieldHasError('knockbackResistance') ? 'error' : 'default'"
              input-type="number"
              min="-2"
              max="1"
              step="0.05"
              @update:model-value="updateCustomField('knockbackResistance', $event)"
            />
          </CdxField>
          <CdxField :status="customFieldHasError('airDragModifier') ? 'error' : 'default'">
            <template #label>{{ t('sulfurCube.properties.airDragModifier') }}</template>
            <CdxTextInput
              :model-value="customFormState.airDragModifier"
              :status="customFieldHasError('airDragModifier') ? 'error' : 'default'"
              input-type="number"
              min="0"
              max="2048"
              step="0.01"
              @update:model-value="updateCustomField('airDragModifier', $event)"
            />
          </CdxField>
        </div>
        <CdxButton class="property-controls__reset-custom" @click="copyCurrentResolvedValues">
          <span>{{ t('sulfurCube.properties.resetCustomTo') }}</span>
          <strong>{{ currentLockedArchetypeLabel }}</strong>
        </CdxButton>
      </div>
    </template>

    <div v-if="modelValue.mode !== 'custom'" class="property-controls__resolved">
      <p v-if="modelValue.mode === 'block'">
        <strong>{{ t('sulfurCube.properties.matchingDefinitions') }}</strong>
        <span>{{ matchingArchetypeLabels }}</span>
      </p>

      <dl class="property-controls__values">
        <template v-for="row in lockedPropertyRows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </template>
      </dl>
      <p class="property-controls__locked-help">
        {{ t('sulfurCube.properties.lockedHelp') }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.property-controls {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  background: var(--background-color-neutral-subtle, #f8f9fa);
}

.property-controls__heading,
.field-label-with-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.property-controls__heading h4 {
  margin: 0;
  font-size: 1.125rem;
}

.property-controls__custom-help,
.property-controls__locked-help,
.property-controls__resolved p {
  margin: 0;
}

.property-controls__values {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem 0.75rem;
}

.property-controls__locked-help {
  font-style: italic;
}

.block-picker {
  display: grid;
  gap: 0.5rem;
}

.block-picker__results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(7.25rem, 1fr));
  gap: 0.4rem;
  max-height: 18rem;
  padding: 0.5rem;
  overflow-y: auto;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  background: var(--background-color-base, #fff);
}

.block-picker__item {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  padding: 0.35rem;
  text-align: left;
}

.block-picker__item span {
  min-width: 0;
  overflow: hidden;
  font-size: 0.8rem;
  text-overflow: ellipsis;
}

.block-picker__item--selected {
  border-color: var(--border-color-progressive, #36c);
  background: var(--background-color-progressive-subtle, #eaf3ff);
}

.block-picker__empty {
  grid-column: 1 / -1;
  margin: 1rem;
  color: var(--color-subtle, #54595d);
  text-align: center;
}

.block-picker__count {
  margin: 0;
  color: var(--color-subtle, #54595d);
  font-size: 0.8rem;
}

.property-controls__custom-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
}

.property-controls__custom-grid {
  display: grid;
  gap: 0.5rem;
}

.property-controls__custom-grid :deep(.cdx-field) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
}

.property-controls__reset-custom {
  display: grid;
  min-width: 8rem;
  text-align: center;
}

.property-controls__resolved {
  display: grid;
  gap: 0.5rem;
}

.property-controls__resolved strong {
  margin-right: 0.4rem;
}

.property-controls__values {
  margin: 0;
}

.property-controls__values > * {
  margin: 0;
}

.property-controls__values dd {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.property-controls :deep(.cdx-lookup),
.property-controls :deep(.cdx-select) {
  max-width: 30rem;
}

@media (max-width: 32rem) {
  .property-controls__custom-editor {
    grid-template-columns: 1fr;
  }

  .property-controls__reset-custom {
    justify-self: start;
  }
}
</style>
