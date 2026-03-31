import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSeed, type SeedData } from '../data/seed'
import type {
  AssignmentSubmission,
  EnrolledClass,
  ExamAttempt,
} from '../types/academix'
import type { Assignment, Course, Exam, Message, Profile } from '../types/academix'
import type { ThemeId, MixThemeId } from '../theme/themes'

export type AppData = SeedData & {
  theme: ThemeId
  customThemeColor?: string // HSL color string for custom theme
  mixTheme?: MixThemeId | null // gradient mix (red-blue, etc.); clears when preset is chosen
  enrolled: EnrolledClass[]
  submissions: AssignmentSubmission[]
  examAttempts: ExamAttempt[]
  messageRead: Record<string, boolean>
}

type AppState = {
  data: AppData
  setTheme: (theme: ThemeId) => void
  setCustomThemeColor: (color: string) => void
  setMixTheme: (mix: MixThemeId | null) => void
  resetDemoData: () => void

  enroll: (courseId: string, sectionId: string) => void
  unenroll: (courseId: string) => void

  updateProfile: (patch: Partial<Profile>) => void

  upsertSubmission: (sub: AssignmentSubmission) => void
  markMessageRead: (messageId: string, read: boolean) => void
  addExamAttempt: (attempt: ExamAttempt) => void

  // derived helpers
  getCourse: (courseId: string) => Course | undefined
  getAssignment: (assignmentId: string) => Assignment | undefined
  getExam: (examId: string) => Exam | undefined
  getMessage: (messageId: string) => Message | undefined
}

function buildInitial(): AppData {
  const seed = createSeed()
  return {
    ...seed,
    theme: 'light',
    enrolled: [],
    submissions: [],
    examAttempts: [],
    messageRead: {},
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      data: buildInitial(),

      setTheme: (theme) => {
        set((s) => ({
          data: {
            ...s.data,
            theme,
            customThemeColor: theme === 'custom' ? s.data.customThemeColor : undefined,
            mixTheme: theme === 'custom' ? s.data.mixTheme : undefined,
          },
        }))
        void import('../theme/syncUserUiPreferences').then((m) => m.scheduleSyncUiPreferencesToServer())
      },

      setCustomThemeColor: (color) => {
        set((s) => ({
          data: { ...s.data, customThemeColor: color, theme: 'custom' as ThemeId, mixTheme: undefined },
        }))
        void import('../theme/syncUserUiPreferences').then((m) => m.scheduleSyncUiPreferencesToServer())
      },

      setMixTheme: (mix) => {
        set((s) => ({
          data: {
            ...s.data,
            mixTheme: mix ?? undefined,
            theme: mix ? ('custom' as ThemeId) : s.data.theme,
            customThemeColor: mix ? undefined : s.data.customThemeColor,
          },
        }))
        void import('../theme/syncUserUiPreferences').then((m) => m.scheduleSyncUiPreferencesToServer())
      },

      resetDemoData: () => set({ data: buildInitial() }),

      enroll: (courseId, sectionId) =>
        set((s) => ({
          data: {
            ...s.data,
            enrolled: [
              ...s.data.enrolled.filter((e) => e.courseId !== courseId),
              { courseId, sectionId, enrolledAt: new Date().toISOString() },
            ],
          },
        })),

      unenroll: (courseId) =>
        set((s) => ({
          data: {
            ...s.data,
            enrolled: s.data.enrolled.filter((e) => e.courseId !== courseId),
          },
        })),

      updateProfile: (patch) =>
        set((s) => ({
          data: { ...s.data, profile: { ...s.data.profile, ...patch } },
        })),

      upsertSubmission: (sub) =>
        set((s) => {
          const existing = s.data.submissions.filter((x) => x.assignmentId !== sub.assignmentId)
          return { data: { ...s.data, submissions: [...existing, sub] } }
        }),

      markMessageRead: (messageId, read) =>
        set((s) => ({
          data: { ...s.data, messageRead: { ...s.data.messageRead, [messageId]: read } },
        })),

      addExamAttempt: (attempt) =>
        set((s) => ({
          data: { ...s.data, examAttempts: [...s.data.examAttempts, attempt] },
        })),

      getCourse: (courseId) => get().data.courses.find((c) => c.id === courseId),
      getAssignment: (assignmentId) => get().data.assignments.find((a) => a.id === assignmentId),
      getExam: (examId) => get().data.exams.find((e) => e.id === examId),
      getMessage: (messageId) => get().data.messages.find((m) => m.id === messageId),
    }),
    {
      name: 'academix.data.v1',
      version: 1,
    },
  ),
)


