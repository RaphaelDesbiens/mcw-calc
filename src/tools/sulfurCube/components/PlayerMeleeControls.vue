<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type { Je26_2PlayerMeleeWeaponType, Je26_2ToolMaterialId } from '../data/je26_2'
import type { NumericFormValue, PlayerMeleeFormState } from './types'
import { CdxCheckbox, CdxField, CdxSelect, CdxTextInput } from '@wikimedia/codex'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  je26_2PlayerMeleeMechanics,
  je26_2ToolMaterialOrder,
  resolveJe26_2PlayerMeleeWeaponPreset,
} from '../data/je26_2'
import { parseNumericInput, sanitizeNumericInput } from '../presentation/numericInput'
import { resolvePlayerMeleeVanillaSurvivalAvailability } from '../presets/playerMelee'
import InfoTooltip from './InfoTooltip.vue'

const props = defineProps<{ modelValue: PlayerMeleeFormState }>()
const emit = defineEmits<{ 'update:modelValue': [value: PlayerMeleeFormState] }>()
const { t } = useI18n()
const maximumEnchantmentLevel = je26_2PlayerMeleeMechanics.maximumDecodedEnchantmentLevel

const weaponTypeItems = computed<MenuItemData[]>(() => [
  { value: 'bareHand', label: t('sulfurCube.attack.weaponType.bareHand') },
  { value: 'sword', label: t('sulfurCube.attack.weaponType.sword') },
  { value: 'axe', label: t('sulfurCube.attack.weaponType.axe') },
])
const materialItems = computed<MenuItemData[]>(() =>
  je26_2ToolMaterialOrder.map((material) => ({
    value: material,
    label: t(`sulfurCube.attack.material.${material}`),
  })),
)
const weaponPreset = computed(() =>
  resolveJe26_2PlayerMeleeWeaponPreset(
    props.modelValue.weaponType === 'bareHand'
      ? { type: 'bareHand' }
      : {
          type: props.modelValue.weaponType,
          material: props.modelValue.weaponMaterial,
        },
  ),
)
const survivalAvailability = computed(() => {
  const levelSelection = (value: NumericFormValue) => ({
    enabled: true as const,
    level: parseNumericInput(value) ?? Number.NaN,
  })

  return resolvePlayerMeleeVanillaSurvivalAvailability({
    weapon:
      props.modelValue.weaponType === 'bareHand'
        ? { type: 'bareHand' }
        : {
            type: props.modelValue.weaponType,
            material: props.modelValue.weaponMaterial,
          },
    sharpness: props.modelValue.sharpnessEnabled
      ? levelSelection(props.modelValue.sharpnessLevel)
      : { enabled: false },
    knockback: props.modelValue.knockbackEnabled
      ? levelSelection(props.modelValue.knockbackLevel)
      : { enabled: false },
  })
})
const criticalHitSelectable = computed(() => {
  const attackStrengthPercent = parseNumericInput(props.modelValue.attackStrengthPercent)
  return attackStrengthPercent !== null && attackStrengthPercent > 90 && !props.modelValue.sprinting
})

function update(fields: Partial<PlayerMeleeFormState>): void {
  const next = { ...props.modelValue, ...fields }
  const attackStrengthPercent = parseNumericInput(next.attackStrengthPercent)
  if (attackStrengthPercent === null || attackStrengthPercent <= 90 || next.sprinting) {
    next.criticalHitConditions = false
  }
  emit('update:modelValue', next)
}

function updateWeaponType(value: string | number | null): void {
  if (value === 'bareHand' || value === 'sword' || value === 'axe') {
    update({ weaponType: value as Je26_2PlayerMeleeWeaponType })
  }
}

function updateMaterial(value: string | number | null): void {
  if (je26_2ToolMaterialOrder.includes(value as Je26_2ToolMaterialId)) {
    update({ weaponMaterial: value as Je26_2ToolMaterialId })
  }
}

function updateNumeric(
  field: 'attackStrengthPercent' | 'sharpnessLevel' | 'knockbackLevel',
  value: NumericFormValue,
): void {
  update({ [field]: sanitizeNumericInput(value) })
}

function warningKey(code: string): string {
  return `sulfurCube.attack.availability.${code}`
}
</script>

