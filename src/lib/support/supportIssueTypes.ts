import type { SupportTicketCategory } from '../../services/supportTicketService'

/** Frontend issue types — mapped to API categories + metadata. */
export type SupportIssueType =
  | 'account_login'
  | 'course_access'
  | 'payment_billing'
  | 'certificates'
  | 'technical'
  | 'instructor_support'
  | 'feature_request'
  | 'bug_report'
  | 'assignment_submission'
  | 'course_publishing'
  | 'content_upload'
  | 'payout_request'

export type SupportDepartment =
  | 'general'
  | 'billing'
  | 'technical'
  | 'academic'
  | 'instructor_ops'

export type SupportAudience = 'student' | 'instructor' | 'all'

export interface QuickIssuePreset {
  issueType: SupportIssueType
  labelKey: string
  subjectKey: string
  defaultCategory: SupportTicketCategory
  department: SupportDepartment
  audience: SupportAudience
}

export const ISSUE_TYPE_TO_CATEGORY: Record<SupportIssueType, SupportTicketCategory> = {
  account_login: 'Account',
  course_access: 'Course',
  payment_billing: 'Billing',
  certificates: 'Course',
  technical: 'Technical',
  instructor_support: 'Course',
  feature_request: 'Feedback',
  bug_report: 'Technical',
  assignment_submission: 'Course',
  course_publishing: 'Course',
  content_upload: 'Technical',
  payout_request: 'Billing',
}

export const ISSUE_TYPE_TO_DEPARTMENT: Record<SupportIssueType, SupportDepartment> = {
  account_login: 'general',
  course_access: 'academic',
  payment_billing: 'billing',
  certificates: 'academic',
  technical: 'technical',
  instructor_support: 'instructor_ops',
  feature_request: 'general',
  bug_report: 'technical',
  assignment_submission: 'academic',
  course_publishing: 'instructor_ops',
  content_upload: 'instructor_ops',
  payout_request: 'billing',
}

export const STUDENT_QUICK_ISSUES: QuickIssuePreset[] = [
  {
    issueType: 'account_login',
    labelKey: 'support:issues.accountLogin',
    subjectKey: 'support:issues.accountLoginSubject',
    defaultCategory: 'Account',
    department: 'general',
    audience: 'student',
  },
  {
    issueType: 'course_access',
    labelKey: 'support:issues.courseAccess',
    subjectKey: 'support:issues.courseAccessSubject',
    defaultCategory: 'Course',
    department: 'academic',
    audience: 'student',
  },
  {
    issueType: 'payment_billing',
    labelKey: 'support:issues.paymentBilling',
    subjectKey: 'support:issues.paymentBillingSubject',
    defaultCategory: 'Billing',
    department: 'billing',
    audience: 'student',
  },
  {
    issueType: 'certificates',
    labelKey: 'support:issues.certificates',
    subjectKey: 'support:issues.certificatesSubject',
    defaultCategory: 'Course',
    department: 'academic',
    audience: 'student',
  },
  {
    issueType: 'technical',
    labelKey: 'support:issues.technical',
    subjectKey: 'support:issues.technicalSubject',
    defaultCategory: 'Technical',
    department: 'technical',
    audience: 'student',
  },
  {
    issueType: 'assignment_submission',
    labelKey: 'support:issues.assignmentSubmission',
    subjectKey: 'support:issues.assignmentSubmissionSubject',
    defaultCategory: 'Course',
    department: 'academic',
    audience: 'student',
  },
  {
    issueType: 'bug_report',
    labelKey: 'support:issues.bugReport',
    subjectKey: 'support:issues.bugReportSubject',
    defaultCategory: 'Technical',
    department: 'technical',
    audience: 'student',
  },
  {
    issueType: 'feature_request',
    labelKey: 'support:issues.featureRequest',
    subjectKey: 'support:issues.featureRequestSubject',
    defaultCategory: 'Feedback',
    department: 'general',
    audience: 'all',
  },
]

export const INSTRUCTOR_QUICK_ISSUES: QuickIssuePreset[] = [
  {
    issueType: 'course_publishing',
    labelKey: 'support:issues.coursePublishing',
    subjectKey: 'support:issues.coursePublishingSubject',
    defaultCategory: 'Course',
    department: 'instructor_ops',
    audience: 'instructor',
  },
  {
    issueType: 'content_upload',
    labelKey: 'support:issues.contentUpload',
    subjectKey: 'support:issues.contentUploadSubject',
    defaultCategory: 'Technical',
    department: 'instructor_ops',
    audience: 'instructor',
  },
  {
    issueType: 'instructor_support',
    labelKey: 'support:issues.instructorSupport',
    subjectKey: 'support:issues.instructorSupportSubject',
    defaultCategory: 'Course',
    department: 'instructor_ops',
    audience: 'instructor',
  },
  {
    issueType: 'payout_request',
    labelKey: 'support:issues.payoutRequest',
    subjectKey: 'support:issues.payoutRequestSubject',
    defaultCategory: 'Billing',
    department: 'billing',
    audience: 'instructor',
  },
  ...STUDENT_QUICK_ISSUES.filter((i) => i.issueType === 'bug_report' || i.issueType === 'feature_request'),
]

export const SUPPORT_DEPARTMENTS: SupportDepartment[] = [
  'general',
  'billing',
  'technical',
  'academic',
  'instructor_ops',
]
