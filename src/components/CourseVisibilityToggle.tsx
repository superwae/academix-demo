import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe2, Lock, Building2, CheckCircle2 } from 'lucide-react'
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

  const optionClass = (active: boolean) =>
    cn(
      'relative flex min-h-[128px] w-full items-start gap-3 rounded-xl border-2 p-4 text-start transition-all',
      active
        ? 'border-primary bg-primary/10 shadow-sm shadow-primary/10'
        : 'border-border bg-background/70 hover:border-primary/40 hover:bg-muted/30',
    )

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <div className="text-sm font-semibold">{t('teacher:visibility.title')}</div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('teacher:visibility.subtitle')}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* Public */}
        <button
          type="button"
          onClick={() => onChange('', false)}
          className={optionClass(!organizationId)}
        >
          {!organizationId && <CheckCircle2 className="absolute end-3 top-3 h-4 w-4 text-primary" />}
          <Globe2
            className={cn(
              'mt-0.5 h-5 w-5 shrink-0',
              !organizationId ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <div className="min-w-0 pe-4">
            <div className="font-semibold text-sm">{t('teacher:visibility.publicTitle')}</div>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t('teacher:visibility.publicDescription')}
            </div>
          </div>
        </button>

        {/* Org-scoped (show public and private choices per authored org) */}
        {authoredOrgs.map((org) => {
          const activePublicOrg = organizationId === org.id && !isExclusive
          const activeExclusiveOrg = organizationId === org.id && isExclusive
          return (
            <div key={org.id} className="contents">
            <button
              type="button"
              onClick={() => onChange(org.id, false)}
              className={optionClass(activePublicOrg)}
            >
              {activePublicOrg && <CheckCircle2 className="absolute end-3 top-3 h-4 w-4 text-primary" />}
              <Building2
                className={cn(
                  'mt-0.5 h-5 w-5 shrink-0',
                  activePublicOrg ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <div className="min-w-0 pe-4">
                <div className="font-semibold text-sm">
                  {t('teacher:visibility.underOrgTitle', { org: org.name })}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('teacher:visibility.underOrgDescription', { org: org.name })}
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onChange(org.id, true)}
              className={optionClass(activeExclusiveOrg)}
            >
              {activeExclusiveOrg && <CheckCircle2 className="absolute end-3 top-3 h-4 w-4 text-primary" />}
              <Lock
                className={cn(
                  'mt-0.5 h-5 w-5 shrink-0',
                  activeExclusiveOrg ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <div className="min-w-0 pe-4">
                <div className="font-semibold text-sm">
                  {t('teacher:visibility.exclusiveTitle', { org: org.name })}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t('teacher:visibility.exclusiveDescription', { org: org.name })}
                </div>
              </div>
            </button>
            </div>
          )
        })}
      </div>

      {selectedOrg && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t('teacher:visibility.currentLabel')}</span>{' '}
          {isExclusive
            ? t('teacher:visibility.currentExclusive', { org: selectedOrg.name })
            : t('teacher:visibility.currentUnderOrgPublic', { org: selectedOrg.name })}
        </div>
      )}
      {!selectedOrg && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t('teacher:visibility.currentLabel')}</span>{' '}
          {t('teacher:visibility.currentPublic')}
        </div>
      )}
    </div>
  )
}
