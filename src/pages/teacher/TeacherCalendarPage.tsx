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
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  buildCourseToneMap,
  calendarEventClassNames,
  type CalendarEventTone,
} from '../../lib/calendarColors'

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
  toneMap: Map<string, CalendarEventTone>,
  rangeStart: Date,
  rangeEndExclusive: Date
) {
  const days = eachDayInRange(rangeStart, rangeEndExclusive)
  const list: {
    id: string
    title: string
    start: Date
    end: Date
    classNames: string[]
    extendedProps: {
      courseId: string
      sectionId: string
      sectionName: string
      location: string
      joinUrl?: string
    }
  }[] = []

  for (const course of courses) {
    if (!course.sections?.length) continue
    const tone = toneMap.get(course.id) || 'primary'
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
            classNames: calendarEventClassNames(tone),
            extendedProps: {
              courseId: course.id,
              sectionId: section.id,
              sectionName: section.name,
              location: section.locationLabel,
              joinUrl: section.joinUrl,
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
  const { t } = useTranslation(['teacher'])
  const [courses, setCourses] = useState<CourseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [eventOpen, setEventOpen] = useState(false)
  const [eventInfo, setEventInfo] = useState<{
    title: string
    location: string
    courseId: string
    sectionId: string
    sectionName: string
    joinUrl?: string
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
      toast.error(t('teacher:calendar.errors.loadFailed'), {
        description: error instanceof Error ? error.message : t('teacher:shared.tryAgainLater'),
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

  const courseTones = useMemo(() => {
    return buildCourseToneMap(courses.map((c) => c.id))
  }, [courses])

  const hasAnyMeetingTimes = useMemo(
    () =>
      courses.some((c) =>
        c.sections?.some((s) => s.meetingTimes && s.meetingTimes.length > 0)
      ),
    [courses]
  )

  const scheduledSectionCount = useMemo(
    () =>
      courses.reduce(
        (count, course) =>
          count + (course.sections?.filter((section) => (section.meetingTimes?.length ?? 0) > 0).length ?? 0),
        0,
      ),
    [courses],
  )

  const events = useMemo(() => {
    return buildCalendarEvents(courses, courseTones, visibleRange.start, visibleRange.end)
  }, [courses, courseTones, visibleRange])

  const onDatesSet = (info: DatesSetArg) => {
    setVisibleRange({ start: info.start, end: info.end })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold">{t('teacher:calendar.pageTitle')}</div>
            <div className="text-sm text-muted-foreground">{t('teacher:calendar.pageSubtitleShort')}</div>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-sm text-muted-foreground">{t('teacher:calendar.loading')}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">{t('teacher:calendar.pageTitle')}</div>
          <div className="text-sm text-muted-foreground">
            {t('teacher:calendar.pageSubtitle')}
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
              {t('teacher:calendar.viewWeek')}
            </Button>
            <Button
              type="button"
              variant={calendarView === 'month' ? 'default' : 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => setCalendarView('month')}
            >
              {t('teacher:calendar.viewMonth')}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calendarRef.current?.getApi().prev()}
            aria-label={t('teacher:calendar.previousPeriod')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calendarRef.current?.getApi().today()}
            aria-label={t('teacher:calendar.goToToday')}
          >
            {t('teacher:calendar.today')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => calendarRef.current?.getApi().next()}
            aria-label={t('teacher:calendar.nextPeriod')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{calendarView === 'week' ? t('teacher:calendar.weekViewTitle') : t('teacher:calendar.monthViewTitle')}</CardTitle>
          <CardDescription>
            {t('teacher:calendar.viewDescription', {
              defaultValue: 'All 24 hours are available. Meeting times repeat every week in the visible range, and course start/end dates limit occurrences.',
            })}
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
                <CardTitle className="text-xl mb-2">{t('teacher:calendar.emptyTitle')}</CardTitle>
                <CardDescription className="max-w-md mb-4">
                  {t('teacher:calendar.emptyBody')}
                </CardDescription>
                <Button variant="default" asChild>
                  <Link to="/teacher/courses">{t('teacher:calendar.myCourses')}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {events.length === 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <div className="font-medium">
                    {t('teacher:calendar.noVisibleEventsTitle', {
                      defaultValue: 'No classes in this visible range',
                    })}
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {t('teacher:calendar.noVisibleEventsBody', {
                      count: scheduledSectionCount,
                      defaultValue:
                        'You have scheduled sections, but their course dates do not fall in the current week/month. Use the arrows or Today, or adjust the course start/end dates.',
                    })}
                  </p>
                </div>
              )}
              <div className="academix-calendar rounded-lg border border-border bg-background p-2">
                <FullCalendar
                  ref={(r) => {
                    calendarRef.current = (r as unknown as FullCalendar | null) ?? null
                  }}
                  plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  headerToolbar={false}
                  allDaySlot={false}
                  nowIndicator
                  height="75vh"
                  slotMinTime="00:00:00"
                  slotMaxTime="24:00:00"
                  scrollTime="00:00:00"
                  slotDuration="00:30:00"
                  slotLabelInterval="01:00:00"
                  slotEventOverlap={false}
                  events={events}
                  datesSet={onDatesSet}
                  eventMaxStack={3}
                  eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                  slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
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
                      joinUrl?: string
                    }
                    setEventInfo({
                      title: arg.event.title,
                      location: ext.location,
                      courseId: ext.courseId,
                      sectionId: ext.sectionId,
                      sectionName: ext.sectionName,
                      joinUrl: ext.joinUrl,
                    })
                    setEventOpen(true)
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={eventOpen} onOpenChange={setEventOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{eventInfo?.title}</DialogTitle>
            <DialogDescription>{t('teacher:calendar.lectureDetails')}</DialogDescription>
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
                      {t('teacher:calendar.location')}
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
                      {t('teacher:calendar.section')}
                    </div>
                    <div className="text-sm font-medium mt-1">{eventInfo.sectionName}</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                {eventInfo.joinUrl && (
                  <Button size="sm" asChild>
                    <a href={eventInfo.joinUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="me-1.5 h-3.5 w-3.5" />
                      {t('teacher:calendar.openLiveSession', { defaultValue: 'Open live session' })}
                    </a>
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/teacher/courses/${eventInfo.courseId}/edit`}>{t('teacher:calendar.editCourse')}</Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
