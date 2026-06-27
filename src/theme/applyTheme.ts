import type { ThemeId } from './themes'
import type { MixThemeId } from './themes'
import { MIX_THEMES } from './themes'
import {
  ACCENT_DARK_PRESETS,
  type AccentThemeId,
  type ColorMode,
  normalizeAccentTheme,
} from './themePresets'

const CUSTOM_VARS = [
  '--primary', '--ring', '--primary-foreground', '--gradient-primary',
  '--background', '--foreground', '--card', '--card-foreground',
  '--popover', '--popover-foreground', '--border', '--input',
  '--muted', '--muted-foreground', '--secondary', '--secondary-foreground',
  '--accent', '--accent-foreground', '--gradient-card',
  '--status-success-fg', '--status-warning-fg', '--status-error-fg', '--status-info-fg',
  '--status-green-fg', '--status-purple-fg', '--status-orange-fg', '--status-star-fg',
] as const

function clearCustomVars() {
  CUSTOM_VARS.forEach((v) => document.documentElement.style.removeProperty(v))
}

function applyDarkAccentTheme(accent: Exclude<AccentThemeId, 'light' | 'custom'>) {
  const preset = ACCENT_DARK_PRESETS[accent]
  const { h, s, primaryS, primaryL } = preset
  const bgS = Math.min(s, 32)
  const surfaceS = Math.min(s, 28)

  document.documentElement.style.setProperty('--background', `${h} ${bgS}% 5%`)
  document.documentElement.style.setProperty('--foreground', `${h} 20% 96%`)
  document.documentElement.style.setProperty('--card', `${h} ${surfaceS}% 9%`)
  document.documentElement.style.setProperty('--card-foreground', `${h} 18% 96%`)
  document.documentElement.style.setProperty('--popover', `${h} ${surfaceS}% 9%`)
  document.documentElement.style.setProperty('--popover-foreground', `${h} 18% 96%`)
  document.documentElement.style.setProperty('--border', `${h} ${Math.min(s, 22)}% 22%`)
  document.documentElement.style.setProperty('--input', `${h} ${Math.min(s, 22)}% 16%`)
  document.documentElement.style.setProperty('--muted', `${h} ${Math.min(s, 20)}% 14%`)
  document.documentElement.style.setProperty('--muted-foreground', `${h} 12% 72%`)
  document.documentElement.style.setProperty('--secondary', `${h} ${Math.min(s, 22)}% 16%`)
  document.documentElement.style.setProperty('--secondary-foreground', `${h} 18% 96%`)
  document.documentElement.style.setProperty('--accent', `${h} ${Math.min(s, 30)}% 18%`)
  document.documentElement.style.setProperty('--accent-foreground', `${h} 18% 96%`)
  document.documentElement.style.setProperty('--primary', `${h} ${primaryS}% ${primaryL}%`)
  document.documentElement.style.setProperty('--ring', `${(h + 25) % 360} ${Math.min(100, primaryS + 8)}% ${primaryL}%`)
  document.documentElement.style.setProperty(
    '--primary-foreground',
    primaryL > 52 ? '0 0% 0%' : '0 0% 100%'
  )
  document.documentElement.style.setProperty(
    '--gradient-primary',
    `linear-gradient(135deg, hsl(${h} ${primaryS}% ${primaryL}%) 0%, hsl(${(h + 20) % 360} ${primaryS}% ${Math.min(100, primaryL + 5)}%) 100%)`
  )
  document.documentElement.style.setProperty(
    '--gradient-card',
    `linear-gradient(135deg, hsl(${h} ${surfaceS}% 11%) 0%, hsl(${h} ${surfaceS}% 8%) 100%)`
  )

  // Status colors tuned for dark surfaces
  document.documentElement.style.setProperty('--status-success-fg', '158 64% 52%')
  document.documentElement.style.setProperty('--status-warning-fg', '43 96% 56%')
  document.documentElement.style.setProperty('--status-error-fg', '0 91% 71%')
  document.documentElement.style.setProperty('--status-info-fg', `${h} 90% 70%`)
  document.documentElement.style.setProperty('--status-green-fg', '142 69% 58%')
  document.documentElement.style.setProperty('--status-purple-fg', '270 95% 75%')
  document.documentElement.style.setProperty('--status-orange-fg', '27 96% 61%')
  document.documentElement.style.setProperty('--status-star-fg', '43 96% 65%')
}

