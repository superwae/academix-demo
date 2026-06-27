import type { SupportIssueType, SupportDepartment } from './supportIssueTypes'

const META_MARKER = '\n\n---\n<!-- support-meta '

export interface TicketContextMeta {
  issueType?: SupportIssueType
  department?: SupportDepartment
  courseId?: string
  courseTitle?: string
  lessonId?: string
  lessonTitle?: string
  assignmentId?: string
  certificateId?: string
  attachments?: { url: string; name: string }[]
  escalated?: boolean
  audience?: 'student' | 'instructor'
}

export function buildTicketMessage(body: string, meta: TicketContextMeta): string {
  const trimmed = body.trimEnd()
  if (Object.keys(meta).length === 0) return trimmed
  return `${trimmed}${META_MARKER}${JSON.stringify(meta)} -->`
}

export function parseTicketMessage(raw: string): { body: string; meta: TicketContextMeta | null } {
  const idx = raw.indexOf(META_MARKER)
  if (idx === -1) return { body: raw, meta: null }
  const body = raw.slice(0, idx)
  const tail = raw.slice(idx + META_MARKER.length)
  const end = tail.indexOf(' -->')
  if (end === -1) return { body: raw, meta: null }
  try {
    const meta = JSON.parse(tail.slice(0, end)) as TicketContextMeta
    return { body, meta }
  } catch {
    return { body: raw, meta: null }
  }
}

export function getTicketDepartment(
  meta: TicketContextMeta | null,
  category: string
): SupportDepartment {
  if (meta?.department) return meta.department
  if (category === 'Billing') return 'billing'
  if (category === 'Technical') return 'technical'
  if (category === 'Course') return 'academic'
  if (category === 'Account') return 'general'
  return 'general'
}
