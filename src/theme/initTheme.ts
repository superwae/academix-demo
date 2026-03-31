import { applyTheme } from './applyTheme'
import type { ThemeId, MixThemeId } from './themes'

export function initThemeFromStorage() {
  try {
    const raw = localStorage.getItem('academix.data.v1')
    if (!raw) {
      applyTheme('light')
      return
    }
    const parsed = JSON.parse(raw) as {
      state?: { data?: { theme?: ThemeId; customThemeColor?: string; mixTheme?: MixThemeId | null } }
    }
    const t = parsed?.state?.data?.theme
    const customColor = parsed?.state?.data?.customThemeColor
    const mix = parsed?.state?.data?.mixTheme ?? undefined
    applyTheme(t ?? 'light', customColor, mix)
  } catch {
    applyTheme('light')
  }
}



