import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, GraduationCap, Paperclip, AlertTriangle } from 'lucide-react'
import type { TicketContextMeta } from '../../lib/support/supportMeta'
import { cn } from '../../lib/cn'

interface TicketContextBadgesProps {
  meta: TicketContextMeta | null
  category?: string
  className?: string
}

export function TicketContextBadges({ meta, category, className }: TicketContextBadgesProps) {
  const { t } = useTranslation(['support'])

  if (!meta && !category) return null

  const dept = meta?.department ?? (category === 'Billing' ? 'billing' : category === 'Technical' ? 'technical' : null)

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {meta?.issueType && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {t(`support:issues.labels.${meta.issueType}`, { defaultValue: meta.issueType })}
        </span>
      )}
      {dept && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
          {t(`support:departments.${dept}`)}
        </span>
      )}
      {meta?.courseTitle && (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          <BookOpen className="h-3 w-3" />
          {meta.courseTitle}
        </span>
      )}
      {meta?.lessonTitle && (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <GraduationCap className="h-3 w-3" />
          {meta.lessonTitle}
        </span>
      )}
      {meta?.escalated && (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3 w-3" />
          {t('support:admin.escalated')}
        </span>
      )}
      {meta?.attachments && meta.attachments.length > 0 && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Paperclip className="h-3 w-3" />
          {t('support:attachments.count', { count: meta.attachments.length })}
        </span>
      )}
    </div>
  )
}

export function TicketAttachmentList({ meta }: { meta: TicketContextMeta | null }) {
  const { t } = useTranslation(['support'])
  if (!meta?.attachments?.length) return null

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {t('support:attachments.title')}
      </p>
      <ul className="space-y-1">
        {meta.attachments.map((f) => (
          <li key={f.url}>
            <a
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <Paperclip className="h-3.5 w-3.5" />
              {f.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function TicketContextLinks({ meta }: { meta: TicketContextMeta | null }) {
  if (!meta?.courseId) return null
  const coursePath = meta.lessonId
    ? `/student/my-classes/${meta.courseId}/lessons/${meta.lessonId}`
    : `/student/my-classes/${meta.courseId}/lessons`

  return (
    <Link to={coursePath} className="text-xs text-primary hover:underline">
      {meta.lessonTitle ?? meta.courseTitle ?? 'View course'}
    </Link>
  )
}
