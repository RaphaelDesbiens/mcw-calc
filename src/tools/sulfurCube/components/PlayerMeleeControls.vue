<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type { Je26_2PlayerMeleeWeaponPresetId } from '../data/je26_2'
import type { NumericFormValue, PlayerMeleeFormState } from './types'
import { CdxCheckbox, CdxField, CdxSelect, CdxTextInput } from '@wikimedia/codex'
import { useI18n } from 'vue-i18n'
import InfoTooltip from './InfoTooltip.vue'

const props = defineProps<{
  modelValue: PlayerMeleeFormState
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PlayerMeleeFormState]
}>()

const { t } = useI18n()

const weaponItems: MenuItemData[] = [
  { value: 'bareHand', label: t('sulfurCube.attack.weapon.bareHand') },
  { value: 'ironSword', label: t('sulfurCube.attack.weapon.ironSword') },
]

const knockbackItems: MenuItemData[] = [
  { value: 0, label: t('sulfurCube.attack.knockback.none') },
  { value: 1, label: t('sulfurCube.attack.knockback.one') },
  { value: 2, label: t('sulfurCube.attack.knockback.two') },
]

function update(fields: Partial<PlayerMeleeFormState>): void {
  emit('update:modelValue', { ...props.modelValue, ...fields })
}

function updateWeapon(value: string | number | null): void {
  if (value === 'bareHand' || value === 'ironSword') {
    update({ weaponPresetId: value as Je26_2PlayerMeleeWeaponPresetId })
  }
}

function updateKnockback(value: string | number | null): void {
  if (value === 0 || value === 1 || value === 2) {
    update({ knockbackEnchantmentLevel: value })
  }
}

function updateAttackStrength(value: NumericFormValue): void {
  update({ attackStrengthPercent: value })
}
</script>

<template>
  <section class="player-attack" aria-labelledby="sulfur-cube-player-attack-title">
    <div class="player-attack__heading">
      <h4 id="sulfur-cube-player-attack-title">{{ t('sulfurCube.attack.title') }}</h4>
      <InfoTooltip :text="t('sulfurCube.attack.help')" :label="t('sulfurCube.attack.helpLabel')" />
    </div>

    <div class="player-attack__fields">
      <CdxField>
        <template #label>{{ t('sulfurCube.attack.weapon') }}</template>
        <CdxSelect
          :selected="modelValue.weaponPresetId"
          :menu-items="weaponItems"
          @update:selected="updateWeapon"
        />
      </CdxField>

      <CdxField>
        <template #label>{{ t('sulfurCube.attack.attackStrength') }}</template>
        <CdxTextInput
          :model-value="modelValue.attackStrengthPercent"
          input-type="number"
          min="0"
          max="100"
          step="1"
          @update:model-value="updateAttackStrength"
        />
      </CdxField>

      <CdxField>
        <template #label>{{ t('sulfurCube.attack.knockback') }}</template>
        <CdxSelect
          :selected="modelValue.knockbackEnchantmentLevel"
          :menu-items="knockbackItems"
          @update:selected="updateKnockback"
        />
      </CdxField>
    </div>

    <div class="player-attack__conditions">
      <CdxCheckbox
        :model-value="modelValue.sprinting"
        @update:model-value="update({ sprinting: $event })"
      >
        {{ t('sulfurCube.attack.sprinting') }}
      </CdxCheckbox>
      <CdxCheckbox
        :model-value="modelValue.criticalHitConditions"
        @update:model-value="update({ criticalHitConditions: $event })"
      >
        {{ t('sulfurCube.attack.criticalConditions') }}
      </CdxCheckbox>
    </div>
  </section>
</template>

<style scoped>
.player-attack {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: 2px;
}

.player-attack__heading {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.player-attack__heading h4 {
  margin: 0;
}

.player-attack__fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.player-attack__conditions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

@media (max-width: 34rem) {
  .player-attack__fields {
    grid-template-columns: 1fr;
  }
}
</style>
