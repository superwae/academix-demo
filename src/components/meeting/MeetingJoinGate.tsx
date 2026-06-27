import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { getSafeMeetingJoinUrl } from '../../lib/trustedMeetingUrl'

type MeetingJoinContextValue = {
  requestJoin: (url: string) => void
}

const MeetingJoinContext = createContext<MeetingJoinContextValue | null>(null)

export function MeetingJoinGateProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['student', 'common'])
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)

  const requestJoin = useCallback((url: string) => {
    const safe = getSafeMeetingJoinUrl(url)
    if (safe) setPendingUrl(safe)
  }, [])

  const stay = useCallback(() => setPendingUrl(null), [])

  const continueJoin = useCallback(() => {
    if (pendingUrl) {
      window.open(pendingUrl, '_blank', 'noopener,noreferrer')
    }
    setPendingUrl(null)
  }, [pendingUrl])

  const value = useMemo(() => ({ requestJoin }), [requestJoin])

  return (
    <MeetingJoinContext.Provider value={value}>
      {children}
      <Dialog open={!!pendingUrl} onOpenChange={(open) => !open && stay()}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-4">
            <DialogHeader className="space-y-2 text-start">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <DialogTitle className="text-lg">
                    {t('student:meetingJoin.leaveTitle')}
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-relaxed text-foreground/85">
                    {t('student:meetingJoin.leaveDescription')}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-2 px-6 py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('student:meetingJoin.destinationLabel')}
            </p>
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <p className="break-all font-mono text-xs leading-relaxed text-foreground sm:text-sm">
                {pendingUrl}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-border bg-muted/20 px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={stay}>
              {t('student:meetingJoin.stay')}
            </Button>
            <Button type="button" onClick={continueJoin} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              {t('student:meetingJoin.continue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MeetingJoinContext.Provider>
  )
}

export function useMeetingJoin() {
  const ctx = useContext(MeetingJoinContext)
  if (!ctx) {
    throw new Error('useMeetingJoin must be used within MeetingJoinGateProvider')
  }
  return ctx
}

type MeetingJoinButtonProps = ComponentProps<typeof Button> & {
  joinUrl: string
}

/** Student join control — opens leave-site confirmation before external meeting. */
export function MeetingJoinButton({
  joinUrl,
  children,
  onClick,
  ...props
}: MeetingJoinButtonProps) {
  const { requestJoin } = useMeetingJoin()

  return (
    <Button
      type="button"
      {...props}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) requestJoin(joinUrl)
      }}
    >
      {children}
    </Button>
  )
}