function applyCustomTheme(customColor: string, colorMode: ColorMode) {
  const hsl = parseHsl(customColor)
  if (!hsl) return

  const { h, s, l } = hsl
  document.documentElement.style.setProperty('--primary', `${h} ${s}% ${l}%`)
  const ringHue = (h + 30) % 360
  document.documentElement.style.setProperty('--ring', `${ringHue} ${Math.min(100, s + 10)}% ${l}%`)
  const primaryFg = l > 50 ? '0 0% 0%' : '0 0% 100%'
  document.documentElement.style.setProperty('--primary-foreground', primaryFg)
  const gradientEndHue = (h + 20) % 360
  document.documentElement.style.setProperty(
    '--gradient-primary',
    `linear-gradient(135deg, hsl(${h} ${s}% ${l}%) 0%, hsl(${gradientEndHue} ${s}% ${Math.min(100, l + 5)}%) 100%)`
  )

  if (colorMode === 'dark') {
    const bgS = Math.min(s, 32)
    document.documentElement.style.setProperty('--background', `${h} ${bgS}% 5%`)
    document.documentElement.style.setProperty('--foreground', `${h} 20% 96%`)
    document.documentElement.style.setProperty('--card', `${h} ${Math.min(s, 28)}% 9%`)
    document.documentElement.style.setProperty('--card-foreground', `${h} 18% 96%`)
    document.documentElement.style.setProperty('--popover', `${h} ${Math.min(s, 28)}% 9%`)
    document.documentElement.style.setProperty('--popover-foreground', `${h} 18% 96%`)
    document.documentElement.style.setProperty('--border', `${h} ${Math.min(s, 22)}% 22%`)
    document.documentElement.style.setProperty('--input', `${h} ${Math.min(s, 22)}% 16%`)
    document.documentElement.style.setProperty('--muted', `${h} ${Math.min(s, 20)}% 14%`)
    document.documentElement.style.setProperty('--muted-foreground', `${h} 12% 72%`)
    document.documentElement.style.setProperty('--secondary', `${h} ${Math.min(s, 22)}% 16%`)
    document.documentElement.style.setProperty('--secondary-foreground', `${h} 18% 96%`)
    document.documentElement.style.setProperty('--accent', `${h} ${Math.min(s, 30)}% 18%`)
    document.documentElement.style.setProperty('--accent-foreground', `${h} 18% 96%`)
    document.documentElement.style.setProperty(
      '--gradient-card',
      `linear-gradient(135deg, hsl(${h} ${Math.min(s, 28)}% 11%) 0%, hsl(${h} ${Math.min(s, 28)}% 8%) 100%)`
    )
  } else {
    const bgS = 50
    const bgL = 96
    document.documentElement.style.setProperty('--background', `${h} ${bgS}% ${bgL}%`)
    document.documentElement.style.setProperty('--foreground', `${h} 55% 10%`)
    document.documentElement.style.setProperty('--card', `${h} 45% 98%`)
    document.documentElement.style.setProperty('--card-foreground', `${h} 55% 10%`)
    document.documentElement.style.setProperty('--popover', `${h} 45% 98%`)
    document.documentElement.style.setProperty('--popover-foreground', `${h} 55% 10%`)
    document.documentElement.style.setProperty('--border', `${h} 35% 85%`)
    document.documentElement.style.setProperty('--input', `${h} 40% 90%`)
    document.documentElement.style.setProperty('--muted', `${h} 45% 92%`)
    document.documentElement.style.setProperty('--muted-foreground', `${h} 20% 42%`)
    document.documentElement.style.setProperty('--secondary', `${h} 55% 94%`)
    document.documentElement.style.setProperty('--secondary-foreground', `${h} 55% 10%`)
    document.documentElement.style.setProperty('--accent', `${h} 60% 88%`)
    document.documentElement.style.setProperty('--accent-foreground', `${h} 55% 10%`)
    document.documentElement.style.setProperty(
      '--gradient-card',
      `linear-gradient(135deg, hsl(${h} 45% 98%) 0%, hsl(${h} 50% 94%) 100%)`
    )
  }
}

/** @deprecated Use applyAppearance instead */
export function applyTheme(theme: ThemeId, customColor?: string, mixThemeId?: MixThemeId | null) {
  const colorMode: ColorMode = theme === 'dark' ? 'dark' : 'light'
  const accent = normalizeAccentTheme(theme)
  applyAppearance(colorMode, accent, customColor, mixThemeId)
}

