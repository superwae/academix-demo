import type { SupportTicketStatus } from '../services/supportTicketService'

/**
 * Semantic status colors — driven by CSS variables in style.css so they
 * update whenever html[data-theme] changes (no Tailwind dark: required).
 */
export const statusBadge = {
  success: 'bg-emerald-500/10 border-emerald-500/20 text-[hsl(var(--status-success-fg))]',
  warning: 'bg-amber-500/10 border-amber-500/20 text-[hsl(var(--status-warning-fg))]',
  error: 'bg-red-500/10 border-red-500/20 text-[hsl(var(--status-error-fg))]',
  info: 'bg-blue-500/10 border-blue-500/20 text-[hsl(var(--status-info-fg))]',
  neutral: 'bg-muted text-muted-foreground border-border',
} as const

export const textStatus = {
  success: 'text-[hsl(var(--status-success-fg))]',
  warning: 'text-[hsl(var(--status-warning-fg))]',
  error: 'text-[hsl(var(--status-error-fg))]',
  info: 'text-[hsl(var(--status-info-fg))]',
  muted: 'text-muted-foreground',
} as const

export const surfaceStatus = {
  success: 'bg-emerald-500/10 text-[hsl(var(--status-success-fg))]',
  warning: 'bg-amber-500/10 text-[hsl(var(--status-warning-fg))]',
  error: 'bg-red-500/10 text-[hsl(var(--status-error-fg))]',
  info: 'bg-blue-500/10 text-[hsl(var(--status-info-fg))]',
} as const

export const iconStatus = {
  success: 'text-[hsl(var(--status-success-fg))]',
  warning: 'text-[hsl(var(--status-warning-fg))]',
  error: 'text-[hsl(var(--status-error-fg))]',
  info: 'text-[hsl(var(--status-info-fg))]',
} as const

/** Free-course / featured accent colors */
export const accentFree =
  'bg-emerald-500/15 border-emerald-500/30 text-[hsl(var(--status-success-fg))]'
export const accentFeatured =
  'bg-amber-500/15 text-[hsl(var(--status-warning-fg))]'
export const accentStar = 'fill-[hsl(var(--status-star-fg))] text-[hsl(var(--status-star-fg))]'

/** Support ticket status pill colors */
export const ticketStatusTone: Record<SupportTicketStatus, string> = {
  Open: 'bg-blue-500/10 text-[hsl(var(--status-info-fg))]',
  InProgress: 'bg-amber-500/10 text-[hsl(var(--status-warning-fg))]',
  WaitingOnUser: 'bg-purple-500/10 text-[hsl(var(--status-purple-fg))]',
  Resolved: 'bg-green-500/10 text-[hsl(var(--status-green-fg))]',
  Closed: 'bg-muted text-muted-foreground',
}

export const ticketPriorityTone: Record<string, string> = {
  Urgent: 'text-[hsl(var(--status-error-fg))] font-semibold',
  High: 'text-[hsl(var(--status-orange-fg))] font-semibold',
  Normal: 'text-foreground',
  Low: 'text-muted-foreground',
}
