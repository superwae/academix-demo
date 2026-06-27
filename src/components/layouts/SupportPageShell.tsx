import { Outlet, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LifeBuoy, ArrowLeft } from 'lucide-react'
import { Button } from '../ui/button'

/** Minimal shell for /support/* routes (no student/admin layout, but themed background). */
export function SupportPageShell() {
  const { t } = useTranslation(['support', 'common'])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
          <div className="flex items-center gap-2 min-w-0">
            <LifeBuoy className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span className="font-semibold truncate">{t('support:title')}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/support/help">{t('support:kb.title')}</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/support">{t('support:myTickets')}</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/student/dashboard" className="gap-1.5">
                <ArrowLeft className="h-4 w-4 rtl-flip" />
                {t('common:back', { defaultValue: 'Back' })}
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