<template>
  <section class="player-attack" aria-labelledby="sulfur-cube-player-attack-title">
    <div class="player-attack__heading">
      <h4 id="sulfur-cube-player-attack-title">{{ t('sulfurCube.attack.title') }}</h4>
      <InfoTooltip :text="t('sulfurCube.attack.help')" :label="t('sulfurCube.attack.helpLabel')" />
    </div>

    <div class="player-attack__weapon-row">
      <CdxField>
        <template #label>{{ t('sulfurCube.attack.weapon') }}</template>
        <CdxSelect
          :selected="modelValue.weaponType"
          :menu-items="weaponTypeItems"
          @update:selected="updateWeaponType"
        />
      </CdxField>
      <CdxField v-if="modelValue.weaponType !== 'bareHand'">
        <template #label>{{ t('sulfurCube.attack.material') }}</template>
        <CdxSelect
          :selected="modelValue.weaponMaterial"
          :menu-items="materialItems"
          @update:selected="updateMaterial"
        />
      </CdxField>
      <dl class="player-attack__derived">
        <div>
          <dt>{{ t('sulfurCube.attack.effectiveDamage') }}</dt>
          <dd>{{ weaponPreset.effectiveAttackDamage.value }}</dd>
        </div>
        <div>
          <dt>{{ t('sulfurCube.attack.effectiveSpeed') }}</dt>
          <dd>{{ weaponPreset.effectiveAttackSpeed.value }}</dd>
        </div>
        <div>
          <dt>{{ t('sulfurCube.attack.recoveryTicks') }}</dt>
          <dd>
            {{
              weaponPreset.recoveryPeriodTicks.value.toFixed(
                weaponPreset.recoveryPeriodTicks.value % 1 === 0 ? 0 : 2,
              )
            }}
          </dd>
        </div>
      </dl>
    </div>

    <div class="player-attack__configuration-row">
      <CdxField class="player-attack__strength">
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
          @update:model-value="updateNumeric('attackStrengthPercent', $event)"
        />
      </CdxField>

      <div class="player-attack__enchantment">
        <CdxCheckbox
          :model-value="modelValue.sharpnessEnabled"
          @update:model-value="update({ sharpnessEnabled: $event })"
        >
          {{ t('sulfurCube.attack.sharpness') }}
        </CdxCheckbox>
        <CdxTextInput
          v-if="modelValue.sharpnessEnabled"
          :model-value="modelValue.sharpnessLevel"
          :aria-label="
            t('sulfurCube.attack.enchantmentLevel', {
              enchantment: t('sulfurCube.attack.sharpness'),
            })
          "
          input-type="number"
          min="1"
          :max="maximumEnchantmentLevel"
          step="1"
          @update:model-value="updateNumeric('sharpnessLevel', $event)"
        />
      </div>

      <div class="player-attack__enchantment">
        <CdxCheckbox
          :model-value="modelValue.knockbackEnabled"
          @update:model-value="update({ knockbackEnabled: $event })"
        >
          {{ t('sulfurCube.attack.knockback') }}
        </CdxCheckbox>
        <CdxTextInput
          v-if="modelValue.knockbackEnabled"
          :model-value="modelValue.knockbackLevel"
          :aria-label="
            t('sulfurCube.attack.enchantmentLevel', {
              enchantment: t('sulfurCube.attack.knockback'),
            })
          "
          input-type="number"
          min="1"
          :max="maximumEnchantmentLevel"
          step="1"
          @update:model-value="updateNumeric('knockbackLevel', $event)"
        />
      </div>
    </div>

    <p class="player-attack__level-note">
      {{ t('sulfurCube.attack.levelNote', { maximum: maximumEnchantmentLevel }) }}
    </p>

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

    <ul
      v-if="survivalAvailability && !survivalAvailability.obtainable"
      class="player-attack__survival-warning"
      role="status"
    >
      <li v-for="issue in survivalAvailability.issues" :key="`${issue.enchantment}-${issue.code}`">
        {{
          t(warningKey(issue.code), {
            enchantment: t(`sulfurCube.attack.${issue.enchantment}`),
            level: issue.selectedLevel,
            maximum: issue.maximumLevel,
          })
        }}
      </li>
    </ul>
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
.player-attack__heading,
.player-attack__label-with-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.player-attack__heading h4 {
  margin: 0;
}
.player-attack__weapon-row {
  display: grid;
  grid-template-columns: minmax(7rem, 0.65fr) minmax(7rem, 0.7fr) minmax(14rem, 1.65fr);
  gap: 0.5rem;
  align-items: end;
}
.player-attack__derived {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin: 0;
  padding: 0.45rem 0.6rem;
  background: var(--background-color-interactive-subtle, #f8f9fa);
}
.player-attack__derived dt {
  color: var(--color-subtle, #54595d);
  font-size: 0.75rem;
}
.player-attack__derived dd {
  margin: 0.1rem 0 0;
  font-variant-numeric: tabular-nums;
}
.player-attack__configuration-row {
  display: grid;
  grid-template-columns: minmax(8rem, 1fr) minmax(8rem, 0.8fr) minmax(8rem, 0.8fr);
  gap: 0.75rem;
  align-items: end;
}
.player-attack__enchantment {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 4.5rem;
  align-items: center;
  gap: 0.35rem;
  min-height: 2rem;
}
.player-attack__level-note {
  margin: -0.25rem 0 0;
  color: var(--color-subtle, #54595d);
  font-size: 0.75rem;
}
.player-attack__survival-warning {
  margin: -0.125rem 0 0;
  padding-left: 1.25rem;
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
.player-attack__weapon-row > *,
.player-attack__configuration-row > * {
  min-width: 0;
}
.player-attack :deep(.cdx-select-vue),
.player-attack :deep(.cdx-text-input),
.player-attack :deep(.cdx-select-vue__handle) {
  width: 100%;
  min-width: 0;
}
@media (max-width: 48rem) {
  .player-attack__weapon-row,
  .player-attack__configuration-row {
    grid-template-columns: 1fr 1fr;
  }
  .player-attack__derived {
    grid-column: 1 / -1;
  }
}
@media (max-width: 34rem) {
  .player-attack__weapon-row,
  .player-attack__configuration-row {
    grid-template-columns: 1fr;
  }
  .player-attack__derived {
    grid-template-columns: 1fr;
  }
}
</style>
