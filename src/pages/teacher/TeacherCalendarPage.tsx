import { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, DatesSetArg } from '@fullcalendar/core'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { teacherService } from '../../services/teacherService'
import type { CourseDto } from '../../services/courseService'
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
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

/** UTC calendar YYYY-MM-DD from API (matches date picked on create/edit). */
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
  const end = new Date(
    endExclusive.getFullYear(),
    endExclusive.getMonth(),
    endExclusive.getDate()
  )
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

function buildCalendarEvents(
  courses: CourseDto[],
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
      sectionName: string
      location: string
    }
  }[] = []

  for (const course of courses) {
    if (!course.sections?.length) continue
    const color = colorMap.get(course.id) || 'hsl(var(--primary))'
    for (const section of course.sections) {
      if (!section.meetingTimes?.length) continue
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
              sectionName: section.name,
              location: section.locationLabel,
            },
          })
        }
      }
    }
  }
  return list
}

export function TeacherCalendarPage() {
  const calendarRef = useRef<FullCalendar | null>(null)
  const [courses, setCourses] = useState<CourseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [eventOpen, setEventOpen] = useState(false)
  const [eventInfo, setEventInfo] = useState<{
    title: string
    location: string
    courseId: string
    sectionId: string
    sectionName: string
  } | null>(null)
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week')
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date }>(() => {
    const s = startOfWeekDate(new Date())
    return { start: s, end: addDays(s, 7) }
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const result = await teacherService.getMyCourses({ pageSize: 100 })
      setCourses(result.items)
    } catch (error) {
      toast.error('Failed to load calendar', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
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
    courses.forEach((c, idx) => {
      if (!colorMap.has(c.id)) {
        colorMap.set(c.id, colors[idx % colors.length])
      }
    })
    return colorMap
  }, [courses])

  const hasAnyMeetingTimes = useMemo(
    () =>
      courses.some((c) =>
        c.sections?.some((s) => s.meetingTimes && s.meetingTimes.length > 0)
      ),
    [courses]
  )

  const events = useMemo(() => {
    return buildCalendarEvents(courses, courseColors, visibleRange.start, visibleRange.end)
  }, [courses, courseColors, visibleRange])

  const onDatesSet = (info: DatesSetArg) => {
    setVisibleRange({ start: info.start, end: info.end })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold">My Schedule</div>
            <div className="text-sm text-muted-foreground">Your lecture schedule</div>
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
          <div className="text-2xl font-semibold">My Schedule</div>
          <div className="text-sm text-muted-foreground">
            Weekly recurring lectures; navigate weeks or switch to month. Optional course start/end dates clip the range.
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => calendarRef.current?.getApi().today()}
            aria-label="Go to today"
          >
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
            Meeting times repeat every week in the visible range. Set course start/end on create or edit to limit
            occurrences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasAnyMeetingTimes ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="rounded-full bg-muted p-4 mb-4"
                >
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </motion.div>
                <CardTitle className="text-xl mb-2">No lectures scheduled</CardTitle>
                <CardDescription className="max-w-md mb-4">
                  Add meeting times to your course sections (Edit Course → Sections → Edit) to see your schedule here.
                </CardDescription>
                <Button variant="default" asChild>
                  <Link to="/teacher/courses">My Courses</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border border-border bg-background p-2">
              <FullCalendar
                ref={(r) => {
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
                eventContent={(arg) => {
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
                    sectionName: string
                    location: string
                  }
                  setEventInfo({
                    title: arg.event.title,
                    location: ext.location,
                    courseId: ext.courseId,
                    sectionId: ext.sectionId,
                    sectionName: ext.sectionName,
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
            <DialogDescription>Lecture details</DialogDescription>
          </DialogHeader>
          {eventInfo && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Location
                    </div>
                    <div className="text-sm font-medium mt-1">{eventInfo.location}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Section
                    </div>
                    <div className="text-sm font-medium mt-1">{eventInfo.sectionName}</div>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/teacher/courses/${eventInfo.courseId}/edit`}>Edit Course</Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
