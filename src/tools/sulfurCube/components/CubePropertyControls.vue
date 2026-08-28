<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type { Je26_2ArchetypeId } from '../data/je26_2'
import type {
  CubePropertySelectionResolution,
  CubePropertySelectionState,
  CustomPropertyField,
  CustomPropertyInput,
} from '../resolution'
import {
  CdxButton,
  CdxCheckbox,
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
const selectedBlockArchetypeIds = ref<Je26_2ArchetypeId[]>([...je26_2ArchetypeRegistryOrder])
const numberFormatter = new Intl.NumberFormat('en', {
  maximumFractionDigits: 8,
  useGrouping: false,
})

interface BlockSelectorItem {
  readonly id: string
  readonly label: string
  readonly searchText: string
  readonly spriteUrl: string
  readonly archetypeIds: readonly Je26_2ArchetypeId[]
}

const allBlockItems: BlockSelectorItem[] = [...je26_2SwallowableItemIds]
  .map(
    (itemId): BlockSelectorItem => ({
      id: itemId,
      label: humanizeIdentifier(itemId),
      searchText: blockSelectorSearchText(itemId),
      spriteUrl: getImageLink(`en:${blockSpriteFileName(itemId)}`),
      archetypeIds: je26_2BlockMembershipIndex[itemId]!.orderedCandidateIds,
    }),
  )
  .sort((a, b) => a.label.localeCompare(b.label))

const filteredBlockItems = computed<BlockSelectorItem[]>(() => {
  const query = blockSearch.value.trim().toLowerCase()
  const selectedArchetypes = new Set(selectedBlockArchetypeIds.value)

  return allBlockItems.filter(
    ({ archetypeIds, searchText }) =>
      archetypeIds.some((archetypeId) => selectedArchetypes.has(archetypeId)) &&
      (query === '' || searchText.toLowerCase().includes(query)),
  )
})

const allBlockArchetypesSelected = computed(
  () => selectedBlockArchetypeIds.value.length === je26_2ArchetypeRegistryOrder.length,
)
const someBlockArchetypesSelected = computed(
  () =>
    selectedBlockArchetypeIds.value.length > 0 &&
    selectedBlockArchetypeIds.value.length < je26_2ArchetypeRegistryOrder.length,
)

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

function toggleAllBlockArchetypes(selected: boolean): void {
  selectedBlockArchetypeIds.value = selected ? [...je26_2ArchetypeRegistryOrder] : []
}

function toggleBlockArchetype(archetypeId: Je26_2ArchetypeId, selected: boolean): void {
  const nextIds = new Set(selectedBlockArchetypeIds.value)

  if (selected) {
    nextIds.add(archetypeId)
  } else {
    nextIds.delete(archetypeId)
  }

  selectedBlockArchetypeIds.value = je26_2ArchetypeRegistryOrder.filter((id) => nextIds.has(id))
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
        <div class="block-picker__controls">
          <CdxSearchInput
            v-model="blockSearch"
            :use-button="false"
            clearable
            :aria-label="t('sulfurCube.properties.blockSearchLabel')"
            :placeholder="t('sulfurCube.properties.blockSearchPlaceholder')"
          />
          <details class="block-picker__filter">
            <summary>
              {{
                t('sulfurCube.properties.blockArchetypeFilterSummary', {
                  selected: selectedBlockArchetypeIds.length,
                  total: je26_2ArchetypeRegistryOrder.length,
                })
              }}
            </summary>
            <fieldset>
              <legend>{{ t('sulfurCube.properties.blockArchetypeFilter') }}</legend>
              <CdxCheckbox
                :model-value="allBlockArchetypesSelected"
                :indeterminate="someBlockArchetypesSelected"
                @update:model-value="toggleAllBlockArchetypes"
              >
                {{ t('sulfurCube.properties.blockArchetypeAll') }}
              </CdxCheckbox>
              <CdxCheckbox
                v-for="item in archetypeItems"
                :key="item.value"
                :model-value="selectedBlockArchetypeIds.includes(item.value as Je26_2ArchetypeId)"
                @update:model-value="toggleBlockArchetype(item.value as Je26_2ArchetypeId, $event)"
              >
                {{ item.label }}
              </CdxCheckbox>
            </fieldset>
          </details>
        </div>
        <div
          class="block-picker__results"
          :aria-label="t('sulfurCube.properties.blockResultsLabel')"
        >
          <CdxButton
            v-for="item in filteredBlockItems"
            :key="item.id"
            v-tooltip:top="item.label"
            class="block-picker__item"
            :class="{ 'block-picker__item--selected': item.id === modelValue.selectedBlockId }"
            :aria-pressed="item.id === modelValue.selectedBlockId"
            :aria-label="item.label"
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
  grid-template-columns: minmax(10rem, 15rem) minmax(5rem, auto);
  gap: 0.5rem 0.75rem;
  width: min(100%, 24rem);
}

.property-controls__locked-help {
  font-style: italic;
}

.block-picker {
  display: grid;
  gap: 0.5rem;
}

.block-picker__controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.5rem;
}

