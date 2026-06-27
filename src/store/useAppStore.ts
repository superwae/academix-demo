import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeId, MixThemeId } from '../theme/themes'
import type { AccentThemeId, ColorMode } from '../theme/themePresets'
import { normalizeAccentTheme } from '../theme/themePresets'

export type AppData = {
  /** Light or dark appearance */
  colorMode: ColorMode
  /** Accent palette: purple, sky, light (neutral), custom, etc. */
  theme: AccentThemeId
  customThemeColor?: string
  mixTheme?: MixThemeId | null
}

type AppState = {
  data: AppData
  setColorMode: (mode: ColorMode) => void
  setTheme: (theme: AccentThemeId) => void
  setCustomThemeColor: (color: string) => void
  setMixTheme: (mix: MixThemeId | null) => void
}

function buildInitial(): AppData {
  return {
    colorMode: 'light',
    theme: 'light',
  }
}

type PersistedSlice = { data?: Partial<AppData> & { theme?: ThemeId } }

function migratePersisted(persistedState: unknown, version: number): { data: AppData } {
  const ps = persistedState as { state?: PersistedSlice } | PersistedSlice
  const wrapped = ps as { state?: PersistedSlice }
  const direct = ps as PersistedSlice
  const data = wrapped.state?.data ?? direct.data

  if (version >= 3 && data?.colorMode && data.theme) {
    return {
      data: {
        colorMode: data.colorMode,
        theme: normalizeAccentTheme(data.theme as ThemeId),
        customThemeColor: data.customThemeColor,
        mixTheme: data.mixTheme,
      },
    }
  }

  const legacyTheme = (data?.theme as ThemeId | undefined) ?? 'light'
  if (legacyTheme === 'dark') {
    return { data: { colorMode: 'dark', theme: 'light', customThemeColor: data?.customThemeColor, mixTheme: data?.mixTheme } }
  }

  return {
    data: {
      colorMode: 'light',
      theme: normalizeAccentTheme(legacyTheme),
      customThemeColor: data?.customThemeColor,
      mixTheme: data?.mixTheme,
    },
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      data: buildInitial(),

      setColorMode: (colorMode) => {
        set((s) => ({ data: { ...s.data, colorMode } }))
        void import('../theme/syncUserUiPreferences').then((m) => m.scheduleSyncUiPreferencesToServer())
      },

      setTheme: (theme) => {
        set((s) => ({
          data: {
            ...s.data,
            theme,
            customThemeColor: theme === 'custom' ? s.data.customThemeColor : undefined,
            mixTheme: theme === 'custom' ? s.data.mixTheme : undefined,
          },
        }))
        void import('../theme/syncUserUiPreferences').then((m) => m.scheduleSyncUiPreferencesToServer())
      },

      setCustomThemeColor: (color) => {
        set((s) => ({
          data: { ...s.data, customThemeColor: color, theme: 'custom', mixTheme: undefined },
        }))
        void import('../theme/syncUserUiPreferences').then((m) => m.scheduleSyncUiPreferencesToServer())
      },

      setMixTheme: (mix) => {
        set((s) => ({
          data: {
            ...s.data,
            mixTheme: mix ?? undefined,
            theme: mix ? 'custom' : s.data.theme,
            customThemeColor: mix ? undefined : s.data.customThemeColor,
          },
        }))
        void import('../theme/syncUserUiPreferences').then((m) => m.scheduleSyncUiPreferencesToServer())
      },
    }),
    {
      name: 'academix.ui.v1',
      version: 3,
      migrate: (persistedState, version) => {
        const migrated = migratePersisted(persistedState, version)
        const ps = persistedState as { state?: { data?: AppData } }
        if (ps.state) {
          return { ...ps, state: { ...ps.state, data: migrated.data }, version: 3 }
        }
        return { data: migrated.data, version: 3 }
      },
    },
  ),
)
