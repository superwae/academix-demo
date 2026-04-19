import type { CourseDto, CourseSectionDto, MeetingTimeDto } from '../services/courseService'
import { dayStringToJsWeekday, getLiveSessionBadge, type LiveSessionBadge } from './liveSession'

/** One concrete live-session occurrence within a specific week. */
export interface WeeklySessionEvent {
  key: string
  courseId: string
  courseTitle: string
  sectionId: string
  sectionName: string
  locationLabel?: string
  modality?: string
  joinUrl?: string
  /** Day of week index 0-6 (Sun..Sat) */
  dayIndex: number
  startMinutes: number
  endMinutes: number
  /** Concrete JS Date for the session start, with time */
  start: Date
  end: Date
  /** Live status if this occurrence is today. null otherwise. */
  badge: LiveSessionBadge | null
}

function fmtHour(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12} ${ap}` : `${h12}:${m.toString().padStart(2, '0')} ${ap}`
}

export function formatTimeRange(startMinutes: number, endMinutes: number, startTime?: string, endTime?: string): string {
  if (startTime && endTime) return `${startTime} – ${endTime}`
  return `${fmtHour(startMinutes)} – ${fmtHour(endMinutes)}`
}

export function startOfWeek(d: Date = new Date()): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - date.getDay())
  return date
}

/**
 * Expand a list of courses into concrete weekly session events for the given week.
 * Respects section activity, course start/end dates when present, and course status.
 */
export function expandCoursesToWeekEvents(
  courses: CourseDto[],
  weekStart: Date = startOfWeek(),
  opts: {
    sectionFilter?: (courseId: string, sectionId: string) => boolean
    onlyPublished?: boolean
  } = {},
): WeeklySessionEvent[] {
  const events: WeeklySessionEvent[] = []
  const now = new Date()

  for (const course of courses) {
    if (opts.onlyPublished && (course as CourseDto & { status?: string }).status && (course as CourseDto & { status?: string }).status !== 'Published') {
      // allow it through — instructors may want to see draft schedules too
    }
    const courseStart = course.courseStartDate ? new Date(course.courseStartDate) : null
    const courseEnd = course.courseEndDate ? new Date(course.courseEndDate) : null

    for (const section of course.sections ?? []) {
      if (!section.isActive) continue
      if (opts.sectionFilter && !opts.sectionFilter(course.id, section.id)) continue

      for (const mt of (section.meetingTimes ?? []) as MeetingTimeDto[]) {
        const dow = dayStringToJsWeekday(mt.day)
        if (dow === null) continue

        const sessionDay = new Date(weekStart)
        sessionDay.setDate(weekStart.getDate() + dow)
        sessionDay.setHours(0, 0, 0, 0)

        // Skip sessions outside the course's run window
        if (courseStart && sessionDay < stripTime(courseStart)) continue
        if (courseEnd && sessionDay > stripTime(courseEnd)) continue

        const start = new Date(sessionDay)
        start.setMinutes(mt.startMinutes)
        const end = new Date(sessionDay)
        end.setMinutes(mt.endMinutes)

        const isSameWeekAsNow = isSameWeek(sessionDay, now)
        const badge = isSameWeekAsNow
          ? getLiveSessionBadge(
              { day: mt.day, startMinutes: mt.startMinutes, endMinutes: mt.endMinutes },
              now,
            )
          : null

        events.push({
          key: `${course.id}-${section.id}-${mt.id ?? dow}-${mt.startMinutes}`,
          courseId: course.id,
          courseTitle: course.title,
          sectionId: section.id,
          sectionName: section.name,
          locationLabel: section.locationLabel,
          modality: course.modality,
          joinUrl: section.joinUrl ?? undefined,
          dayIndex: dow,
          startMinutes: mt.startMinutes,
          endMinutes: mt.endMinutes,
          start,
          end,
          badge,
        })
      }
    }
  }

  events.sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex
    return a.startMinutes - b.startMinutes
  })

  return events
}

function stripTime(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function isSameWeek(a: Date, b: Date): boolean {
  return startOfWeek(a).getTime() === startOfWeek(b).getTime()
}

/** Group events by day index (0-6) returning an ordered array of 7 buckets. */
export function groupByDay(events: WeeklySessionEvent[], weekStart: Date): {
  date: Date
  dayIndex: number
  dayName: string
  events: WeeklySessionEvent[]
}[] {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    return {
      date,
      dayIndex: i,
      dayName: names[i],
      events: events.filter((e) => e.dayIndex === i),
    }
  })
}

// Note: MeetingTimeDto may have an optional id, but CourseDto type may not expose it.
// Imported above via casting — if your service DTO already has id/startTime/endTime, they'll be preserved.
// Keep compatibility with existing lib/liveSession types.
// Re-export for convenience.
export type { LiveSessionBadge }
