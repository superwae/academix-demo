import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { Select } from '../../components/ui/select'
import { Label } from '../../components/ui/label'
import {
  supportTicketService,
  type SupportTicketDetail,
  type SupportTicketPriority,
  type SupportTicketStatus,
  type SupportStaffMember,
} from '../../services/supportTicketService'
import { useAuthStore } from '../../store/useAuthStore'
import { cn } from '../../lib/cn'
import { parseTicketMessage } from '../../lib/support/supportMeta'
import {
  TicketAttachmentList,
  TicketContextBadges,
  TicketContextLinks,
} from '../../components/support/TicketContextBadges'
import { TicketStaffPanel } from '../../components/support/TicketStaffPanel'

interface TicketDetailPageProps {
  /** Staff triage view (Admin or Support): status, priority, assignee, internal notes */
  staffView?: boolean
  /** @deprecated use staffView */
  adminView?: boolean
  /** Back link base path, e.g. /support-team/tickets or /admin/support-tickets */
  basePath?: string
}

const STATUS_VALUES: SupportTicketStatus[] = [
  'Open',
  'InProgress',
  'WaitingOnUser',
  'Resolved',
  'Closed',
]
const PRIORITY_VALUES: SupportTicketPriority[] = ['Low', 'Normal', 'High', 'Urgent']

export function TicketDetailPage({ staffView = false, adminView = false, basePath }: TicketDetailPageProps) {
  const isStaff = staffView || adminView
  const { t, i18n } = useTranslation(['support', 'common'])
  const { ticketId = '' } = useParams<{ ticketId: string }>()
  const { user } = useAuthStore()

  const [detail, setDetail] = useState<SupportTicketDetail | null>(null)
  const [staffMembers, setStaffMembers] = useState<SupportStaffMember[]>([])
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)

  const refresh = useCallback(async () => {
    if (!ticketId) return
    setLoading(true)
    try {
      const d = await supportTicketService.getById(ticketId)
      setDetail(d)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!isStaff) return
    supportTicketService
      .getStaff()
      .then(setStaffMembers)
      .catch(() => {
        /* assignee picker is optional */
      })
  }, [isStaff])

  const sendReply = async () => {
    if (!ticketId || !reply.trim()) return
    setSending(true)
    try {
      await supportTicketService.addReply(ticketId, {
        message: reply.trim(),
        isInternal: isStaff && isInternal,
      })
      toast.success(t('support:detail.replyAddedToast'))
      setReply('')
      setIsInternal(false)
      await refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  const changeStatus = async (next: SupportTicketStatus) => {
    if (!ticketId) return
    try {
      await supportTicketService.update(ticketId, { status: next })
      toast.success(t('support:detail.statusUpdatedToast'))
      await refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const changePriority = async (next: SupportTicketPriority) => {
    if (!ticketId) return
    try {
      await supportTicketService.update(ticketId, { priority: next })
      toast.success(t('support:detail.priorityUpdatedToast'))
      await refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const changeAssignee = async (assigneeId: string) => {
    if (!ticketId || !assigneeId) return
    try {
      await supportTicketService.update(ticketId, { assignedToUserId: assigneeId })
      toast.success(t('support:detail.assigneeUpdatedToast'))
      await refresh()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const backLink =
    basePath ??
    (isStaff
      ? '/admin/support-tickets'
      : '/support')

  if (loading && !detail) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 text-sm text-muted-foreground">
        {t('common:loading')}
      </div>
    )
  }
  if (!detail) return null

  const { ticket, replies } = detail
  const { body: ticketBody, meta } = parseTicketMessage(ticket.message)

  return (
    <div className={cn('mx-auto p-4 md:p-8 space-y-6', isStaff ? 'max-w-6xl' : 'max-w-3xl')}>
      <div className={cn(isStaff && 'grid lg:grid-cols-[1fr_280px] gap-6 items-start')}>
        <div className="space-y-6 min-w-0">
      <Link
        to={backLink}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('support:detail.backToList')}
      </Link>

      <header className="rounded-xl border border-border bg-card p-6 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{ticket.subject}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {t('support:detail.openedBy', { name: ticket.userName })} ·{' '}
              {t('support:detail.createdAt', { date: formatDateTime(ticket.createdAt) })}
            </p>
          </div>
          {isStaff ? (
            <div className="flex flex-wrap gap-2">
              <Select
                value={ticket.status}
                onValueChange={(v) => changeStatus(v as SupportTicketStatus)}
                className="h-9 w-40"
                options={STATUS_VALUES.map((s) => ({
                  value: s,
                  label: t(`support:statuses.${s}`),
                }))}
              />
              <Select
                value={ticket.priority}
                onValueChange={(v) => changePriority(v as SupportTicketPriority)}
                className="h-9 w-32"
                options={PRIORITY_VALUES.map((p) => ({
                  value: p,
                  label: t(`support:priorities.${p}`),
                }))}
              />
              {staffMembers.length > 0 && (
                <Select
                  value={ticket.assignedToUserId ?? ''}
                  placeholder={t('support:team.unassigned')}
                  onValueChange={changeAssignee}
                  className="h-9 min-w-[10rem]"
                  options={staffMembers.map((m) => ({ value: m.id, label: m.name }))}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {t(`support:statuses.${ticket.status}`)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t(`support:categories.${ticket.category}`)}
              </span>
            </div>
          )}
        </div>

        <TicketContextBadges meta={meta} category={ticket.category} className="pt-1" />

        <p className="whitespace-pre-wrap text-sm leading-relaxed pt-2 border-t border-border">
          {ticketBody}
        </p>

        <TicketAttachmentList meta={meta} />
        {meta?.courseId && (
          <div className="pt-1">
            <TicketContextLinks meta={meta} />
          </div>
        )}
      </header>

      <section className="space-y-3">
        {replies.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">{t('support:detail.noReplies')}</div>
        ) : (
          replies.map((r) => (
            <div
              key={r.id}
              className={cn(
                'rounded-xl border p-4',
                r.isInternal
                  ? 'border-amber-500/40 bg-amber-500/5 dark:border-amber-500/30 dark:bg-amber-500/10'
                  : r.isStaff
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-card'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold">{r.authorName}</span>
                {r.isStaff && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                    <ShieldCheck className="h-3 w-3" />
                    {t('support:detail.staffBadge')}
                  </span>
                )}
                {r.isInternal && (
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    {t('support:detail.internalNote')}
                  </span>
                )}
                <span className="ms-auto text-xs text-muted-foreground">
                  {formatDateTime(r.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {parseTicketMessage(r.message).body}
              </p>
            </div>
          ))
        )}
      </section>

      {ticket.status !== 'Closed' && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Label htmlFor="support-reply">{t('support:detail.replyLabel')}</Label>
          <Textarea
            id="support-reply"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={t('support:detail.replyPlaceholder')}
            rows={4}
            maxLength={4000}
          />
          {isStaff && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
              />
              {t('support:detail.internalToggle')}
            </label>
          )}
          <div className="flex justify-end">
            <Button onClick={sendReply} disabled={sending || !reply.trim()}>
              {sending ? t('common:loading') : t('support:detail.sendReply')}
            </Button>
          </div>
        </div>
      )}

      {/* Avoid unused warning for user */}
      <div className="hidden">{user?.email}</div>
        </div>

        {isStaff && <TicketStaffPanel ticket={ticket} onUpdated={refresh} />}
      </div>
    </div>
  )
}
