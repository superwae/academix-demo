import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeId, MixThemeId } from '../theme/themes'

export type AppData = {
  theme: ThemeId
  customThemeColor?: string // HSL color string for custom theme
  mixTheme?: MixThemeId | null // gradient mix (red-blue, etc.); clears when preset is chosen
}

type AppState = {
  data: AppData
  setTheme: (theme: ThemeId) => void
  setCustomThemeColor: (color: string) => void
  setMixTheme: (mix: MixThemeId | null) => void
}

function buildInitial(): AppData {
  return {
    theme: 'light',
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      data: buildInitial(),

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
          data: { ...s.data, customThemeColor: color, theme: 'custom' as ThemeId, mixTheme: undefined },
        }))
        void import('../theme/syncUserUiPreferences').then((m) => m.scheduleSyncUiPreferencesToServer())
      },

      setMixTheme: (mix) => {
        set((s) => ({
          data: {
            ...s.data,
            mixTheme: mix ?? undefined,
            theme: mix ? ('custom' as ThemeId) : s.data.theme,
            customThemeColor: mix ? undefined : s.data.customThemeColor,
          },
        }))
        void import('../theme/syncUserUiPreferences').then((m) => m.scheduleSyncUiPreferencesToServer())
      },

      // Theme state only. Course/enrollment/profile data comes from the API.
    }),
    {
      name: 'academix.ui.v1',
      version: 2,
    },
  ),
)
