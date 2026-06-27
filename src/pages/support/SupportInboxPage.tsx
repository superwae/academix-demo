import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Inbox } from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  supportTicketService,
  type SupportTicket,
  type SupportTicketStatus,
  type SupportInboxQueue,
} from '../../services/supportTicketService'
import { parseTicketMessage, getTicketDepartment } from '../../lib/support/supportMeta'
import { SUPPORT_DEPARTMENTS, type SupportDepartment } from '../../lib/support/supportIssueTypes'
import { ticketPriorityTone, ticketStatusTone } from '../../lib/semanticColors'

type FilterValue = 'all' | Exclude<SupportTicketStatus, never>

const STATUS_FILTERS: { key: FilterValue; labelKey: string }[] = [
  { key: 'all', labelKey: 'support:admin.filterAll' },
  { key: 'Open', labelKey: 'support:admin.filterOpen' },
  { key: 'InProgress', labelKey: 'support:admin.filterInProgress' },
  { key: 'WaitingOnUser', labelKey: 'support:admin.filterWaiting' },
  { key: 'Resolved', labelKey: 'support:admin.filterResolved' },
  { key: 'Closed', labelKey: 'support:admin.filterClosed' },
]

const QUEUE_FILTERS: { key: SupportInboxQueue; labelKey: string }[] = [
  { key: 'all', labelKey: 'support:team.queueAll' },
  { key: 'mine', labelKey: 'support:team.queueMine' },
  { key: 'unassigned', labelKey: 'support:team.queueUnassigned' },
]
 
const STATUS_TONE = ticketStatusTone

const PRIORITY_TONE = ticketPriorityTone

export interface SupportInboxPageProps {
  basePath: string
  titleKey?: string
  subtitleKey?: string
}

export function SupportInboxPage({
  basePath,
  titleKey = 'support:admin.title',
  subtitleKey = 'support:admin.subtitle',
}: SupportInboxPageProps) {
  const { t, i18n } = useTranslation(['support', 'common'])
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') as FilterValue | null
  const initialQueue = searchParams.get('queue') as SupportInboxQueue | null
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [filter, setFilter] = useState<FilterValue>(
    initialStatus && STATUS_FILTERS.some((f) => f.key === initialStatus) ? initialStatus : 'all'
  )
  const [queue, setQueue] = useState<SupportInboxQueue>(
    initialQueue && QUEUE_FILTERS.some((f) => f.key === initialQueue) ? initialQueue : 'all'
  )
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState<SupportDepartment | 'all'>('all')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supportTicketService
      .getAll({
        status: filter === 'all' ? undefined : filter,
        queue: queue === 'all' ? undefined : queue,
      })
      .then((list) => !cancelled && setTickets(list))
      .catch((e) => !cancelled && toast.error((e as Error).message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [filter, queue])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric',
    })

  const openCount = useMemo(
    () => tickets.filter((tkt) => tkt.status !== 'Closed' && tkt.status !== 'Resolved').length,
    [tickets]
  )

  const visibleTickets = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tickets.filter((tkt) => {
      if (department !== 'all') {
        const { meta } = parseTicketMessage(tkt.message)
        const dept = getTicketDepartment(meta, tkt.category)
        if (dept !== department) return false
      }
      if (!q) return true
      return (
        tkt.subject.toLowerCase().includes(q) ||
        tkt.userEmail.toLowerCase().includes(q) ||
        tkt.userName.toLowerCase().includes(q)
      )
    })
  }, [tickets, search, department])

  const ticketHref = (id: string) => `${basePath.replace(/\/$/, '')}/${id}`

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{t(subtitleKey)}</p>
        </div>
        {openCount > 0 && (
          <div className="rounded-full bg-primary/10 text-primary text-sm font-medium px-3 py-1">
            {t('support:team.openCount', { count: openCount })}
          </div>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        {QUEUE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setQueue(f.key)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full border transition-colors',
              queue === f.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted'
            )}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full border transition-colors',
              filter === f.key
                ? 'bg-muted border-primary/40 text-foreground'
                : 'border-border hover:bg-muted/60 text-muted-foreground'
            )}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('support:history.searchPlaceholder')}
          className="flex h-10 flex-1 rounded-xl border-2 border-input bg-background/50 px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDepartment('all')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full border',
              department === 'all' ? 'bg-muted border-primary/40' : 'border-border'
            )}
          >
            {t('support:admin.filterAll')}
          </button>
          {SUPPORT_DEPARTMENTS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDepartment(d)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-full border',
                department === d ? 'bg-indigo-500/10 border-indigo-500/40' : 'border-border'
              )}
            >
              {t(`support:departments.${d}`)}
            </button>
          ))}
        </div>
      </div>

      {loading && tickets.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t('common:loading')}</div>
      ) : visibleTickets.length === 0 ? (
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
                <th className="px-4 py-3 text-start">{t('support:admin.columnDepartment')}</th>
                <th className="px-4 py-3 text-start">{t('support:team.columnAssignee')}</th>
                <th className="px-4 py-3 text-start">{t('support:admin.columnStatus')}</th>
                <th className="px-4 py-3 text-start">{t('support:admin.columnPriority')}</th>
                <th className="px-4 py-3 text-start">{t('support:admin.columnUpdated')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleTickets.map((tkt) => {
                const { meta } = parseTicketMessage(tkt.message)
                const dept = getTicketDepartment(meta, tkt.category)
                return (
                <tr key={tkt.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={ticketHref(tkt.id)} className="font-medium hover:text-primary">
                      {tkt.subject}
                    </Link>
                    {meta?.courseTitle && (
                      <div className="text-xs text-muted-foreground">{meta.courseTitle}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div>{tkt.userName}</div>
                    <div className="text-xs text-muted-foreground">{tkt.userEmail}</div>
                  </td>
                  <td className="px-4 py-3">{t(`support:categories.${tkt.category}`)}</td>
                  <td className="px-4 py-3 text-xs">{t(`support:departments.${dept}`)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {tkt.assignedToName ?? t('support:team.unassigned')}
                  </td>
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
              )})}
            </tbody>
          </table>

          <ul className="md:hidden divide-y divide-border">
            {visibleTickets.map((tkt) => (
              <li key={tkt.id}>
                <Link to={ticketHref(tkt.id)} className="block p-4 hover:bg-muted/30">
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
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{tkt.assignedToName ?? t('support:team.unassigned')}</span>
                    <span>•</span>
                    <span>{t(`support:categories.${tkt.category}`)}</span>
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
