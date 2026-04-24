import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Wallet, TrendingUp, Building2, PiggyBank } from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  revenueSplitService,
  type TeacherEarningsSummary,
} from '../../services/revenueSplitService'

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function TeacherEarningsPage() {
  const { t, i18n } = useTranslation(['teacher', 'common'])
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [summary, setSummary] = useState<TeacherEarningsSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    revenueSplitService
      .getMyEarnings(year, month)
      .then((s) => !cancelled && setSummary(s))
      .catch((e) => !cancelled && toast.error((e as Error).message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [year, month])

  const fmt = (n: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: summary?.currency ?? 'ILS',
      maximumFractionDigits: 2,
    }).format(n)

  const monthLabel = (m: number) => {
    try {
      return new Date(2000, m - 1, 1).toLocaleDateString(i18n.language, { month: 'long' })
    } catch {
      return MONTHS_EN[m - 1] ?? String(m)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('teacher:earnings.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            {t('teacher:earnings.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-border bg-card px-3 text-sm"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="h-9 w-24 rounded-md border border-border bg-card px-3 text-sm"
            value={year}
            min={2020}
            max={now.getFullYear() + 1}
            onChange={(e) => setYear(parseInt(e.target.value))}
          />
        </div>
      </header>

      {loading && !summary ? (
        <div className="text-sm text-muted-foreground">{t('common:loading')}</div>
      ) : !summary ? null : (
        <>
          {/* Headline KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile
              icon={TrendingUp}
              label={t('teacher:earnings.grossSales')}
              value={fmt(summary.grossSales)}
              tone="default"
            />
            <Tile
              icon={Wallet}
              label={t('teacher:earnings.platformCut')}
              value={fmt(summary.platformCut)}
              tone="muted"
            />
            <Tile
              icon={Building2}
              label={t('teacher:earnings.orgCut')}
              value={fmt(summary.orgCut)}
              tone={summary.orgCut > 0 ? 'muted' : 'muted'}
            />
            <Tile
              icon={PiggyBank}
              label={t('teacher:earnings.netEarned')}
              value={fmt(summary.netEarned)}
              tone="primary"
            />
          </div>

          {/* Secondary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <SmallStat label={t('teacher:earnings.salesCount')} value={summary.salesCount} />
            <SmallStat
              label={t('teacher:earnings.lifetime')}
              value={fmt(summary.lifetimeNetEarned)}
            />
            <SmallStat
              label={t('teacher:earnings.unpaid')}
              value={fmt(summary.unpaidBalance)}
              emphasize
            />
          </div>

          {/* By course */}
          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t('teacher:earnings.byCourse')}
              </h2>
            </div>
            {summary.courses.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">
                {t('teacher:earnings.noSales')}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-2 text-start">{t('teacher:earnings.columnCourse')}</th>
                    <th className="px-4 py-2 text-start">{t('teacher:earnings.columnSales')}</th>
                    <th className="px-4 py-2 text-start">{t('teacher:earnings.columnGross')}</th>
                    <th className="px-4 py-2 text-start">{t('teacher:earnings.columnNet')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summary.courses.map((c) => (
                    <tr key={c.courseId}>
                      <td className="px-4 py-3 font-medium">{c.courseTitle}</td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {c.salesCount}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{fmt(c.grossSales)}</td>
                      <td className="px-4 py-3 font-semibold text-primary tabular-nums">
                        {fmt(c.netEarned)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function Tile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  tone: 'default' | 'primary' | 'muted'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        tone === 'primary' && 'border-primary/40 bg-primary/5',
        tone === 'default' && 'border-border bg-card',
        tone === 'muted' && 'border-border bg-muted/20'
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div
        className={cn(
          'mt-2 text-2xl font-bold tabular-nums',
          tone === 'primary' && 'text-primary'
        )}
      >
        {value}
      </div>
    </div>
  )
}

function SmallStat({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string | number
  emphasize?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        emphasize ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card'
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn('mt-1 text-lg font-semibold tabular-nums', emphasize && 'text-amber-700')}
      >
        {value}
      </div>
    </div>
  )
}
