import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Inbox, Clock, UserRound, AlertCircle } from 'lucide-react'
import { supportTicketService, type SupportTicket } from '../../services/supportTicketService'
import { useAuthStore } from '../../store/useAuthStore'
import { toast } from 'sonner'

export function SupportTeamDashboardPage() {
  const { t } = useTranslation(['support', 'common'])
  const { user } = useAuthStore()
  const [tickets, setTickets] = useState<SupportTicket[]>([])

  useEffect(() => {
    supportTicketService
      .getAll()
      .then(setTickets)
      .catch((e) => toast.error((e as Error).message))
  }, [])

  const stats = useMemo(() => {
    const open = tickets.filter((tkt) => tkt.status === 'Open').length
    const mine = tickets.filter((tkt) => tkt.assignedToUserId === user?.id).length
    const unassigned = tickets.filter((tkt) => !tkt.assignedToUserId && tkt.status !== 'Closed' && tkt.status !== 'Resolved').length
    const urgent = tickets.filter((tkt) => (tkt.priority === 'Urgent' || tkt.priority === 'High') && tkt.status !== 'Closed' && tkt.status !== 'Resolved').length
    return { open, mine, unassigned, urgent }
  }, [tickets, user?.id])

  const cards = [
    { label: t('support:team.stats.open'), value: stats.open, icon: Inbox, to: '/support-team/inbox?status=Open' },
    { label: t('support:team.stats.mine'), value: stats.mine, icon: UserRound, to: '/support-team/inbox?queue=mine' },
    { label: t('support:team.stats.unassigned'), value: stats.unassigned, icon: Clock, to: '/support-team/inbox?queue=unassigned' },
    { label: t('support:team.stats.urgent'), value: stats.urgent, icon: AlertCircle, to: '/support-team/inbox' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t('support:team.dashboardTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('support:team.dashboardSubtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <card.icon className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold tabular-nums">{card.value}</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{card.label}</p>
          </Link>
        ))}
      </div>

      <Link
        to="/support-team/inbox"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <Inbox className="h-4 w-4" />
        {t('support:team.openInbox')}
      </Link>
    </div>
  )
}
