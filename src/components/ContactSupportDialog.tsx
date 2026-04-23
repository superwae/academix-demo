import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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

const CATEGORIES: SupportTicketCategory[] = [
  'Billing',
  'Technical',
  'Course',
  'Account',
  'Feedback',
  'Other',
]

interface ContactSupportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a ticket is successfully created. */
  onCreated?: (ticketId: string) => void
  /** Preselected category when the dialog opens from a context-specific entry point. */
  defaultCategory?: SupportTicketCategory
}

export function ContactSupportDialog({
  open,
  onOpenChange,
  onCreated,
  defaultCategory = 'Other',
}: ContactSupportDialogProps) {
  const { t } = useTranslation(['support', 'common'])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<SupportTicketCategory>(defaultCategory)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setSubmitting(true)
    try {
      const ticket = await supportTicketService.create({
        subject: subject.trim(),
        message: message.trim(),
        category,
      })
      toast.success(t('support:newDialog.createdToast'))
      setSubject('')
      setMessage('')
      setCategory(defaultCategory)
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('support:newDialog.title')}</DialogTitle>
          <DialogDescription>{t('support:newDialog.description')}</DialogDescription>
        </DialogHeader>
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
          </div>
          <div>
            <Label htmlFor="support-message">{t('support:newDialog.messageLabel')}</Label>
            <Textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('support:newDialog.messagePlaceholder')}
              rows={6}
              required
              maxLength={4000}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t('common:cancel')}
            </Button>
            <Button type="submit" disabled={submitting || !subject.trim() || !message.trim()}>
              {submitting ? t('common:loading') : t('support:newDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
