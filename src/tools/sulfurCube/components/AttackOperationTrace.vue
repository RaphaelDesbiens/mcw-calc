<script setup lang="ts">
import type { VelocityOperationResult } from '../model/types'
import type { PlayerMeleeEvaluation } from '../presets/playerMelee'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    evaluation: PlayerMeleeEvaluation
    showTitle?: boolean
  }>(),
  {
    showTitle: true,
  },
)

const { t } = useI18n()
const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 3,
  minimumFractionDigits: 0,
  useGrouping: false,
})

function formatNumber(value: number): string {
  return numberFormatter.format(Object.is(value, -0) ? 0 : value)
}

function formatVector(vector: {
  readonly x: number
  readonly y: number
  readonly z: number
}): string {
  return `(${formatNumber(vector.x)}, ${formatNumber(vector.y)}, ${formatNumber(vector.z)})`
}

function operationTitle(result: VelocityOperationResult): string {
  if (result.operation.provenance.reason === 'ordinaryAcceptedHit') {
    return t('sulfurCube.attack.trace.ordinary')
  }

  if (result.operation.provenance.reason === 'combinedKnockbackAndSprint') {
    return t('sulfurCube.attack.trace.extra')
  }

  return result.operation.provenance.reason
}

function providerLabel(result: VelocityOperationResult): string {
  if (result.operation.providerId === 'nonProjectileSourcePosition') {
    return t('sulfurCube.attack.trace.provider.position')
  }

  if (result.operation.providerId === 'callerYaw') {
    return t('sulfurCube.attack.trace.provider.yaw')
  }

  return result.operation.providerId
}

const diagnostics = computed(() => props.evaluation.attackResolution.diagnostics)
</script>

