import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search,
  BookOpen,
  GraduationCap,
  Video,
  FileText,
  LifeBuoy,
  Plus,
  ChevronRight,
} from 'lucide-react'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { ContactSupportDialog, type TicketFormContext } from '../../components/ContactSupportDialog'
import { SupportAiChat } from '../../components/support/SupportAiChat'
import {
  KNOWLEDGE_ARTICLES,
  searchKnowledgeBase,
  type KbSection,
} from '../../lib/support/supportKnowledgeBase'
import { useAuthStore } from '../../store/useAuthStore'
import { cn } from '../../lib/cn'

const SECTIONS: { key: KbSection; icon: typeof BookOpen; labelKey: string }[] = [
  { key: 'faq', icon: LifeBuoy, labelKey: 'support:kb.sections.faq' },
  { key: 'student_guide', icon: BookOpen, labelKey: 'support:kb.sections.studentGuide' },
  { key: 'instructor_guide', icon: GraduationCap, labelKey: 'support:kb.sections.instructorGuide' },
  { key: 'video', icon: Video, labelKey: 'support:kb.sections.video' },
  { key: 'policy', icon: FileText, labelKey: 'support:kb.sections.policy' },
]

function detectAudience(roles: string[] | undefined): 'student' | 'instructor' | 'all' {
  const r = new Set((roles ?? []).map((x) => x.toLowerCase()))
  if (r.has('instructor') || r.has('teacher')) return 'instructor'
  if (r.has('student')) return 'student'
  return 'all'
}

export function SupportHelpCenterPage() {
  const { t } = useTranslation(['support', 'common'])
  const { user } = useAuthStore()
  const audience = detectAudience(user?.roles)
  const [query, setQuery] = useState('')
  const [section, setSection] = useState<KbSection | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [ticketOpen, setTicketOpen] = useState(false)
  const [ticketPrefill, setTicketPrefill] = useState<TicketFormContext | undefined>()

  const articles = useMemo(() => {
    let list = searchKnowledgeBase(query, audience, t)
    if (section !== 'all') list = list.filter((a) => a.section === section)
    return list
  }, [query, section, audience, t])

  const selected = selectedId
    ? KNOWLEDGE_ARTICLES.find((a) => a.id === selectedId) ?? articles[0]
    : articles[0]

  const openTicket = (prefill?: TicketFormContext) => {
    setTicketPrefill({ ...prefill, audience: audience === 'all' ? undefined : audience })
    setTicketOpen(true)
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('support:kb.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{t('support:kb.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/support">{t('support:myTickets')}</Link>
          </Button>
          <Button className="gap-2" onClick={() => openTicket()}>
            <Plus className="h-4 w-4" />
            {t('support:new')}
          </Button>
        </div>
      </header>

      <div className="relative max-w-xl">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('support:kb.searchPlaceholder')}
          className="ps-9"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSection('all')}
              className={cn(
                'px-3 py-1.5 text-sm rounded-full border',
                section === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
              )}
            >
              {t('support:admin.filterAll')}
            </button>
            {SECTIONS.filter(
              (s) =>
                s.key === 'faq' ||
                s.key === 'policy' ||
                (audience === 'student' && s.key === 'student_guide') ||
                (audience === 'instructor' && s.key === 'instructor_guide') ||
                audience === 'all'
            ).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-full border inline-flex items-center gap-1.5',
                  section === s.key ? 'bg-muted border-primary/40' : 'border-border hover:bg-muted/60'
                )}
              >
                <s.icon className="h-3.5 w-3.5" />
                {t(s.labelKey)}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {articles.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-2">{t('support:kb.noResults')}</p>
            ) : (
              articles.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    'text-start rounded-xl border p-4 hover:border-primary/40 transition-colors',
                    selected?.id === a.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  )}
                >
                  <p className="font-semibold text-sm">{t(a.titleKey)}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t(a.bodyKey)}</p>
                </button>
              ))
            )}
          </div>

          {selected && (
            <article className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-bold">{t(selected.titleKey)}</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {t(selected.bodyKey)}
              </p>
              {selected.videoUrl && (
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <iframe
                    title={t(selected.titleKey)}
                    src={selected.videoUrl}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              )}
              <Button variant="link" className="px-0 gap-1" onClick={() => openTicket({ defaultSubject: t(selected.titleKey) })}>
                {t('support:kb.stillNeedHelp')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </article>
          )}
        </div>

        <SupportAiChat
          className="min-h-[420px]"
          onOpenTicket={(prefill) =>
            openTicket({
              defaultSubject: prefill?.subject,
              defaultMessage: prefill?.message,
              audience: audience === 'all' ? undefined : audience,
            })
          }
        />
      </div>

      <ContactSupportDialog
        open={ticketOpen}
        onOpenChange={setTicketOpen}
        context={ticketPrefill}
        onCreated={() => setTicketOpen(false)}
      />
    </div>
  )
}
