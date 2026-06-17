import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Loader2, Ticket, Users } from 'lucide-react'
import { useOrgStore } from '../../store/useOrgStore'
import { courseLicenseService, type CourseLicense } from '../../services/courseLicenseService'
import { orgComplianceService, type OrgComplianceSummary } from '../../services/orgComplianceService'
import { formatMoney } from '../../lib/money'

export function OrgDashboardPage() {
  const { t } = useTranslation(['org', 'common'])
  const { currentOrg } = useOrgStore()
  const [licenses, setLicenses] = useState<CourseLicense[]>([])
  const [compliance, setCompliance] = useState<OrgComplianceSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentOrg) return
    let cancelled = false
    setLoading(true)

    Promise.all([
      courseLicenseService.list(currentOrg.id).catch(() => []),
      orgComplianceService.getSummary(currentOrg.id).catch(() => null),
    ])
      .then(([licenseRows, complianceSummary]) => {
        if (cancelled) return
        setLicenses(licenseRows)
        setCompliance(complianceSummary)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentOrg])

  if (!currentOrg) return null

  const activeLicenses = licenses.filter((license) => license.status === 'Active')
  const seats = activeLicenses.reduce(
    (acc, license) => ({
      used: acc.used + license.seatsUsed,
      total: acc.total + license.seatsTotal,
    }),
    { used: 0, total: 0 }
  )
  const totalSpend = activeLicenses.reduce((sum, license) => sum + license.totalAmount, 0)

  const kpis = [
    { icon: Users, label: t('org:dashboard.members'), value: currentOrg.memberCount },
    { icon: Ticket, label: t('org:dashboard.licenses'), value: activeLicenses.length },
    { icon: BookOpen, label: t('org:dashboard.courses'), value: currentOrg.courseCount },
    {
      icon: CheckCircle2,
      label: t('org:dashboard.completionRate'),
      value: compliance ? `${compliance.completionRatePercent}%` : '0%',
    },
    {
      icon: AlertTriangle,
      label: t('org:dashboard.overdue'),
      value: compliance?.overdueAssignments ?? 0,
    },
  ]

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('org:dashboard.title', { org: currentOrg.name })}</h1>
          {currentOrg.description && (
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{currentOrg.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/org/${currentOrg.slug}/members`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
          >
            {t('org:dashboard.manageMembers')}
          </Link>
          <Link
            to={`/org/${currentOrg.slug}/courses`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t('org:dashboard.findCourses')}
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {kpis.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </div>
            <div className="mt-3 text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{t('org:dashboard.licenseHealth')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('org:dashboard.licenseHealthSubtitle')}</p>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground">{t('org:dashboard.seatsUsed')}</div>
              <div className="mt-1 text-2xl font-bold">
                {seats.used}
                <span className="text-sm font-normal text-muted-foreground"> / {seats.total}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('org:dashboard.totalSpend')}</div>
              <div className="mt-1 text-2xl font-bold">{formatMoney(totalSpend)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('org:dashboard.assignments')}</div>
              <div className="mt-1 text-2xl font-bold">{compliance?.totalAssignments ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold">{t('org:dashboard.nextActions')}</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Link
              to={`/org/${currentOrg.slug}/licenses`}
              className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted/50"
            >
              <span>{t('org:dashboard.assignSeatsAction')}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
            <Link
              to={`/org/${currentOrg.slug}/compliance`}
              className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted/50"
            >
              <span>{t('org:dashboard.reviewComplianceAction')}</span>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="text-base font-semibold">{t('org:dashboard.recentLicenses')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('org:dashboard.recentLicensesSubtitle')}</p>
          </div>
          <Link
            to={`/org/${currentOrg.slug}/licenses`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t('common:viewAll')}
          </Link>
        </div>
        {activeLicenses.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{t('org:dashboard.empty')}</div>
        ) : (
          <div className="divide-y divide-border">
            {activeLicenses.slice(0, 4).map((license) => (
              <Link
                key={license.id}
                to={`/org/${currentOrg.slug}/licenses/${license.id}`}
                className="flex flex-col gap-3 p-5 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium">{license.courseTitle}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {license.seatsUsed} / {license.seatsTotal} {t('org:licenses.seatsLabel').toLowerCase()}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
