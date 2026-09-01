<script setup lang="ts">
import type { MenuButtonItemData, MenuItemValue } from '@wikimedia/codex'
import type { SceneResetOption } from './types'
import { CdxMenuButton } from '@wikimedia/codex'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{
  select: [option: SceneResetOption]
}>()

const { t } = useI18n()
const menuItems = computed<MenuButtonItemData[]>(() => [
  { value: 'everything', label: t('sulfurCube.reset.everything') },
  { value: 'positionsAim', label: t('sulfurCube.reset.positionsAim') },
  { value: 'archetype', label: t('sulfurCube.reset.archetype') },
  { value: 'weapon', label: t('sulfurCube.reset.weapon') },
  { value: 'floor', label: t('sulfurCube.reset.floor') },
])

function selectOption(value: MenuItemValue | MenuItemValue[] | null): void {
  if (
    value === 'everything' ||
    value === 'positionsAim' ||
    value === 'archetype' ||
    value === 'weapon' ||
    value === 'floor'
  ) {
    emit('select', value)
  }
}
</script>

<template>
  <CdxMenuButton :selected="null" :menu-items="menuItems" @update:selected="selectOption">
    {{ t('sulfurCube.reset.options') }}
  </CdxMenuButton>
</template>
