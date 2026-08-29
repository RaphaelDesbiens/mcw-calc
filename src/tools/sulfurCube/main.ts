import * as vue from 'vue'
import { createMcwI18n } from '@/utils/i18n'
import { isEmbedded } from '@/utils/iframe'
import { getParams } from '@/utils/params'
import plugin from '@/utils/plugin'
import App from './App.vue'
import { parseSulfurCubeViewMode } from './presentation/viewMode'
import '@/init'

const targetEl = document.querySelector('#app')!

if (isEmbedded()) {
  document.documentElement.classList.add('sulfur-cube-embedded')
}

const i18n = createMcwI18n([import.meta.glob('./locale/*.json', { eager: true })])

;(async () => {
  const params = await getParams()
  const viewMode = parseSulfurCubeViewMode(params.view)

  vue.createApp(App, { viewMode }).use(i18n).use(plugin).mount(targetEl)
})()
