import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, ArrowRight, LifeBuoy, Search, BookOpen } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { ContactSupportDialog, type TicketFormContext } from '../../components/ContactSupportDialog'
import {
  supportTicketService,
  type SupportTicket,
  type SupportTicketStatus,
} from '../../services/supportTicketService'
import { STUDENT_QUICK_ISSUES, INSTRUCTOR_QUICK_ISSUES } from '../../lib/support/supportIssueTypes'
import { parseTicketMessage } from '../../lib/support/supportMeta'
import { useAuthStore } from '../../store/useAuthStore'
import { cn } from '../../lib/cn'
import { ticketStatusTone } from '../../lib/semanticColors'

const STATUS_TONE = ticketStatusTone

const STATUS_FILTERS: Array<'all' | SupportTicketStatus> = [
  'all',
  'Open',
  'InProgress',
  'WaitingOnUser',
  'Resolved',
  'Closed',
]

function isInstructor(roles: string[] | undefined) {
  const r = new Set((roles ?? []).map((x) => x.toLowerCase()))
  return r.has('instructor') || r.has('teacher')
}

export function MyTicketsPage() {
  const { t, i18n } = useTranslation(['support', 'common'])
  const { user } = useAuthStore()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | SupportTicketStatus>('all')
  const [dialogContext, setDialogContext] = useState<TicketFormContext | undefined>()

  const quickIssues = isInstructor(user?.roles) ? INSTRUCTOR_QUICK_ISSUES : STUDENT_QUICK_ISSUES

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await supportTicketService.getMine()
      setTickets(list)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tickets.filter((tkt) => {
      if (statusFilter !== 'all' && tkt.status !== statusFilter) return false
      if (!q) return true
      const { body } = parseTicketMessage(tkt.message)
      return (
        tkt.subject.toLowerCase().includes(q) ||
        body.toLowerCase().includes(q) ||
        tkt.category.toLowerCase().includes(q)
      )
    })
  }, [tickets, search, statusFilter])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  const openQuickIssue = (preset: (typeof quickIssues)[0]) => {
    setDialogContext({
      issueType: preset.issueType,
      audience: isInstructor(user?.roles) ? 'instructor' : 'student',
      defaultSubject: t(preset.subjectKey),
    })
    setOpen(true)
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('support:title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">{t('support:subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild className="gap-2">
            <Link to="/support/help">
              <BookOpen className="h-4 w-4" />
              {t('support:kb.title')}
            </Link>
          </Button>
          <Button
            onClick={() => {
              setDialogContext(undefined)
              setOpen(true)
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('support:new')}
          </Button>
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">{t('support:quickIssues.title')}</h2>
        <div className="flex flex-wrap gap-2">
          {quickIssues.map((preset) => (
            <button
              key={preset.issueType}
              type="button"
              onClick={() => openQuickIssue(preset)}
              className="text-sm px-3 py-1.5 rounded-full border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors"
            >
              {t(preset.labelKey)}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('support:history.searchPlaceholder')}
            className="ps-9"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-full border',
                statusFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border'
              )}
            >
              {s === 'all' ? t('support:admin.filterAll') : t(`support:statuses.${s}`)}
            </button>
          ))}
        </div>
      </div>

      {loading && tickets.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t('common:loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center space-y-3">
          <LifeBuoy className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('support:empty')}</p>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('support:new')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tkt) => {
            const { meta } = parseTicketMessage(tkt.message)
            return (
              <Link
                key={tkt.id}
                to={`/support/${tkt.id}`}
                className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold truncate">{tkt.subject}</h3>
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
                        STATUS_TONE[tkt.status]
                      )}
                    >
                      {t(`support:statuses.${tkt.status}`)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {parseTicketMessage(tkt.message).body}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{t(`support:categories.${tkt.category}`)}</span>
                    {meta?.courseTitle && <span>• {meta.courseTitle}</span>}
                    <span>•</span>
                    <span>{formatDate(tkt.createdAt)}</span>
                    {tkt.replyCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{t('support:replyCount', { count: tkt.replyCount })}</span>
                      </>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition mt-1 rtl:rotate-180" />
              </Link>
            )
          })}
        </div>
      )}

      <ContactSupportDialog
        open={open}
        onOpenChange={setOpen}
        context={dialogContext}
        onCreated={() => void refresh()}
      />
    </div>
  )
}
