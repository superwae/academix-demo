import { applyAppearance } from './applyTheme'
import type { ThemeId, MixThemeId } from './themes'
import { normalizeAccentTheme, type ColorMode } from './themePresets'

const UI_STORAGE_KEY = 'academix.ui.v1'
const LEGACY_STORAGE_KEY = 'academix.data.v1'

type PersistedUi = {
  state?: {
    data?: {
      colorMode?: ColorMode
      theme?: ThemeId
      customThemeColor?: string
      mixTheme?: MixThemeId | null
    }
  }
}

function readPersistedUi(): PersistedUi['state'] | null {
  for (const key of [UI_STORAGE_KEY, LEGACY_STORAGE_KEY]) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as PersistedUi
      if (parsed?.state?.data) return parsed.state
    } catch {
      // try next key
    }
  }
  return null
}

export function initThemeFromStorage() {
  const persisted = readPersistedUi()
  const data = persisted?.data

  if (!data) {
    applyAppearance('light', 'light')
    return
  }

  if (data.colorMode) {
    applyAppearance(
      data.colorMode,
      normalizeAccentTheme(data.theme ?? 'light'),
      data.customThemeColor,
      data.mixTheme ?? undefined
    )
    return
  }

  const legacyTheme = data.theme ?? 'light'
  if (legacyTheme === 'dark') {
    applyAppearance('dark', 'light', data.customThemeColor, data.mixTheme ?? undefined)
    return
  }

  applyAppearance(
    'light',
    normalizeAccentTheme(legacyTheme),
    data.customThemeColor,
    data.mixTheme ?? undefined
  )
}
