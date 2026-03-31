export type ProviderType = 'University' | 'School' | 'Business'
export type Modality = 'Online' | 'In-person' | 'Hybrid'
export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced'
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export type MeetingTime = {
  day: DayOfWeek
  startMin: number // minutes from 00:00
  endMin: number
}

export type CourseSection = {
  id: string
  name: string // e.g. "Section A"
  meetingTimes: MeetingTime[]
  locationLabel: string // "Room 201" or "Zoom"
  joinUrl?: string
  seatsRemaining: number
}

export type Course = {
  id: string
  title: string
  providerType: ProviderType
  providerName: string
  instructor: string
  level: CourseLevel
  category: string
  rating: number
  description: string
  tags: string[]
  modality: Modality
  sections: CourseSection[]
  featured?: boolean
}

export type EnrolledClass = {
  courseId: string
  sectionId: string
  enrolledAt: string
}

export type AssignmentStatus = 'Not Started' | 'Draft' | 'Submitted' | 'Graded'

export type Assignment = {
  id: string
  courseId: string
  title: string
  dueAt: string
  status: AssignmentStatus
  prompt: string
}

export type AssignmentSubmission = {
  assignmentId: string
  text: string
  fileName?: string
  fileSize?: number
  submittedAt: string
}

export type Exam = {
  id: string
  courseId: string
  title: string
  startsAt: string
  durationMin: number
}

export type ExamQuestion = {
  id: string
  prompt: string
  choices: string[]
  answerIndex: number
}

export type ExamAttempt = {
  examId: string
  startedAt: string
  submittedAt: string
  score: number
  total: number
}

export type Message = {
  id: string
  courseId?: string
  from: string
  subject: string
  body: string
  sentAt: string
}

export type Profile = {
  id: string
  name: string
  email: string
  major: string
  year: string
  notificationsEnabled: boolean
}



