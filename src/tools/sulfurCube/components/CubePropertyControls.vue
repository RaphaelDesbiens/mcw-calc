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
  CdxLookup,
  CdxMessage,
  CdxSelect,
  CdxTextInput,
  CdxToggleButtonGroup,
} from '@wikimedia/codex'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { je26_2ArchetypeRegistryOrder, je26_2SwallowableItemIds } from '../data/je26_2'
import {
  copyCurrentResolvedCubeProperties,
  selectCubePropertyArchetype,
  selectCubePropertyBlock,
  selectCubePropertyMode,
  updateCustomCubeProperty,
} from '../resolution'

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

function humanizeIdentifier(id: string): string {
  const path = id.includes(':') ? id.slice(id.indexOf(':') + 1) : id

  if (path === 'tnt') {
    return 'TNT'
  }

  return path
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ')
}

const allBlockItems: MenuItemData[] = [...je26_2SwallowableItemIds]
  .map((itemId) => ({
    value: itemId,
    label: humanizeIdentifier(itemId),
    description: itemId,
  }))
  .sort((a, b) => String(a.label).localeCompare(String(b.label)))

const filteredBlockItems = computed<MenuItemData[]>(() => {
  const query = blockSearch.value.trim().toLowerCase()

  if (query === '') {
    return allBlockItems
  }

  return allBlockItems.filter(
    ({ label, value }) =>
      String(label).toLowerCase().includes(query) || String(value).toLowerCase().includes(query),
  )
})

const archetypeItems: MenuItemData[] = je26_2ArchetypeRegistryOrder.map((archetypeId) => ({
  value: archetypeId,
  label: humanizeIdentifier(archetypeId),
  description: archetypeId,
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
const resolvedDataSource = computed(
  () => props.resolution.profile.knockbackModifiers.horizontalPower.value.source.sourcePath,
)
const currentLockedSourceLabel = computed(() => {
  if (props.modelValue.lastLockedMode === 'block') {
    return `${t('sulfurCube.properties.mode.block')} — ${humanizeIdentifier(
      props.modelValue.selectedBlockId,
    )} (${props.modelValue.selectedBlockId})`
  }

  return `${t('sulfurCube.properties.mode.archetype')} — ${humanizeIdentifier(
    props.modelValue.selectedArchetypeId,
  )} (${props.modelValue.selectedArchetypeId})`
})

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

function updateBlock(value: string | number | null): void {
  if (typeof value === 'string') {
    emit('update:modelValue', selectCubePropertyBlock(props.modelValue, value))
  }
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

function updateBlockSearch(value: string): void {
  blockSearch.value = value
}
</script>

<template>
  <section class="property-controls" aria-labelledby="sulfur-cube-properties-title">
    <CdxField is-fieldset>
      <template #label>
        <span id="sulfur-cube-properties-title">
          {{ t('sulfurCube.properties.title') }}
        </span>
      </template>
      <template #description>
        {{ t('sulfurCube.properties.modeHelp') }}
      </template>
      <CdxToggleButtonGroup
        :model-value="modelValue.mode"
        :buttons="modeButtons"
        @update:model-value="updateMode"
      />
    </CdxField>

    <CdxField v-if="modelValue.mode === 'block'">
      <template #label>{{ t('sulfurCube.properties.absorbedBlock') }}</template>
      <template #description>{{ t('sulfurCube.properties.absorbedBlockHelp') }}</template>
      <CdxLookup
        :selected="modelValue.selectedBlockId"
        :menu-items="filteredBlockItems"
        :menu-config="{ visibleItemLimit: 8 }"
        @input="updateBlockSearch"
        @update:selected="updateBlock"
      />
    </CdxField>

    <CdxField v-else-if="modelValue.mode === 'archetype'">
      <template #label>{{ t('sulfurCube.properties.archetype') }}</template>
      <template #description>{{ t('sulfurCube.properties.archetypeHelp') }}</template>
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
      <p class="property-controls__copy-help">
        {{
          t('sulfurCube.properties.copyResolvedHelp', {
            source: currentLockedSourceLabel,
          })
        }}
      </p>
      <CdxButton @click="copyCurrentResolvedValues">
        {{ t('sulfurCube.properties.copyResolved') }}
      </CdxButton>

      <CdxMessage v-if="!resolution.supported" type="warning">
        {{ t('sulfurCube.properties.customInvalid') }}
      </CdxMessage>

      <div v-if="customFormState" class="property-controls__custom-grid">
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
    </template>

    <div class="property-controls__resolved">
      <p>
        <strong>{{ t('sulfurCube.properties.matchingDefinitions') }}</strong>
        <code v-for="candidateId in resolution.candidateIds" :key="candidateId">
          {{ candidateId }}
        </code>
      </p>
      <p>
        <strong>{{ t('sulfurCube.properties.resolvedDataSource') }}</strong>
        <code>{{ resolvedDataSource }}</code>
      </p>

      <dl v-if="modelValue.mode !== 'custom'" class="property-controls__values">
        <template v-for="row in lockedPropertyRows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </template>
      </dl>
      <p v-if="modelValue.mode !== 'custom'" class="property-controls__locked-help">
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

.property-controls__custom-help,
.property-controls__copy-help,
.property-controls__locked-help,
.property-controls__resolved p {
  margin: 0;
}

.property-controls__custom-grid,
.property-controls__values {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.property-controls__resolved {
  display: grid;
  gap: 0.5rem;
}

.property-controls__resolved code {
  margin-left: 0.4rem;
  overflow-wrap: anywhere;
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
  .property-controls__custom-grid,
  .property-controls__values {
    grid-template-columns: 1fr;
  }
}
</style>
