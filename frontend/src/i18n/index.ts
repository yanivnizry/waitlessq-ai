import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

// Translation resources
import en from './locales/en.json'
import ar from './locales/ar.json'
import he from './locales/he.json'

// RTL languages
export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur']

// Available languages
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' }
]

// Check if language is RTL
export const isRTL = (language: string): boolean => {
  return RTL_LANGUAGES.includes(language)
}

// Get current language direction
export const getDirection = (language?: string): 'ltr' | 'rtl' => {
  const lang = language || i18n.language
  return isRTL(lang) ? 'rtl' : 'ltr'
}

// Update document direction
export const updateDocumentDirection = (language: string) => {
  const direction = getDirection(language)
  document.documentElement.dir = direction
  document.documentElement.lang = language
  
  // Update body class for styling
  document.body.classList.remove('rtl', 'ltr')
  document.body.classList.add(direction)
}

i18n
  // Load translation using http -> see /public/locales
  // Learn more: https://github.com/i18next/i18next-http-backend
  .use(Backend)
  // Detect user language
  // Learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    // Fallback language
    fallbackLng: 'en',
    
    // Debug mode (disable in production)
    debug: process.env.NODE_ENV === 'development',
    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    // Resources (embedded translations)
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      he: { translation: he }
    },
    
    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    // Backend options (for loading from /public/locales)
    backend: {
      loadPath: '/locales/{{lng}}.json',
    },
    
    // React options
    react: {
      useSuspense: false,
    }
  })

// Update direction when language changes
i18n.on('languageChanged', (lng) => {
  updateDocumentDirection(lng)
})

// Set initial direction
updateDocumentDirection(i18n.language)

export default i18n
