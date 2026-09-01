<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type { Je26_2PlayerMeleeWeaponPresetId } from '../data/je26_2'
import type { NumericFormValue, PlayerMeleeFormState } from './types'
import { CdxCheckbox, CdxField, CdxSelect, CdxTextInput } from '@wikimedia/codex'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { parseNumericInput, sanitizeNumericInput } from '../presentation/numericInput'
import { resolvePlayerMeleeVanillaSurvivalAvailability } from '../presets/playerMelee'
import InfoTooltip from './InfoTooltip.vue'

const props = defineProps<{
  modelValue: PlayerMeleeFormState
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PlayerMeleeFormState]
}>()

const { t } = useI18n()

const survivalAvailability = computed(() =>
  resolvePlayerMeleeVanillaSurvivalAvailability(props.modelValue),
)
const criticalHitSelectable = computed(() => {
  const attackStrengthPercent = parseNumericInput(props.modelValue.attackStrengthPercent)

  return attackStrengthPercent !== null && attackStrengthPercent > 90 && !props.modelValue.sprinting
})

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
  const next = { ...props.modelValue, ...fields }
  const attackStrengthPercent = parseNumericInput(next.attackStrengthPercent)

  if (attackStrengthPercent === null || attackStrengthPercent <= 90 || next.sprinting) {
    next.criticalHitConditions = false
  }

  emit('update:modelValue', next)
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
  update({ attackStrengthPercent: sanitizeNumericInput(value) })
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
        <template #label>
          <span class="player-attack__label-with-info">
            {{ t('sulfurCube.attack.attackStrength') }}
            <InfoTooltip
              :text="t('sulfurCube.attack.attackStrengthHelp')"
              :label="t('sulfurCube.attack.attackStrengthHelpLabel')"
            />
          </span>
        </template>
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
      <span :class="{ 'player-attack__critical--unavailable': !criticalHitSelectable }">
        <CdxCheckbox
          :model-value="modelValue.criticalHitConditions"
          :disabled="!criticalHitSelectable"
          @update:model-value="update({ criticalHitConditions: $event })"
        >
          {{ t('sulfurCube.attack.criticalConditions') }}
        </CdxCheckbox>
      </span>
    </div>

    <p
      v-if="!survivalAvailability.obtainable"
      class="player-attack__survival-warning"
      role="status"
    >
      {{ t('sulfurCube.attack.survivalUnavailable') }}
    </p>
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

.player-attack__label-with-info {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.player-attack__fields {
  display: grid;
  grid-template-columns: minmax(6.5rem, 0.68fr) minmax(7.5rem, 0.8fr) minmax(8rem, 1fr);
  gap: 0.5rem;
}

.player-attack__fields > * {
  min-width: 0;
}

.player-attack__fields :deep(.cdx-select-vue),
.player-attack__fields :deep(.cdx-text-input) {
  width: 100%;
  min-width: 0;
}

.player-attack__fields :deep(.cdx-select-vue__handle) {
  width: 100%;
  min-width: 0;
}

.player-attack__survival-warning {
  margin: -0.125rem 0 0;
  color: var(--color-error, #b32424);
  font-size: 0.8125rem;
  line-height: 1.35;
}

.player-attack__conditions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

.player-attack__critical--unavailable {
  opacity: 0.55;
}

@media (max-width: 34rem) {
  .player-attack__fields {
    grid-template-columns: 1fr;
  }
}
</style>
