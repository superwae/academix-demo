import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Inbox } from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  supportTicketService,
  type SupportTicket,
  type SupportTicketStatus,
} from '../../services/supportTicketService'

type FilterValue = 'all' | Exclude<SupportTicketStatus, never>

const FILTERS: { key: FilterValue; labelKey: string }[] = [
  { key: 'all', labelKey: 'support:admin.filterAll' },
  { key: 'Open', labelKey: 'support:admin.filterOpen' },
  { key: 'InProgress', labelKey: 'support:admin.filterInProgress' },
  { key: 'WaitingOnUser', labelKey: 'support:admin.filterWaiting' },
  { key: 'Resolved', labelKey: 'support:admin.filterResolved' },
  { key: 'Closed', labelKey: 'support:admin.filterClosed' },
]

const STATUS_TONE: Record<SupportTicketStatus, string> = {
  Open: 'bg-blue-500/10 text-blue-600',
  InProgress: 'bg-amber-500/10 text-amber-600',
  WaitingOnUser: 'bg-purple-500/10 text-purple-600',
  Resolved: 'bg-green-500/10 text-green-600',
  Closed: 'bg-muted text-muted-foreground',
}

const PRIORITY_TONE: Record<string, string> = {
  Urgent: 'text-red-600 font-semibold',
  High: 'text-orange-600 font-semibold',
  Normal: 'text-foreground',
  Low: 'text-muted-foreground',
}

export function AdminSupportInboxPage() {
  const { t, i18n } = useTranslation(['support', 'common'])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [filter, setFilter] = useState<FilterValue>('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supportTicketService
      .getAll(filter === 'all' ? undefined : filter)
      .then((list) => !cancelled && setTickets(list))
      .catch((e) => !cancelled && toast.error((e as Error).message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [filter])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric',
    })

  const openCount = useMemo(
    () => tickets.filter((t) => t.status !== 'Closed' && t.status !== 'Resolved').length,
    [tickets]
  )

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('support:admin.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            {t('support:admin.subtitle')}
          </p>
        </div>
        {openCount > 0 && (
          <div className="rounded-full bg-primary/10 text-primary text-sm font-medium px-3 py-1">
            {openCount} open
          </div>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full border transition-colors',
              filter === f.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            )}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {loading && tickets.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t('common:loading')}</div>
      ) : tickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center space-y-3">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('support:admin.noTickets')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="hidden md:table w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start">{t('support:admin.columnSubject')}</th>
                <th className="px-4 py-3 text-start">{t('support:admin.columnUser')}</th>
                <th className="px-4 py-3 text-start">{t('support:admin.columnCategory')}</th>
                <th className="px-4 py-3 text-start">{t('support:admin.columnStatus')}</th>
                <th className="px-4 py-3 text-start">{t('support:admin.columnPriority')}</th>
                <th className="px-4 py-3 text-start">{t('support:admin.columnUpdated')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.map((tkt) => (
                <tr key={tkt.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/admin/support-tickets/${tkt.id}`} className="font-medium hover:text-primary">
                      {tkt.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div>{tkt.userName}</div>
                    <div className="text-xs text-muted-foreground">{tkt.userEmail}</div>
                  </td>
                  <td className="px-4 py-3">{t(`support:categories.${tkt.category}`)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full inline-block',
                        STATUS_TONE[tkt.status]
                      )}
                    >
                      {t(`support:statuses.${tkt.status}`)}
                    </span>
                  </td>
                  <td className={cn('px-4 py-3', PRIORITY_TONE[tkt.priority])}>
                    {t(`support:priorities.${tkt.priority}`)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(tkt.updatedAt ?? tkt.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile card view */}
          <ul className="md:hidden divide-y divide-border">
            {tickets.map((tkt) => (
              <li key={tkt.id}>
                <Link to={`/admin/support-tickets/${tkt.id}`} className="block p-4 hover:bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold flex-1 truncate">{tkt.subject}</h3>
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
                        STATUS_TONE[tkt.status]
                      )}
                    >
                      {t(`support:statuses.${tkt.status}`)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{tkt.userEmail}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{t(`support:categories.${tkt.category}`)}</span>
                    <span>•</span>
                    <span className={PRIORITY_TONE[tkt.priority]}>
                      {t(`support:priorities.${tkt.priority}`)}
                    </span>
                    <span>•</span>
                    <span>{formatDate(tkt.updatedAt ?? tkt.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
