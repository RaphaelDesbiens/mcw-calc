import * as vue from 'vue'
import { createMcwI18n } from '@/utils/i18n'
import { isEmbedded } from '@/utils/iframe'
import plugin from '@/utils/plugin'
import App from './App.vue'
import '@/init'

const targetEl = document.querySelector('#app')!

if (isEmbedded()) {
  document.documentElement.classList.add('sulfur-cube-embedded')
}

const i18n = createMcwI18n([import.meta.glob('./locale/*.json', { eager: true })])
vue.createApp(App).use(i18n).use(plugin).mount(targetEl)
