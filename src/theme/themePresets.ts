import type { ThemeId } from './themes'

/** Accent themes (excludes light/dark mode — those are colorMode). */
export type AccentThemeId = Exclude<ThemeId, 'dark'>

export const ACCENT_THEME_IDS: AccentThemeId[] = [
  'light',
  'purple',
  'sky',
  'sky-purple',
  'green',
  'emerald',
  'orange',
  'amber',
  'red',
  'rose',
  'pink',
  'indigo',
  'custom',
]

export type ColorMode = 'light' | 'dark'

/** Hue/sat presets used to build dark-mode accent palettes in applyTheme. */
export const ACCENT_DARK_PRESETS: Record<
  Exclude<AccentThemeId, 'light' | 'custom'>,
  { h: number; s: number; primaryS: number; primaryL: number }
> = {
  purple: { h: 270, s: 45, primaryS: 85, primaryL: 65 },
  sky: { h: 199, s: 50, primaryS: 89, primaryL: 55 },
  'sky-purple': { h: 268, s: 48, primaryS: 85, primaryL: 58 },
  green: { h: 142, s: 45, primaryS: 76, primaryL: 45 },
  emerald: { h: 160, s: 45, primaryS: 84, primaryL: 45 },
  orange: { h: 25, s: 50, primaryS: 95, primaryL: 55 },
  amber: { h: 43, s: 50, primaryS: 96, primaryL: 50 },
  red: { h: 0, s: 50, primaryS: 84, primaryL: 60 },
  rose: { h: 350, s: 48, primaryS: 89, primaryL: 60 },
  pink: { h: 330, s: 48, primaryS: 81, primaryL: 60 },
  indigo: { h: 262, s: 48, primaryS: 83, primaryL: 58 },
}

export function normalizeAccentTheme(theme: ThemeId): AccentThemeId {
  if (theme === 'dark') return 'light'
  return theme as AccentThemeId
}

export function isAccentThemeId(id: string): id is AccentThemeId {
  return ACCENT_THEME_IDS.includes(id as AccentThemeId)
}
