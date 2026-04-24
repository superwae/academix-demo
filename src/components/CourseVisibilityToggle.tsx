import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe2, Lock, Building2 } from 'lucide-react'
import { cn } from '../lib/cn'
import { useAuthStore } from '../store/useAuthStore'
import { useOrgStore } from '../store/useOrgStore'

interface CourseVisibilityToggleProps {
  organizationId: string
  isExclusive: boolean
  onChange: (organizationId: string, isExclusive: boolean) => void
}

/**
 * Show the course's visibility choice (public vs. exclusive to an org).
 *
 * Only rendered when the current user belongs to at least one organization where
 * they can author courses (OrgTeacher or OrgAdmin). Otherwise returns null and
 * the course defaults to Public (organizationId='').
 */
export function CourseVisibilityToggle({
  organizationId,
  isExclusive,
  onChange,
}: CourseVisibilityToggleProps) {
  const { t } = useTranslation(['teacher'])
  const { isAuthenticated } = useAuthStore()
  const { memberships, membershipsLoaded, loadMemberships } = useOrgStore()

  useEffect(() => {
    if (isAuthenticated && !membershipsLoaded) void loadMemberships()
  }, [isAuthenticated, membershipsLoaded, loadMemberships])

  const authoredOrgs = memberships.filter(
    (m) => m.roleInOrg === 'OrgTeacher' || m.roleInOrg === 'OrgAdmin'
  )
  if (authoredOrgs.length === 0) return null

  const selectedOrg = authoredOrgs.find((m) => m.id === organizationId)

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('teacher:visibility.title')}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Public */}
        <button
          type="button"
          onClick={() => onChange('', false)}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-3 text-start transition-colors',
            !organizationId
              ? 'border-primary bg-primary/10'
              : 'border-border hover:bg-muted/50'
          )}
        >
          <Globe2
            className={cn(
              'h-5 w-5 mt-0.5 shrink-0',
              !organizationId ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <div>
            <div className="font-semibold text-sm">{t('teacher:visibility.publicTitle')}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t('teacher:visibility.publicDescription')}
            </div>
          </div>
        </button>

        {/* Org-scoped (show one button per authored org) */}
        {authoredOrgs.map((org) => {
          const active = organizationId === org.id
          return (
            <button
              key={org.id}
              type="button"
              onClick={() => onChange(org.id, isExclusive || !!organizationId ? isExclusive : false)}
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 text-start transition-colors',
                active ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
              )}
            >
              <Building2
                className={cn(
                  'h-5 w-5 mt-0.5 shrink-0',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <div>
                <div className="font-semibold text-sm">
                  {t('teacher:visibility.underOrgTitle', { org: org.name })}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t('teacher:visibility.underOrgDescription')}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selectedOrg && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isExclusive}
            onChange={(e) => onChange(organizationId, e.target.checked)}
          />
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t('teacher:visibility.exclusiveToggle', { org: selectedOrg.name })}</span>
        </label>
      )}
    </div>
  )
}
