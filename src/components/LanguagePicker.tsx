import { useTranslation } from 'react-i18next'
import { Check, Globe } from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { SUPPORTED_LOCALES, changeLanguage } from '../i18n'
import { cn } from '../lib/cn'
import { userService } from '../services/userService'
import { useAuthStore } from '../store/useAuthStore'

/**
 * Header-level language picker. Renders every entry in SUPPORTED_LOCALES
 * automatically — to add a new language, drop in a locale folder and a
 * row in `SUPPORTED_LOCALES`. No change needed here.
 *
 * When the user is authenticated, the new language is also persisted to the
 * backend (`PUT /users/me/language`) so it follows them across devices.
 */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation('common')
  const current = SUPPORTED_LOCALES.find((l) => l.code === i18n.language) ?? SUPPORTED_LOCALES[0]
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const pick = async (code: string) => {
    await changeLanguage(code)
    if (isAuthenticated) {
      // fire-and-forget: server sync is best-effort. localStorage already updated synchronously.
      void userService.updateLanguage(code)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-9 gap-2 rounded-xl', compact ? 'px-2' : 'px-3')}
          aria-label={t('language')}
        >
          <Globe className="h-4 w-4" />
          {!compact && (
            <span className="text-sm font-medium">{current.nativeName}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs font-semibold">
          {t('language')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => void pick(locale.code)}
            className="cursor-pointer"
          >
            <span className="flex-1 font-medium">{locale.nativeName}</span>
            {locale.code === current.code && (
              <Check className="ms-2 h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