.block-picker__controls :deep(.cdx-search-input) {
  width: 100%;
  max-width: none;
}

.property-controls .block-picker__controls :deep(.cdx-search-input__text-input.cdx-text-input) {
  width: 100%;
  min-width: 0;
  max-width: none;
}

.block-picker__filter {
  position: relative;
  min-width: 0;
}

.block-picker__filter summary {
  box-sizing: border-box;
  min-height: 2rem;
  padding: 0.25rem 2rem 0.25rem 0.75rem;
  overflow: hidden;
  border: 1px solid var(--border-color-interactive, #72777d);
  border-radius: 2px;
  background: var(--background-color-interactive-subtle, #f8f9fa);
  color: var(--color-base, #202122);
  line-height: 1.5rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.block-picker__filter summary:hover {
  border-color: var(--border-color-interactive--hover, #27292d);
  background: var(--background-color-interactive-subtle--hover, #eaecf0);
}

.block-picker__filter fieldset {
  position: absolute;
  z-index: 3;
  top: calc(100% + 0.25rem);
  right: 0;
  box-sizing: border-box;
  display: grid;
  width: 100%;
  max-height: 18rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  overflow-y: auto;
  border: 1px solid var(--border-color-interactive, #72777d);
  border-radius: 2px;
  background: var(--background-color-base, #fff);
  box-shadow: 0 2px 8px rgb(0 0 0 / 18%);
}

.block-picker__filter legend {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.block-picker__filter :deep(.cdx-checkbox:first-of-type) {
  margin-bottom: 0.25rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
  font-weight: 600;
}

.block-picker__results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(2.75rem, 1fr));
  gap: 0.4rem;
  max-height: 18rem;
  padding: 0.5rem;
  overflow-y: auto;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  background: var(--background-color-base, #fff);
}

.block-picker__item {
  display: grid;
  place-items: center;
  min-height: 3rem;
  min-width: 0;
  padding: 0.4rem;
  overflow: visible;
  line-height: 1;
}

.block-picker__item :deep(.cdx-image) {
  display: block;
  flex: none;
  overflow: visible;
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
  grid-template-columns: minmax(0, 24rem) auto;
  align-items: center;
  justify-content: start;
  gap: 0.75rem;
}

.property-controls__custom-grid {
  display: grid;
  gap: 0.25rem;
}

.property-controls__custom-grid :deep(.cdx-field) {
  display: grid;
  grid-template-columns: minmax(10rem, 15rem) minmax(5rem, 8rem);
  align-items: center;
  gap: 0.5rem;
}

.property-controls__reset-custom {
  display: grid;
  align-self: center;
  min-width: 8rem;
  padding-block: 0.25rem;
  line-height: 1.2;
  text-align: center;
}

.property-controls__reset-custom span {
  color: var(--color-subtle, #54595d);
}

.property-controls__reset-custom strong {
  color: #202122;
}

:global(.dark) .property-controls__reset-custom strong {
  color: #fff;
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
  .block-picker__controls,
  .property-controls__custom-editor {
    grid-template-columns: 1fr;
  }

  .block-picker__filter fieldset {
    position: static;
    margin-top: 0.25rem;
  }

  .property-controls__reset-custom {
    justify-self: start;
  }
}
</style>
