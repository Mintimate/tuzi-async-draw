import { createI18n } from 'vue-i18n'
import en from '../locales/en'
import zh from '../locales/zh'

const i18n = createI18n({
  legacy: false, // 使用 Composition API
  locale: localStorage.getItem('tuzi_lang') || 'zh', // 默认中文
  fallbackLocale: 'en',
  messages: {
    zh,
    en
  }
})

export default i18n
