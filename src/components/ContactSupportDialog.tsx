import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Paperclip, Sparkles, X, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select } from './ui/select'
import {
  supportTicketService,
  type SupportTicketCategory,
} from '../services/supportTicketService'
import { fileService } from '../services/fileService'
import { buildTicketMessage } from '../lib/support/supportMeta'
import { surfaceStatus } from '../lib/semanticColors'
import {
  ISSUE_TYPE_TO_CATEGORY,
  ISSUE_TYPE_TO_DEPARTMENT,
  type SupportIssueType,
} from '../lib/support/supportIssueTypes'
import {
  detectUrgency,
  suggestCategoryFromText,
  suggestIssueTypeFromText,
} from '../lib/support/supportAi'
import { searchKnowledgeBase } from '../lib/support/supportKnowledgeBase'

const CATEGORIES: SupportTicketCategory[] = [
  'Billing',
  'Technical',
  'Course',
  'Account',
  'Feedback',
  'Other',
]

export interface TicketFormContext {
  courseId?: string
  courseTitle?: string
  lessonId?: string
  lessonTitle?: string
  assignmentId?: string
  certificateId?: string
  audience?: 'student' | 'instructor'
  issueType?: SupportIssueType
  defaultSubject?: string
  defaultMessage?: string
}

interface ContactSupportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (ticketId: string) => void
  defaultCategory?: SupportTicketCategory
  context?: TicketFormContext
}

export function ContactSupportDialog({
  open,
  onOpenChange,
  onCreated,
  defaultCategory = 'Other',
  context,
}: ContactSupportDialogProps) {
  const { t } = useTranslation(['support', 'common'])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<SupportTicketCategory>(defaultCategory)
  const [issueType, setIssueType] = useState<SupportIssueType | ''>('')
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const cat = context?.issueType
      ? ISSUE_TYPE_TO_CATEGORY[context.issueType]
      : defaultCategory
    setCategory(cat)
    setIssueType(context?.issueType ?? '')
    setSubject(context?.defaultSubject ?? '')
    setMessage(context?.defaultMessage ?? '')
    setAttachments([])
  }, [open, context, defaultCategory])

  const suggestedArticles = useMemo(() => {
    const q = `${subject} ${message}`.trim()
    if (q.length < 4) return []
    return searchKnowledgeBase(q, context?.audience ?? 'all', t).slice(0, 3)
  }, [subject, message, context?.audience, t])

  const urgency = useMemo(() => detectUrgency(`${subject} ${message}`), [subject, message])

  const applyAiSuggestions = () => {
    const combined = `${subject} ${message}`.trim()
    if (combined.length < 8) return
    setCategory(suggestCategoryFromText(combined))
    const it = suggestIssueTypeFromText(combined)
    if (it) setIssueType(it)
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const uploaded: { url: string; name: string }[] = []
      for (const file of Array.from(files)) {
        const res = await fileService.uploadFile(file, 'support')
        uploaded.push({ url: res.fileUrl, name: res.fileName })
      }
      setAttachments((prev) => [...prev, ...uploaded])
      toast.success(t('support:attachments.uploaded'))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setSubmitting(true)
    try {
      const resolvedIssue = issueType || context?.issueType
      const body = buildTicketMessage(message.trim(), {
        issueType: resolvedIssue,
        department: resolvedIssue ? ISSUE_TYPE_TO_DEPARTMENT[resolvedIssue] : undefined,
        courseId: context?.courseId,
        courseTitle: context?.courseTitle,
        lessonId: context?.lessonId,
        lessonTitle: context?.lessonTitle,
        assignmentId: context?.assignmentId,
        certificateId: context?.certificateId,
        attachments: attachments.length ? attachments : undefined,
        audience: context?.audience,
      })
      const ticket = await supportTicketService.create({
        subject: subject.trim(),
        message: body,
        category,
      })
      toast.success(t('support:newDialog.createdToast'))
      onOpenChange(false)
      onCreated?.(ticket.id)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('support:newDialog.title')}</DialogTitle>
          <DialogDescription>{t('support:newDialog.description')}</DialogDescription>
        </DialogHeader>

        {(context?.courseTitle || context?.lessonTitle) && (
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {context.lessonTitle
              ? t('support:context.fromLesson', {
                  course: context.courseTitle,
                  lesson: context.lessonTitle,
                })
              : t('support:context.fromCourse', { course: context.courseTitle })}
          </div>
        )}

        {suggestedArticles.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t('support:kb.suggestedBeforeTicket')}
            </p>
            <ul className="space-y-1">
              {suggestedArticles.map((a) => (
                <li key={a.id} className="text-xs text-muted-foreground">
                  • {t(a.titleKey)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {urgency === 'Urgent' || urgency === 'High' ? (
          <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${surfaceStatus.warning}`}>
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            {t('support:ai.urgencyDetected', { level: t(`support:priorities.${urgency}`) })}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="support-subject">{t('support:newDialog.subjectLabel')}</Label>
            <Input
              id="support-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('support:newDialog.subjectPlaceholder')}
              required
              maxLength={200}
            />
          </div>
          <div>
            <Label>{t('support:newDialog.categoryLabel')}</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as SupportTicketCategory)}
              options={CATEGORIES.map((c) => ({ value: c, label: t(`support:categories.${c}`) }))}
            />
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <button type="button" className="hover:text-primary underline-offset-2 hover:underline" onClick={applyAiSuggestions}>
                {t('support:ai.autoCategory')}
              </button>
            </p>
          </div>
          <div>
            <Label htmlFor="support-message">{t('support:newDialog.messageLabel')}</Label>
            <Textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('support:newDialog.messagePlaceholder')}
              rows={5}
              required
              maxLength={4000}
            />
          </div>

          <div>
            <Label>{t('support:attachments.title')}</Label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 mt-1"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
              {uploading ? t('common:loading') : t('support:attachments.add')}
            </Button>
            {attachments.length > 0 && (
              <ul className="mt-2 space-y-1">
                {attachments.map((f) => (
                  <li key={f.url} className="flex items-center gap-2 text-xs">
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate flex-1">{f.name}</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setAttachments((a) => a.filter((x) => x.url !== f.url))}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t('common:cancel')}
            </Button>
            <Button type="submit" disabled={submitting || uploading || !subject.trim() || !message.trim()}>
              {submitting ? t('common:loading') : t('support:newDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