<template>
  <section
    class="attack-trace"
    :aria-labelledby="showTitle ? 'sulfur-cube-attack-trace-title' : undefined"
    :aria-label="showTitle ? undefined : t('sulfurCube.attack.trace.title')"
  >
    <h3 v-if="showTitle" id="sulfur-cube-attack-trace-title">
      {{ t('sulfurCube.attack.trace.title') }}
    </h3>
    <p class="attack-trace__intro">{{ t('sulfurCube.attack.trace.intro') }}</p>

    <dl class="attack-trace__summary">
      <div>
        <dt>{{ t('sulfurCube.attack.trace.effectiveDamage') }}</dt>
        <dd>{{ formatNumber(diagnostics.effectiveAttackDamage) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.effectiveSpeed') }}</dt>
        <dd>{{ formatNumber(evaluation.weaponPreset.effectiveAttackSpeed.value) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.recoveryTicks') }}</dt>
        <dd>{{ formatNumber(evaluation.weaponPreset.recoveryPeriodTicks.value) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.attackStrengthSquared') }}</dt>
        <dd>{{ formatNumber(diagnostics.attackStrengthSquared) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.baseDamageScale') }}</dt>
        <dd>{{ formatNumber(diagnostics.baseDamageScale) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.scaledBaseDamage') }}</dt>
        <dd>{{ formatNumber(diagnostics.scaledBaseDamage) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.sharpnessBonus') }}</dt>
        <dd>{{ formatNumber(diagnostics.damageEnchantmentBonus) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.scaledSharpnessBonus') }}</dt>
        <dd>{{ formatNumber(diagnostics.magicBoost) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.baseBeforeCritical') }}</dt>
        <dd>{{ formatNumber(diagnostics.baseDamageBeforeCritical) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.damageAfterCritical') }}</dt>
        <dd>{{ formatNumber(diagnostics.damageAfterCritical) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.damage') }}</dt>
        <dd>{{ formatNumber(diagnostics.damageArgument) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.fullStrength') }}</dt>
        <dd>{{ diagnostics.fullStrength ? t('sulfurCube.yes') : t('sulfurCube.no') }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.critical') }}</dt>
        <dd>{{ diagnostics.critical ? t('sulfurCube.yes') : t('sulfurCube.no') }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.healthDamageApplied') }}</dt>
        <dd>{{ diagnostics.healthDamageApplied ? t('sulfurCube.yes') : t('sulfurCube.no') }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.enchantmentKnockbackAddition') }}</dt>
        <dd>{{ formatNumber(diagnostics.enchantmentKnockbackAddition) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.knockbackBeforeHalving') }}</dt>
        <dd>{{ formatNumber(diagnostics.knockbackBeforeHalving) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.knockbackAfterHalving') }}</dt>
        <dd>{{ formatNumber(diagnostics.knockbackAfterHalving) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.sprintKnockbackBonus') }}</dt>
        <dd>{{ formatNumber(diagnostics.sprintKnockbackBonus) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.combinedKnockback') }}</dt>
        <dd>{{ formatNumber(diagnostics.combinedKnockback) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.effectFactor') }}</dt>
        <dd>{{ formatNumber(diagnostics.effectFactor) }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.operationCount') }}</dt>
        <dd>{{ evaluation.operationSequence.operationResults.length }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.trace.yaw') }}</dt>
        <dd>{{ formatNumber(evaluation.attackerYawDegrees) }}°</dd>
      </div>
    </dl>

    <ol class="attack-trace__operations">
      <li
        v-for="(result, index) in evaluation.operationSequence.operationResults"
        :key="`${result.kind}-${index}`"
        class="attack-trace__operation"
      >
        <h4>{{ index + 1 }}. {{ operationTitle(result) }}</h4>
        <dl>
          <div>
            <dt>{{ t('sulfurCube.attack.trace.directionProvider') }}</dt>
            <dd>{{ providerLabel(result) }}</dd>
          </div>
          <template v-if="result.kind === 'sulfurCubeKnockbackCall'">
            <div>
              <dt>{{ t('sulfurCube.attack.trace.callDamage') }}</dt>
              <dd>{{ formatNumber(result.operation.call.damageArgument) }}</dd>
            </div>
            <div>
              <dt>{{ t('sulfurCube.attack.trace.callEffect') }}</dt>
              <dd>{{ formatNumber(result.knockbackResult.diagnostics.effectFactor) }}</dd>
            </div>
          </template>
          <div>
            <dt>{{ t('sulfurCube.attack.trace.before') }}</dt>
            <dd>{{ formatVector(result.existingVelocity) }}</dd>
          </div>
          <div>
            <dt>{{ t('sulfurCube.attack.trace.added') }}</dt>
            <dd>{{ formatVector(result.addedVelocity) }}</dd>
          </div>
          <div>
            <dt>{{ t('sulfurCube.attack.trace.after') }}</dt>
            <dd>{{ formatVector(result.resultingVelocity) }}</dd>
          </div>
        </dl>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.attack-trace {
  min-width: 0;
}

.attack-trace h3,
.attack-trace__intro {
  margin: 0 0 0.75rem;
}

.attack-trace__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
  gap: 0.5rem;
  margin: 0 0 1rem;
}

.attack-trace__summary > div,
.attack-trace__operation {
  padding: 0.625rem;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: 2px;
  background: var(--background-color-interactive-subtle, #f8f9fa);
}

.attack-trace dt {
  color: var(--color-subtle, #54595d);
  font-size: 0.875em;
}

.attack-trace dd {
  margin: 0.125rem 0 0;
  overflow-wrap: anywhere;
}

.attack-trace__summary dd,
.attack-trace__operation dd {
  font-family: monospace;
  font-variant-numeric: tabular-nums;
}

.attack-trace__operations {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.attack-trace__operation h4 {
  margin: 0 0 0.5rem;
}

.attack-trace__operation dl {
  display: grid;
  grid-template-columns: minmax(8rem, 0.9fr) minmax(0, 1.1fr);
  gap: 0.25rem 0.75rem;
  margin: 0;
}

@media (max-width: 36rem) {
  .attack-trace__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .attack-trace__operation dl {
    grid-template-columns: 1fr;
  }
}
</style>
