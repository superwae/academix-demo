import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { User, TrendingUp, Sparkles, Loader2 } from 'lucide-react'
import { adminService, type AdminUserDto } from '../../services/adminService'
import { supportTicketService, type SupportTicket } from '../../services/supportTicketService'
import { parseTicketMessage } from '../../lib/support/supportMeta'
import { summarizeConversation } from '../../lib/support/supportAi'
import { Button } from '../ui/button'
import { TicketContextBadges } from './TicketContextBadges'

interface TicketStaffPanelProps {
  ticket: SupportTicket
  onUpdated: () => void
}

export function TicketStaffPanel({ ticket, onUpdated }: TicketStaffPanelProps) {
  const { t } = useTranslation(['support', 'common'])
  const [userDetail, setUserDetail] = useState<AdminUserDto | null>(null)
  const [loadingUser, setLoadingUser] = useState(false)
  const [escalating, setEscalating] = useState(false)

  const { meta } = parseTicketMessage(ticket.message)

  useEffect(() => {
    let cancelled = false
    setLoadingUser(true)
    adminService
      .getUser(ticket.userId)
      .then((u) => !cancelled && setUserDetail(u))
      .catch(() => !cancelled && setUserDetail(null))
      .finally(() => !cancelled && setLoadingUser(false))
    return () => {
      cancelled = true
    }
  }, [ticket.userId])

  const escalate = async () => {
    setEscalating(true)
    try {
      await supportTicketService.update(ticket.id, { priority: 'Urgent', status: 'InProgress' })
      await supportTicketService.addReply(ticket.id, {
        message: t('support:admin.escalationNote'),
        isInternal: true,
      })
      toast.success(t('support:admin.escalatedToast'))
      onUpdated()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setEscalating(false)
    }
  }

  const aiSummary = summarizeConversation([
    { role: 'user', content: parseTicketMessage(ticket.message).body },
  ])

  return (
    <aside className="rounded-xl border border-border bg-card p-4 space-y-4 lg:sticky lg:top-24">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <User className="h-4 w-4 text-primary" />
        {t('support:admin.userLookup')}
      </h2>

      {loadingUser ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : userDetail ? (
        <dl className="text-sm space-y-2">
          <div>
            <dt className="text-xs text-muted-foreground">{t('support:admin.userName')}</dt>
            <dd className="font-medium">
              {userDetail.firstName} {userDetail.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('support:admin.userEmail')}</dt>
            <dd>{userDetail.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('support:admin.userRoles')}</dt>
            <dd>{userDetail.roles?.join(', ') ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('support:admin.userStatus')}</dt>
            <dd>{userDetail.isActive ? t('support:admin.userActive') : t('support:admin.userInactive')}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">
          {ticket.userName} · {ticket.userEmail}
        </p>
      )}

      <TicketContextBadges meta={meta} category={ticket.category} />

      {aiSummary && (
        <div className="rounded-lg bg-muted/50 p-3 space-y-1">
          <p className="text-xs font-semibold flex items-center gap-1 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t('support:ai.summaryTitle')}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{aiSummary}</p>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={escalate}
        disabled={escalating || ticket.priority === 'Urgent'}
      >
        <TrendingUp className="h-4 w-4" />
        {escalating ? t('common:loading') : t('support:admin.escalate')}
      </Button>
    </aside>
  )
}