export function applyAppearance(
  colorMode: ColorMode,
  accentTheme: AccentThemeId,
  customColor?: string,
  mixThemeId?: MixThemeId | null
) {
  document.documentElement.setAttribute('data-color-mode', colorMode)
  document.documentElement.setAttribute('data-theme', accentTheme)

  if (mixThemeId) {
    const mix = MIX_THEMES.find((m) => m.id === mixThemeId)
    if (mix) {
      const gradient = `linear-gradient(135deg, ${mix.color1} 0%, ${mix.color2} 100%)`
      document.documentElement.style.setProperty('--background-gradient', gradient)
      document.documentElement.setAttribute('data-mix-theme', mixThemeId)
      const hsl1 = parseHsl(mix.color1)
      const hsl2 = parseHsl(mix.color2)
      if (hsl1 && hsl2) {
        const l1 = hsl1.l
        const l2 = hsl2.l
        const isDarkMix = l1 < 45 || l2 < 45
        let primaryHsl: { h: number; s: number; l: number }
        if (mixThemeId === 'black-gold') {
          primaryHsl = { h: 42, s: 62, l: 50 }
        } else if (mixThemeId === 'red-blue') {
          primaryHsl = { h: 355, s: 72, l: 52 }
        } else if (mixThemeId === 'white-black') {
          primaryHsl = { h: 0, s: 0, l: 100 }
        } else if (mixThemeId === 'sky-purple') {
          primaryHsl = { h: 268, s: 58, l: 52 }
        } else {
          primaryHsl = isDarkMix ? (l1 >= l2 ? hsl1 : hsl2) : hsl1
        }
        const { h, s, l } = primaryHsl
        const primaryFg =
          mixThemeId === 'black-gold'
            ? '0 0% 100%'
            : mixThemeId === 'white-black'
              ? '0 0% 0%'
              : l > 52
                ? '0 0% 0%'
                : '0 0% 100%'
        document.documentElement.style.setProperty('--primary', `${h} ${s}% ${l}%`)
        document.documentElement.style.setProperty('--ring', `${(h + 25) % 360} ${Math.min(100, s + 8)}% ${l}%`)
        document.documentElement.style.setProperty('--primary-foreground', primaryFg)
        document.documentElement.style.setProperty('--background', `${hsl1.h} ${Math.min(50, hsl1.s)}% ${Math.min(98, hsl1.l)}%`)
        if (mixThemeId === 'white-black') {
          document.documentElement.style.setProperty('--foreground', '0 0% 10%')
          document.documentElement.style.setProperty('--card', '0 0% 98%')
          document.documentElement.style.setProperty('--card-foreground', '0 0% 10%')
          document.documentElement.style.setProperty('--popover', '0 0% 98%')
          document.documentElement.style.setProperty('--popover-foreground', '0 0% 10%')
          document.documentElement.style.setProperty('--border', '0 0% 88%')
          document.documentElement.style.setProperty('--input', '0 0% 96%')
          document.documentElement.style.setProperty('--muted', '0 0% 94%')
          document.documentElement.style.setProperty('--muted-foreground', '0 0% 38%')
          document.documentElement.style.setProperty('--secondary', '0 0% 94%')
          document.documentElement.style.setProperty('--secondary-foreground', '0 0% 10%')
          document.documentElement.style.setProperty('--accent', '0 0% 92%')
          document.documentElement.style.setProperty('--accent-foreground', '0 0% 10%')
        } else {
          document.documentElement.style.setProperty('--foreground', isDarkMix ? '0 0% 98%' : '0 0% 12%')
          document.documentElement.style.setProperty('--card', isDarkMix ? '0 0% 14%' : `${h} 45% 98%`)
          document.documentElement.style.setProperty('--card-foreground', isDarkMix ? '0 0% 98%' : `${h} 55% 10%`)
          document.documentElement.style.setProperty('--popover', isDarkMix ? '0 0% 14%' : `${h} 45% 98%`)
          document.documentElement.style.setProperty('--popover-foreground', isDarkMix ? '0 0% 98%' : `${h} 55% 10%`)
          document.documentElement.style.setProperty('--border', isDarkMix ? '0 0% 28%' : `${h} 35% 85%`)
          document.documentElement.style.setProperty('--input', isDarkMix ? '0 0% 22%' : `${h} 40% 90%`)
          document.documentElement.style.setProperty('--muted', isDarkMix ? '0 0% 20%' : `${h} 45% 92%`)
          document.documentElement.style.setProperty('--muted-foreground', isDarkMix ? '0 0% 78%' : `${h} 22% 36%`)
          document.documentElement.style.setProperty('--secondary', isDarkMix ? '0 0% 22%' : `${h} 55% 94%`)
          document.documentElement.style.setProperty('--secondary-foreground', isDarkMix ? '0 0% 98%' : `${h} 55% 10%`)
          document.documentElement.style.setProperty('--accent', isDarkMix ? '0 0% 24%' : `${h} 60% 88%`)
          document.documentElement.style.setProperty('--accent-foreground', isDarkMix ? '0 0% 98%' : `${h} 55% 10%`)
        }
      }
      return
    }
  }

  document.documentElement.removeAttribute('data-mix-theme')
  document.documentElement.style.removeProperty('--background-gradient')

  if (accentTheme === 'custom' && customColor) {
    applyCustomTheme(customColor, colorMode)
    return
  }

  if (colorMode === 'dark' && accentTheme !== 'light' && accentTheme !== 'custom') {
    applyDarkAccentTheme(accentTheme)
    return
  }

  clearCustomVars()
}

function parseHsl(hslString: string): { h: number; s: number; l: number } | null {
  let match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  if (match) {
    return { h: parseInt(match[1]), s: parseInt(match[2]), l: parseInt(match[3]) }
  }
  match = hslString.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/)
  if (match) {
    return { h: parseInt(match[1]), s: parseInt(match[2]), l: parseInt(match[3]) }
  }
  return null
}
