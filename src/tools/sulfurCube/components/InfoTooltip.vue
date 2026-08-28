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

:global(.cdx-tooltip) {
  box-sizing: border-box;
  width: max-content;
  max-width: min(32rem, calc(100vw - 2rem));
  border: 2px solid #202122;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  background: #fff;
  color: #202122;
  box-shadow: 0 2px 8px rgb(0 0 0 / 18%);
  line-height: 1.4;
  text-align: justify;
  white-space: normal;
}

:global(.dark .cdx-tooltip) {
  border-color: #fff;
  background: #202122;
  color: #fff;
}

@media (max-width: 32rem) {
  :global(.cdx-tooltip) {
    right: 1rem !important;
    left: 1rem !important;
    width: auto;
    max-width: none;
  }
}
</style>
