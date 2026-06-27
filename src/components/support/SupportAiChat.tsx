import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Bot, Send, Sparkles, Ticket } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { cn } from '../../lib/cn'
import { surfaceStatus } from '../../lib/semanticColors'
import {
  generateAssistantReply,
  type AiChatMessage,
  detectUrgency,
  suggestCategoryFromText,
} from '../../lib/support/supportAi'

interface SupportAiChatProps {
  className?: string
  onOpenTicket?: (prefill?: { subject?: string; message?: string; category?: string }) => void
}

export function SupportAiChat({ className, onOpenTicket }: SupportAiChatProps) {
  const { t } = useTranslation(['support', 'common'])
  const [messages, setMessages] = useState<AiChatMessage[]>([
    { role: 'assistant', content: t('support:ai.greeting') },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const send = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    const userMsg: AiChatMessage = { role: 'user', content: text }
    const nextHistory = [...messages, userMsg]
    setMessages(nextHistory)
    setTyping(true)
    await new Promise((r) => setTimeout(r, 600))
    const { reply } = generateAssistantReply(text, nextHistory, t)
    setMessages((m) => [...m, { role: 'assistant', content: reply }])
    setTyping(false)
  }

  const urgency = input ? detectUrgency(input) : null

  return (
    <div className={cn('rounded-xl border border-border bg-card flex flex-col overflow-hidden', className)}>
      <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold">{t('support:ai.title')}</p>
          <p className="text-xs text-muted-foreground">{t('support:ai.subtitle')}</p>
        </div>
      </div>

      <div className="flex-1 min-h-[220px] max-h-[360px] overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              'text-sm rounded-lg px-3 py-2 max-w-[90%] whitespace-pre-wrap',
              m.role === 'user'
                ? 'ms-auto bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            )}
          >
            {m.content}
          </div>
        ))}
        {typing && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 animate-pulse" />
            {t('support:ai.typing')}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {urgency && (urgency === 'Urgent' || urgency === 'High') && (
        <div className={cn('mx-4 mb-2 text-xs rounded-lg px-3 py-2', surfaceStatus.warning)}>
          {t('support:ai.urgencyDetected', { level: t(`support:priorities.${urgency}`) })}
        </div>
      )}

      <div className="p-3 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('support:ai.inputPlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void send())}
        />
        <Button type="button" size="icon" onClick={send} disabled={!input.trim() || typing}>
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {onOpenTicket && (
        <div className="px-3 pb-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() =>
              onOpenTicket({
                subject: input || t('support:newDialog.subjectPlaceholder'),
                message: messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n\n'),
                category: suggestCategoryFromText(input || messages.map((m) => m.content).join(' ')),
              })
            }
          >
            <Ticket className="h-4 w-4" />
            {t('support:ai.createTicket')}
          </Button>
        </div>
      )}
    </div>
  )
}
