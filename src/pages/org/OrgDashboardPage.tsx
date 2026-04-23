import { useTranslation } from 'react-i18next'
import { Users, Ticket, BookOpen, ShieldCheck } from 'lucide-react'
import { useOrgStore } from '../../store/useOrgStore'

export function OrgDashboardPage() {
  const { t } = useTranslation(['org', 'common'])
  const { currentOrg } = useOrgStore()
  if (!currentOrg) return null

  const kpis = [
    { icon: Users, label: t('org:dashboard.members'), value: currentOrg.memberCount },
    { icon: Ticket, label: t('org:dashboard.licenses'), value: currentOrg.licenseCount },
    { icon: BookOpen, label: t('org:dashboard.courses'), value: currentOrg.courseCount },
    { icon: ShieldCheck, label: t('org:dashboard.completionRate'), value: '—' },
  ]

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t('org:dashboard.title', { org: currentOrg.name })}</h1>
        {currentOrg.description && (
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{currentOrg.description}</p>
        )}
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </div>
            <div className="mt-3 text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        {t('org:dashboard.empty')}
      </section>
    </div>
  )
}
