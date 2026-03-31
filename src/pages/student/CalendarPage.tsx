import { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, DatesSetArg } from '@fullcalendar/core'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { enrollmentService, type EnrollmentDto } from '../../services/enrollmentService'
import { courseService, type CourseDto } from '../../services/courseService'
import { Calendar, Clock, MapPin, User, ChevronLeft, ChevronRight, Video } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

const DOW_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

function startOfWeekDate(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d: Date, days: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function normalizeDayName(day: string): string {
  const dayMap: Record<string, string> = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun',
  }
  return dayMap[day] || day
}

function storedYmd(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function localYmd(day: Date): string {
  const y = day.getFullYear()
  const m = String(day.getMonth() + 1).padStart(2, '0')
  const d = String(day.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isOccurrenceInCourseBounds(day: Date, course: CourseDto): boolean {
  const start = storedYmd(course.courseStartDate)
  const end = storedYmd(course.courseEndDate)
  const cur = localYmd(day)
  if (start && cur < start) return false
  if (end && cur > end) return false
  return true
}

function eachDayInRange(start: Date, endExclusive: Date): Date[] {
  const out: Date[] = []
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const end = new Date(endExclusive.getFullYear(), endExclusive.getMonth(), endExclusive.getDate())
  while (cur < end) {
    out.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

function atMinutesOnDay(day: Date, minutes: number): Date {
  const d = new Date(day)
  d.setHours(0, 0, 0, 0)
  d.setMinutes(minutes)
  return d
}

function buildStudentCalendarEvents(
  enrollments: EnrollmentDto[],
  courses: Map<string, CourseDto>,
  colorMap: Map<string, string>,
  rangeStart: Date,
  rangeEndExclusive: Date
) {
  const days = eachDayInRange(rangeStart, rangeEndExclusive)
  const list: {
    id: string
    title: string
    start: Date
    end: Date
    backgroundColor: string
    borderColor: string
    textColor: string
    classNames: string[]
    extendedProps: {
      courseId: string
      sectionId: string
      instructor: string
      location: string
      joinUrl?: string
      sectionName: string
      category: string
    }
  }[] = []

  for (const e of enrollments) {
    const course = courses.get(e.courseId)
    if (!course) continue
    const section = course.sections.find((s) => s.id === e.sectionId)
    if (!section?.meetingTimes?.length) continue
    const color = colorMap.get(e.courseId) || 'hsl(var(--primary))'
    for (const mt of section.meetingTimes) {
      const normalizedDay = normalizeDayName(mt.day)
      const dayIndex = DOW_TO_INDEX[normalizedDay] ?? DOW_TO_INDEX[mt.day] ?? 0
      for (const day of days) {
        if (day.getDay() !== dayIndex) continue
        if (!isOccurrenceInCourseBounds(day, course)) continue
        const start = atMinutesOnDay(day, mt.startMinutes)
        const end = atMinutesOnDay(day, mt.endMinutes)
        list.push({
          id: `${course.id}:${section.id}:${mt.day}:${mt.startMinutes}:${localYmd(day)}`,
          title: `${course.title} — ${section.name}`,
          start,
          end,
          backgroundColor: color,
          borderColor: color,
          textColor: 'hsl(var(--primary-foreground))',
          classNames: ['calendar-event'],
          extendedProps: {
            courseId: course.id,
            sectionId: section.id,
            instructor: course.instructorName,
            location: section.locationLabel,
            joinUrl: section.joinUrl?.trim() || undefined,
            sectionName: section.name,
            category: course.category,
          },
        })
      }
    }
  }
  return list
}

export function CalendarPage() {
  const calendarRef = useRef<FullCalendar | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([])
  const [courses, setCourses] = useState<Map<string, CourseDto>>(new Map())
  const [loading, setLoading] = useState(true)

  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week')
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date }>(() => {
    const s = startOfWeekDate(new Date())
    return { start: s, end: addDays(s, 7) }
  })

  const [eventOpen, setEventOpen] = useState(false)
  const [eventInfo, setEventInfo] = useState<{
    title: string
    instructor: string
    location: string
    sectionName: string
    courseId: string
    sectionId: string
    joinUrl?: string
  } | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const enrollmentsResult = await enrollmentService.getMyEnrollments({ pageSize: 100 })

      const activeEnrollments = enrollmentsResult.items.filter(
        e => e.status === 'Active' || e.status === 'Completed'
      )
      setEnrollments(activeEnrollments)

      const courseIds = Array.from(new Set(activeEnrollments.map(e => e.courseId)))
      const courseMap = new Map<string, CourseDto>()
      await Promise.all(
        courseIds.map(async courseId => {
          try {
            const course = await courseService.getCourseById(courseId)
            courseMap.set(courseId, course)
          } catch (error) {
            console.error(`Failed to load course ${courseId}:`, error)
          }
        })
      )
      setCourses(courseMap)
    } catch (error) {
      toast.error('Failed to load calendar data', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const handleEnrollmentChange = () => {
      loadData()
    }
    window.addEventListener('enrollmentChanged', handleEnrollmentChange)
    return () => {
      window.removeEventListener('enrollmentChanged', handleEnrollmentChange)
    }
  }, [])

  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    api.changeView(calendarView === 'week' ? 'timeGridWeek' : 'dayGridMonth')
  }, [calendarView])

  const courseColors = useMemo(() => {
    const colors = [
      'hsl(var(--primary))',
      'hsl(217 91% 60%)',
      'hsl(270 85% 65%)',
      'hsl(199 89% 55%)',
      'hsl(142 76% 36%)',
      'hsl(24 95% 53%)',
    ]
    const colorMap = new Map<string, string>()
    enrollments.forEach((e, idx) => {
      if (!colorMap.has(e.courseId)) {
        colorMap.set(e.courseId, colors[idx % colors.length])
      }
    })
    return colorMap
  }, [enrollments])

  const hasAnyMeetingTimes = useMemo(
    () =>
      enrollments.some(e => {
        const course = courses.get(e.courseId)
        if (!course) return false
        const section = course.sections.find(s => s.id === e.sectionId)
        return Boolean(section?.meetingTimes?.length)
      }),
    [enrollments, courses]
  )

  const events = useMemo(() => {
    return buildStudentCalendarEvents(
      enrollments,
      courses,
      courseColors,
      visibleRange.start,
      visibleRange.end
    )
  }, [enrollments, courses, courseColors, visibleRange])

  const onDatesSet = (info: DatesSetArg) => {
    setVisibleRange({ start: info.start, end: info.end })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold">Class schedule</div>
            <div className="text-sm text-muted-foreground">Loading your enrolled courses…</div>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-sm text-muted-foreground">Loading calendar...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Class schedule</div>
          <div className="text-sm text-muted-foreground">
            Weekly class times from your enrollments; switch to month or move by week. Course start/end dates limit
            occurrences when set by your instructor.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-md border border-border bg-muted/30 p-0.5">
            <Button
              type="button"
              variant={calendarView === 'week' ? 'default' : 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => setCalendarView('week')}
            >
              Week
            </Button>
            <Button
              type="button"
              variant={calendarView === 'month' ? 'default' : 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => setCalendarView('month')}
            >
              Month
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calendarRef.current?.getApi().prev()}
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => calendarRef.current?.getApi().today()} aria-label="Go to today">
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calendarRef.current?.getApi().next()}
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{calendarView === 'week' ? 'Week view' : 'Month view'}</CardTitle>
          <CardDescription>
            Sessions repeat on the same weekday each week. Tap or click an event for details and links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="rounded-full bg-muted p-4 mb-4"
                >
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </motion.div>
                <CardTitle className="text-xl mb-2">No enrolled classes</CardTitle>
                <CardDescription className="max-w-md mb-4">
                  Enroll from the Course Catalog to see your schedule appear here.
                </CardDescription>
                <Button variant="default" asChild>
                  <Link to="/student/catalog">Browse Catalog</Link>
                </Button>
              </CardContent>
            </Card>
          ) : !hasAnyMeetingTimes ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="rounded-full bg-muted p-4 mb-4"
                >
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </motion.div>
                <CardTitle className="text-xl mb-2">No meeting times yet</CardTitle>
                <CardDescription className="max-w-md mb-4">
                  Your enrolled courses don&apos;t have section times scheduled yet. Check back later or contact your
                  instructor.
                </CardDescription>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/student/catalog">Catalog</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border border-border bg-background p-2">
              <FullCalendar
                ref={r => {
                  calendarRef.current = (r as unknown as FullCalendar | null) ?? null
                }}
                plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={false}
                allDaySlot={false}
                nowIndicator
                height="auto"
                slotMinTime="07:00:00"
                slotMaxTime="21:00:00"
                slotEventOverlap={false}
                events={events}
                datesSet={onDatesSet}
                eventMaxStack={3}
                dayMaxEvents={3}
                eventContent={arg => {
                  const title = arg.event.title || ''
                  const escapedTitle = title
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;')
                  return {
                    html: `<span class="fc-event-title" title="${escapedTitle}">${escapedTitle}</span>`,
                  }
                }}
                eventClick={(arg: EventClickArg) => {
                  const ext = arg.event.extendedProps as unknown as {
                    courseId: string
                    sectionId: string
                    instructor: string
                    location: string
                    joinUrl?: string
                    sectionName: string
                  }
                  setEventInfo({
                    title: arg.event.title,
                    instructor: ext.instructor,
                    location: ext.location,
                    sectionName: ext.sectionName,
                    courseId: ext.courseId,
                    sectionId: ext.sectionId,
                    joinUrl: ext.joinUrl,
                  })
                  setEventOpen(true)
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={eventOpen} onOpenChange={setEventOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{eventInfo?.title}</DialogTitle>
            <DialogDescription>Class details</DialogDescription>
          </DialogHeader>
          {eventInfo && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Instructor</div>
                    <div className="text-sm font-medium mt-1">{eventInfo.instructor}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Section</div>
                    <div className="text-sm font-medium mt-1">{eventInfo.sectionName}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:col-span-2">
                  <div className="rounded-lg bg-muted p-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</div>
                    <div className="text-sm font-medium mt-1">{eventInfo.location}</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                {eventInfo.joinUrl ? (
                  <Button size="sm" className="gap-2" asChild>
                    <a href={eventInfo.joinUrl} target="_blank" rel="noopener noreferrer">
                      <Video className="h-4 w-4" />
                      Enter Live Lesson
                    </a>
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/courses/${eventInfo.courseId}`}>View Course</Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
