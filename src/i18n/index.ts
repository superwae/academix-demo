/**
 * i18n setup for AcademixLMS.
 *
 * Architecture notes:
 * - Built on i18next + react-i18next + browser language detector.
 * - Locales live in `src/i18n/locales/<lang>/<namespace>.json`.
 * - Adding a new language = one new folder with the same namespace files
 *   + one row in the `SUPPORTED_LOCALES` list below. No code changes.
 * - The active language is persisted to localStorage (`academix.locale`).
 * - Language direction (ltr / rtl) is stored per locale and applied to
 *   <html> so Tailwind logical properties (ms-, me-, ps-, pe-, start-,
 *   end-, text-start, text-end) swap automatically.
 * - Fonts: each locale declares a `fontFamily` CSS class that's toggled on
 *   <html>. English uses Inter (already loaded). Arabic uses Cairo; the
 *   font-face is loaded on demand so English users don't pay the bytes.
 */

import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// English resources (eager — always available as fallback)
import enCommon from './locales/en/common.json'
import enNav from './locales/en/nav.json'
import enAuth from './locales/en/auth.json'
import enErrors from './locales/en/errors.json'
import enPublic from './locales/en/public.json'
import enStudent from './locales/en/student.json'
import enTeacher from './locales/en/teacher.json'
import enAdmin from './locales/en/admin.json'

// Arabic resources (eager for now — small enough to ship in initial bundle).
// If bundle size becomes a concern, switch to dynamic import + i18next-http-backend.
import arCommon from './locales/ar/common.json'
import arNav from './locales/ar/nav.json'
import arAuth from './locales/ar/auth.json'
import arErrors from './locales/ar/errors.json'
import arPublic from './locales/ar/public.json'
import arStudent from './locales/ar/student.json'
import arTeacher from './locales/ar/teacher.json'
import arAdmin from './locales/ar/admin.json'

export type LocaleDirection = 'ltr' | 'rtl'

export interface LocaleDefinition {
  /** BCP 47 language tag (e.g. 'en', 'ar', 'fr-CA'). */
  code: string
  /** Name shown in the language picker, in the language's own script. */
  nativeName: string
  /** English name, for tooltips / debugging. */
  englishName: string
  dir: LocaleDirection
  /** Value applied to <html class> for font switching. */
  fontClass: string
}

/**
 * Locales supported by the app. Add a new entry + translation files and the
 * app picks it up automatically. No other code change required.
 */
export const SUPPORTED_LOCALES: LocaleDefinition[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', dir: 'ltr', fontClass: 'font-sans-latin' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl', fontClass: 'font-sans-arabic' },
]

export const DEFAULT_LOCALE = 'en'
export const LOCALE_STORAGE_KEY = 'academix.locale'

export const NAMESPACES = [
  'common',
  'nav',
  'auth',
  'errors',
  'public',
  'student',
  'teacher',
  'admin',
] as const
export type Namespace = (typeof NAMESPACES)[number]

const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    auth: enAuth,
    errors: enErrors,
    public: enPublic,
    student: enStudent,
    teacher: enTeacher,
    admin: enAdmin,
  },
  ar: {
    common: arCommon,
    nav: arNav,
    auth: arAuth,
    errors: arErrors,
    public: arPublic,
    student: arStudent,
    teacher: arTeacher,
    admin: arAdmin,
  },
}

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES.map((l) => l.code),
    defaultNS: 'common',
    ns: [...NAMESPACES],
    interpolation: { escapeValue: false }, // React already escapes
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    returnNull: false,
  })

/** Look up a locale definition by its code. Falls back to the default. */
export function getLocale(code: string | undefined): LocaleDefinition {
  return SUPPORTED_LOCALES.find((l) => l.code === code) ?? SUPPORTED_LOCALES[0]
}

/**
 * Sync <html lang> / <html dir> / font class to the active language.
 * Call after every language change.
 */
export function applyLocaleToDocument(code: string | undefined) {
  const locale = getLocale(code)
  const html = document.documentElement
  html.setAttribute('lang', locale.code)
  html.setAttribute('dir', locale.dir)
  // Remove other locale font classes, then set this one.
  for (const other of SUPPORTED_LOCALES) {
    html.classList.remove(other.fontClass)
  }
  html.classList.add(locale.fontClass)
}

/** Change the active language and persist it. */
export async function changeLanguage(code: string) {
  await i18next.changeLanguage(code)
  applyLocaleToDocument(code)
}

// Initial application on module load (after init ran).
applyLocaleToDocument(i18next.language)

i18next.on('languageChanged', (lng) => {
  applyLocaleToDocument(lng)
})

export { i18next }
export default i18next
