import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { applyAppearance } from './applyTheme'

/** Keeps DOM theme tokens in sync on every route. */
export function AppThemeSync() {
  const colorMode = useAppStore((s) => s.data.colorMode)
  const theme = useAppStore((s) => s.data.theme)
  const customThemeColor = useAppStore((s) => s.data.customThemeColor)
  const mixTheme = useAppStore((s) => s.data.mixTheme)

  useEffect(() => {
    applyAppearance(colorMode, theme, customThemeColor, mixTheme ?? undefined)
  }, [colorMode, theme, customThemeColor, mixTheme])

  return null
}
