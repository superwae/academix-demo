import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, Clock, Target, Users } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useOrgStore } from '../../store/useOrgStore'
import {
  orgComplianceService,
  type ComplianceStatus,
  type OrgAssignmentRow,
  type OrgComplianceSummary,
} from '../../services/orgComplianceService'

const STATUS_TABS: ComplianceStatus[] = ['all', 'active', 'completed', 'overdue']

export function OrgComplianceDashboardPage() {
  const { t, i18n } = useTranslation(['org', 'common'])
  const { currentOrg } = useOrgStore()
  const [summary, setSummary] = useState<OrgComplianceSummary | null>(null)
  const [rows, setRows] = useState<OrgAssignmentRow[]>([])
  const [filter, setFilter] = useState<ComplianceStatus>('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentOrg) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      orgComplianceService.getSummary(currentOrg.id),
      orgComplianceService.getAssignments(currentOrg.id, filter),
    ])
      .then(([s, a]) => {
        if (cancelled) return
        setSummary(s)
        setRows(a)
      })
      .catch((e) => !cancelled && toast.error((e as Error).message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [currentOrg?.id, filter, currentOrg])

  if (!currentOrg) return null

  const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(i18n.language) : '—')

  const tileDefs = [
    {
      icon: Target,
      label: t('org:compliance.kpis.total'),
      value: summary?.totalAssignments ?? 0,
      tone: 'default',
    },
    {
      icon: Clock,
      label: t('org:compliance.kpis.active'),
      value: summary?.activeAssignments ?? 0,
      tone: 'default',
    },
    {
      icon: CheckCircle2,
      label: t('org:compliance.kpis.completed'),
      value: summary?.completedAssignments ?? 0,
      tone: 'success',
    },
    {
      icon: AlertTriangle,
      label: t('org:compliance.kpis.overdue'),
      value: summary?.overdueAssignments ?? 0,
      tone: 'destructive',
    },
    {
      icon: Users,
      label: t('org:compliance.kpis.learners'),
      value: summary?.uniqueLearners ?? 0,
      tone: 'default',
    },
  ] as const

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('org:compliance.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('org:compliance.subtitle')}</p>
        </div>
        {summary && (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{summary.completionRatePercent}%</span>
            <span className="text-sm text-muted-foreground">{t('org:compliance.completionRate')}</span>
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {tileDefs.map(({ icon: Icon, label, value, tone }) => (
          <div
            key={label}
            className={cn(
              'rounded-xl border border-border bg-card p-4',
              tone === 'destructive' && 'border-destructive/40',
              tone === 'success' && 'border-success/40'
            )}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full border transition-colors',
              filter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            )}
          >
            {t(`org:compliance.filters.${s}`)}
          </button>
        ))}
      </div>

      {loading && rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t('common:loading')}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          {t('org:compliance.empty')}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="hidden md:table w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start">{t('org:compliance.columnLearner')}</th>
                <th className="px-4 py-3 text-start">{t('org:compliance.columnCourse')}</th>
                <th className="px-4 py-3 text-start">{t('org:compliance.columnProgress')}</th>
                <th className="px-4 py-3 text-start">{t('org:compliance.columnDue')}</th>
                <th className="px-4 py-3 text-start">{t('org:compliance.columnStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.enrollmentId} className={r.isOverdue ? 'bg-destructive/5' : undefined}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.userName}</div>
                    <div className="text-xs text-muted-foreground">{r.userEmail}</div>
                  </td>
                  <td className="px-4 py-3">{r.courseTitle}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${r.progressPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(r.progressPercentage)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.dueDate)}</td>
                  <td className="px-4 py-3">
                    {r.completedAt ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('org:compliance.statusLabels.completed')}
                      </span>
                    ) : r.isOverdue ? (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t('org:compliance.statusLabels.overdue')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {t('org:compliance.statusLabels.active')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile */}
          <ul className="md:hidden divide-y divide-border">
            {rows.map((r) => (
              <li
                key={r.enrollmentId}
                className={cn('p-4 space-y-1', r.isOverdue && 'bg-destructive/5')}
              >
                <div className="font-medium">{r.userName}</div>
                <div className="text-xs text-muted-foreground">{r.courseTitle}</div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${r.progressPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(r.progressPercentage)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{fmtDate(r.dueDate)}</span>
                  <span>•</span>
                  <span
                    className={cn(
                      r.completedAt && 'text-success',
                      r.isOverdue && 'text-destructive'
                    )}
                  >
                    {r.completedAt
                      ? t('org:compliance.statusLabels.completed')
                      : r.isOverdue
                      ? t('org:compliance.statusLabels.overdue')
                      : t('org:compliance.statusLabels.active')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
