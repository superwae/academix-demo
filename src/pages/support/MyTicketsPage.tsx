import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, ArrowRight, LifeBuoy } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { ContactSupportDialog } from '../../components/ContactSupportDialog'
import {
  supportTicketService,
  type SupportTicket,
  type SupportTicketStatus,
} from '../../services/supportTicketService'
import { cn } from '../../lib/cn'

const STATUS_TONE: Record<SupportTicketStatus, string> = {
  Open: 'bg-blue-500/10 text-blue-600',
  InProgress: 'bg-amber-500/10 text-amber-600',
  WaitingOnUser: 'bg-purple-500/10 text-purple-600',
  Resolved: 'bg-green-500/10 text-green-600',
  Closed: 'bg-muted text-muted-foreground',
}

export function MyTicketsPage() {
  const { t, i18n } = useTranslation(['support', 'common'])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('support:title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">{t('support:subtitle')}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('support:new')}
        </Button>
      </header>

      {loading && tickets.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t('common:loading')}</div>
      ) : tickets.length === 0 ? (
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
          {tickets.map((tkt) => (
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
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{tkt.message}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{t(`support:categories.${tkt.category}`)}</span>
                  <span>•</span>
                  <span>{formatDate(tkt.createdAt)}</span>
                  {tkt.replyCount > 0 && (
                    <>
                      <span>•</span>
                      <span>{t('support:replyCount', { defaultValue: '{{count}} replies', count: tkt.replyCount })}</span>
                    </>
                  )}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition mt-1 rtl:rotate-180" />
            </Link>
          ))}
        </div>
      )}

      <ContactSupportDialog open={open} onOpenChange={setOpen} onCreated={() => void refresh()} />
    </div>
  )
}
