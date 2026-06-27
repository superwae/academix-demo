import type { SupportAudience } from './supportIssueTypes'
import type { SupportIssueType } from './supportIssueTypes'

export type KbSection = 'faq' | 'student_guide' | 'instructor_guide' | 'video' | 'policy'

export interface KnowledgeArticle {
  id: string
  section: KbSection
  titleKey: string
  bodyKey: string
  tags: string[]
  audience: SupportAudience
  relatedIssueTypes?: SupportIssueType[]
  videoUrl?: string
}

export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'login-reset',
    section: 'faq',
    titleKey: 'support:kb.loginResetTitle',
    bodyKey: 'support:kb.loginResetBody',
    tags: ['login', 'password', 'account', 'verify'],
    audience: 'all',
    relatedIssueTypes: ['account_login'],
  },
  {
    id: 'course-not-unlocked',
    section: 'faq',
    titleKey: 'support:kb.courseAccessTitle',
    bodyKey: 'support:kb.courseAccessBody',
    tags: ['course', 'access', 'enrollment', 'locked'],
    audience: 'student',
    relatedIssueTypes: ['course_access'],
  },
  {
    id: 'payment-failed',
    section: 'faq',
    titleKey: 'support:kb.paymentTitle',
    bodyKey: 'support:kb.paymentBody',
    tags: ['payment', 'billing', 'subscription', 'refund'],
    audience: 'student',
    relatedIssueTypes: ['payment_billing'],
  },
  {
    id: 'certificate-missing',
    section: 'faq',
    titleKey: 'support:kb.certificateTitle',
    bodyKey: 'support:kb.certificateBody',
    tags: ['certificate', 'completion', 'pdf'],
    audience: 'student',
    relatedIssueTypes: ['certificates'],
  },
  {
    id: 'video-wont-play',
    section: 'faq',
    titleKey: 'support:kb.videoTitle',
    bodyKey: 'support:kb.videoBody',
    tags: ['video', 'lesson', 'browser', 'technical'],
    audience: 'student',
    relatedIssueTypes: ['technical', 'bug_report'],
  },
  {
    id: 'student-getting-started',
    section: 'student_guide',
    titleKey: 'support:kb.studentStartTitle',
    bodyKey: 'support:kb.studentStartBody',
    tags: ['student', 'dashboard', 'enroll'],
    audience: 'student',
  },
  {
    id: 'student-assignments',
    section: 'student_guide',
    titleKey: 'support:kb.studentAssignmentsTitle',
    bodyKey: 'support:kb.studentAssignmentsBody',
    tags: ['assignment', 'submit', 'grade'],
    audience: 'student',
    relatedIssueTypes: ['assignment_submission'],
  },
  {
    id: 'instructor-publish',
    section: 'instructor_guide',
    titleKey: 'support:kb.instructorPublishTitle',
    bodyKey: 'support:kb.instructorPublishBody',
    tags: ['publish', 'course', 'draft', 'review'],
    audience: 'instructor',
    relatedIssueTypes: ['course_publishing'],
  },
  {
    id: 'instructor-upload',
    section: 'instructor_guide',
    titleKey: 'support:kb.instructorUploadTitle',
    bodyKey: 'support:kb.instructorUploadBody',
    tags: ['upload', 'video', 'materials', 'size'],
    audience: 'instructor',
    relatedIssueTypes: ['content_upload'],
  },
  {
    id: 'instructor-payouts',
    section: 'instructor_guide',
    titleKey: 'support:kb.instructorPayoutTitle',
    bodyKey: 'support:kb.instructorPayoutBody',
    tags: ['payout', 'earnings', 'marketplace'],
    audience: 'instructor',
    relatedIssueTypes: ['payout_request'],
  },
  {
    id: 'video-tour-student',
    section: 'video',
    titleKey: 'support:kb.videoTourStudentTitle',
    bodyKey: 'support:kb.videoTourStudentBody',
    tags: ['video', 'tutorial', 'student'],
    audience: 'student',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    id: 'video-tour-instructor',
    section: 'video',
    titleKey: 'support:kb.videoTourInstructorTitle',
    bodyKey: 'support:kb.videoTourInstructorBody',
    tags: ['video', 'tutorial', 'instructor'],
    audience: 'instructor',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  },
  {
    id: 'policy-privacy',
    section: 'policy',
    titleKey: 'support:kb.policyPrivacyTitle',
    bodyKey: 'support:kb.policyPrivacyBody',
    tags: ['privacy', 'data', 'policy'],
    audience: 'all',
  },
  {
    id: 'policy-refund',
    section: 'policy',
    titleKey: 'support:kb.policyRefundTitle',
    bodyKey: 'support:kb.policyRefundBody',
    tags: ['refund', 'billing', 'policy'],
    audience: 'all',
  },
  {
    id: 'policy-conduct',
    section: 'policy',
    titleKey: 'support:kb.policyConductTitle',
    bodyKey: 'support:kb.policyConductBody',
    tags: ['conduct', 'community', 'policy'],
    audience: 'all',
  },
]

export function searchKnowledgeBase(
  query: string,
  audience: SupportAudience = 'all',
  t: (key: string) => string
): KnowledgeArticle[] {
  const q = query.trim().toLowerCase()
  const pool = KNOWLEDGE_ARTICLES.filter(
    (a) => audience === 'all' || a.audience === 'all' || a.audience === audience
  )
  if (!q) return pool
  return pool.filter((a) => {
    const title = t(a.titleKey).toLowerCase()
    const body = t(a.bodyKey).toLowerCase()
    return (
      title.includes(q) ||
      body.includes(q) ||
      a.tags.some((tag) => tag.includes(q) || q.includes(tag))
    )
  })
}

export function articlesForIssue(issueType: SupportIssueType): KnowledgeArticle[] {
  return KNOWLEDGE_ARTICLES.filter((a) => a.relatedIssueTypes?.includes(issueType))
}
