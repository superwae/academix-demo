import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { cn } from '../lib/cn'

export function MessagesPage() {
  const { messages, messageRead, courses } = useAppStore((s) => s.data)
  const markRead = useAppStore((s) => s.markMessageRead)

  const [selectedId, setSelectedId] = useState<string | null>(messages[0]?.id ?? null)
  const selected = useMemo(() => messages.find((m) => m.id === selectedId) ?? null, [messages, selectedId])
  const selectedCourse = useMemo(
    () => (selected?.courseId ? courses.find((c) => c.id === selected.courseId) : undefined),
    [selected, courses],
  )

  const ordered = useMemo(
    () => messages.slice().sort((a, b) => +new Date(b.sentAt) - +new Date(a.sentAt)),
    [messages],
  )

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Messages</div>
        <div className="text-sm text-muted-foreground">Announcements and direct messages (demo)</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="min-h-[520px]">
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
            <CardDescription>{ordered.filter((m) => !messageRead[m.id]).length} unread</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {ordered.map((m) => {
              const isActive = m.id === selectedId
              const isRead = !!messageRead[m.id]
              return (
                <button
                  key={m.id}
                  className={cn(
                    'w-full rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive && 'bg-accent',
                  )}
                  onClick={() => {
                    setSelectedId(m.id)
                    markRead(m.id, true)
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className={cn('truncate font-medium', !isRead && 'text-foreground')}>
                        {m.subject}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{m.from}</div>
                    </div>
                    {!isRead && <Badge variant="subtle">New</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{format(new Date(m.sentAt), 'MMM d')}</div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card className="min-h-[520px]">
          <CardHeader>
            <CardTitle>{selected ? selected.subject : 'Select a message'}</CardTitle>
            <CardDescription>
              {selected ? `${selected.from}${selectedCourse ? ` • ${selectedCourse.title}` : ''}` : '—'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">{selected.body}</div>
            ) : (
              <div className="rounded-md border border-border bg-card p-6">
                <div className="text-sm font-medium">No message selected</div>
                <div className="mt-1 text-sm text-muted-foreground">Pick one from the inbox.</div>
              </div>
            )}
          </CardContent>
          {selected && (
            <div className="flex items-center justify-end gap-2 p-4 pt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => markRead(selected.id, !messageRead[selected.id])}
              >
                Mark as {messageRead[selected.id] ? 'unread' : 'read'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}


