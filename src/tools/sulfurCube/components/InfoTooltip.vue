<script setup lang="ts">
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconInfo } from '@wikimedia/codex-icons'

withDefaults(
  defineProps<{
    text: string
    label?: string
    placement?: 'top' | 'bottom' | 'left' | 'right'
  }>(),
  {
    label: undefined,
    placement: 'top',
  },
)
</script>

<template>
  <CdxButton
    v-tooltip:[placement]="text"
    class="info-tooltip"
    size="small"
    weight="quiet"
    :aria-label="label ?? text"
    @click.stop.prevent
  >
    <CdxIcon :icon="cdxIconInfo" size="x-small" />
  </CdxButton>
</template>

<style scoped>
.info-tooltip {
  min-width: 1.5rem;
  min-height: 1.5rem;
  padding: 0.125rem;
  vertical-align: middle;
}
</style>
