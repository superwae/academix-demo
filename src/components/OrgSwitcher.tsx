import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Building2, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useAuthStore } from '../store/useAuthStore'
import { useOrgStore } from '../store/useOrgStore'

/**
 * Small dropdown in the header that exposes the org portal entry point when the
 * signed-in user belongs to any organization. Hidden entirely otherwise.
 */
export function OrgSwitcher() {
  const { t } = useTranslation(['org'])
  const { isAuthenticated } = useAuthStore()
  const { memberships, membershipsLoaded, loadMemberships } = useOrgStore()

  useEffect(() => {
    if (isAuthenticated && !membershipsLoaded) void loadMemberships()
  }, [isAuthenticated, membershipsLoaded, loadMemberships])

  if (!isAuthenticated || memberships.length === 0) return null

  if (memberships.length === 1) {
    const m = memberships[0]
    return (
      <Link
        to={`/org/${m.slug}/dashboard`}
        className="hidden lg:inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
        title={t('org:switchToOrg')}
      >
        <Building2 className="h-4 w-4" />
        <span className="max-w-32 truncate">{m.name}</span>
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hidden lg:inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted">
        <Building2 className="h-4 w-4" />
        {t('org:portal')}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('org:select')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((m) => (
          <DropdownMenuItem asChild key={m.id}>
            <Link to={`/org/${m.slug}/dashboard`} className="flex flex-col items-start">
              <span className="font-medium">{m.name}</span>
              <span className="text-xs text-muted-foreground">{t(`org:roles.${m.roleInOrg}`)}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
