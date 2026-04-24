import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DollarSign, Building2, User as UserIcon, Percent } from 'lucide-react'
import { cn } from '../lib/cn'
import {
  revenueSplitService,
  type RevenueSplitPreview as SplitData,
} from '../services/revenueSplitService'

interface RevenueSplitPreviewProps {
  price: number | null | undefined
  organizationId?: string | null
  instructorId?: string | null
  className?: string
}

/**
 * Live breakdown of a course price into the three parties (platform, org, instructor).
 * Parties with 0% are omitted from the display. Debounces by 350 ms to avoid thrashing.
 */
export function RevenueSplitPreview({
  price,
  organizationId,
  instructorId,
  className,
}: RevenueSplitPreviewProps) {
  const { t, i18n } = useTranslation(['teacher', 'common'])
  const [data, setData] = useState<SplitData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!price || price <= 0) {
      setData(null)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      revenueSplitService
        .preview({
          price,
          organizationId: organizationId ?? undefined,
          instructorId: instructorId ?? undefined,
        })
        .then((d) => {
          if (!cancelled) setData(d)
        })
        .catch(() => {
          if (!cancelled) setData(null)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 350)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [price, organizationId, instructorId])

  if (!price || price <= 0) return null

  const fmt = (n: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: data?.currency ?? 'ILS',
      maximumFractionDigits: 2,
    }).format(n)

  const iconFor = (kind: string) =>
    kind === 'Platform' ? DollarSign : kind === 'Organization' ? Building2 : UserIcon

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/30 p-4 space-y-3',
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Percent className="h-3.5 w-3.5" />
        {t('teacher:revenueSplit.title')}
        {loading && <span className="ms-auto text-xs font-normal">{t('common:loading')}</span>}
      </div>

      {data && data.parts.length > 0 ? (
        <ul className="space-y-2">
          {data.parts.map((p) => {
            const Icon = iconFor(p.kind)
            const isTeacher = p.kind === 'Instructor'
            return (
              <li
                key={p.kind + p.label}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm',
                  isTeacher ? 'bg-primary/10 border border-primary/30' : 'bg-background'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isTeacher ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                <span className="flex-1 truncate">
                  <span className={cn(isTeacher && 'font-semibold')}>{p.label}</span>
                  <span className="ms-2 text-xs text-muted-foreground">
                    {p.percent}%
                  </span>
                </span>
                <span className={cn('font-semibold tabular-nums', isTeacher && 'text-primary')}>
                  {fmt(p.amount)}
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="text-xs text-muted-foreground">
          {t('teacher:revenueSplit.empty')}
        </div>
      )}
    </div>
  )
}
