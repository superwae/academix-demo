import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom'
import { useEffect, type ComponentType } from 'react'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Ticket,
  ShieldCheck,
  Settings,
  Building2,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import { useAuthStore } from '../../store/useAuthStore'
import { useOrgStore } from '../../store/useOrgStore'
import { LanguagePicker } from '../LanguagePicker'
import { NotificationBell } from '../NotificationBell'
import { HelpButton } from '../HelpButton'
import { useState } from 'react'

type NavItem = {
  to: string
  labelKey: string
  icon: ComponentType<{ className?: string }>
}

export function OrgLayout() {
  const { t } = useTranslation(['org', 'common', 'nav'])
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentOrg, loadingCurrent, loadOrg } = useOrgStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (slug) void loadOrg(slug)
  }, [slug, loadOrg])

  const base = `/org/${slug}`
  const nav: NavItem[] = [
    { to: `${base}/dashboard`, labelKey: 'org:nav.dashboard', icon: LayoutDashboard },
    { to: `${base}/members`, labelKey: 'org:nav.members', icon: Users },
    { to: `${base}/courses`, labelKey: 'org:nav.courses', icon: BookOpen },
    { to: `${base}/licenses`, labelKey: 'org:nav.licenses', icon: Ticket },
    { to: `${base}/compliance`, labelKey: 'org:nav.compliance', icon: ShieldCheck },
    { to: `${base}/settings`, labelKey: 'org:nav.settings', icon: Settings },
  ]

  const backToPortal = () => {
    const roles = user?.roles ?? []
    const isInstructor = roles.includes('Instructor') || roles.includes('instructor')
    const isAdmin = roles.some((r) => /admin/i.test(r))
    if (isAdmin) navigate('/admin/dashboard')
    else if (isInstructor) navigate('/teacher/dashboard')
    else navigate('/student/dashboard')
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:sticky md:top-0 inset-y-0 start-0 z-40 w-72 border-e border-border bg-card flex flex-col transition-transform md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : 'rtl:translate-x-full -translate-x-full md:translate-x-0'
        )}
      >
        <div className="h-20 flex items-center gap-3 px-5 border-b border-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {currentOrg?.logoUrl ? (
              <img src={currentOrg.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{currentOrg?.name ?? '…'}</div>
            <div className="truncate text-xs text-muted-foreground">
              {currentOrg ? t(`org:types.${currentOrg.type}`) : ''}
            </div>
          </div>
          <button
            type="button"
            className="md:hidden p-2 rounded hover:bg-muted"
            onClick={() => setSidebarOpen(false)}
            aria-label={t('common:close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{t(item.labelKey)}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={backToPortal}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('org:returnToPortal')}
          </Button>
        </div>
      </aside>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/80 flex items-center px-4 md:px-6 gap-3">
          <button
            type="button"
            className="md:hidden p-2 rounded hover:bg-muted"
            onClick={() => setSidebarOpen(true)}
            aria-label={t('common:openNavigation')}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold truncate">
            {t('org:portal')}
          </h1>
          <div className="ms-auto flex items-center gap-2">
            <LanguagePicker compact />
            <HelpButton />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1">
          {loadingCurrent && !currentOrg ? (
            <div className="p-6 text-sm text-muted-foreground">{t('common:loading')}</div>
          ) : !currentOrg ? (
            <div className="p-6 text-sm text-destructive">{t('common:somethingWrong')}</div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}
