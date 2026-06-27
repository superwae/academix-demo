import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { ContactSupportDialog, type TicketFormContext } from '../ContactSupportDialog'
import type { SupportIssueType } from '../../lib/support/supportIssueTypes'

interface ReportProblemButtonProps {
  courseId: string
  courseTitle: string
  lessonId?: string
  lessonTitle?: string
  issueType?: SupportIssueType
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function ReportProblemButton({
  courseId,
  courseTitle,
  lessonId,
  lessonTitle,
  issueType = 'technical',
  variant = 'outline',
  size = 'sm',
  className,
}: ReportProblemButtonProps) {
  const { t } = useTranslation(['support'])
  const [open, setOpen] = useState(false)

  const context: TicketFormContext = {
    courseId,
    courseTitle,
    lessonId,
    lessonTitle,
    issueType,
    audience: 'student',
    defaultSubject: lessonTitle
      ? t('support:context.lessonProblemSubject', { lesson: lessonTitle })
      : t('support:context.courseProblemSubject', { course: courseTitle }),
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <AlertCircle className="h-4 w-4 me-1.5" />
        {t('support:reportProblem')}
      </Button>
      <ContactSupportDialog open={open} onOpenChange={setOpen} context={context} />
    </>
  )
}
