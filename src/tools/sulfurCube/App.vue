<script setup lang="ts">
import { CdxMessage } from '@wikimedia/codex'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'

const { t } = useI18n()
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('sulfurCube.title') }}
    </template>

    <div class="flex flex-col gap-2">
      <CdxMessage type="notice">
        {{ t('sulfurCube.scope') }}
      </CdxMessage>
      <p>{{ t('sulfurCube.stage1') }}</p>
    </div>
  </CalcField>
</template>
