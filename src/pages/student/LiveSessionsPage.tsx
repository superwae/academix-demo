import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import {
  Video,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  ExternalLink,
  Loader2,
  Radio,
  Calendar,
  GraduationCap,
  BookOpen,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { format, isSameDay, addDays } from 'date-fns'
import { enrollmentService } from '../../services/enrollmentService'
import { courseService, type CourseDto } from '../../services/courseService'
import {
  expandCoursesToWeekEvents,
  formatTimeRange,
  groupByDay,
  startOfWeek,
  type WeeklySessionEvent,
} from '../../lib/weeklySessions'

const BADGE_STYLES: Record<string, string> = {
  live: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30 ring-2 ring-red-500/20',
  soon: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  today: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
}

type EnrolledPair = { courseId: string; sectionId: string }

export function LiveSessionsPage() {
  const [courses, setCourses] = useState<CourseDto[]>([])
  const [enrollmentPairs, setEnrollmentPairs] = useState<EnrolledPair[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [tick, setTick] = useState(0)

  // Refresh live status every minute
  useEffect(() => {
    const i = window.setInterval(() => setTick((t) => t + 1), 60_000)
    return () => window.clearInterval(i)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const enrollments = await enrollmentService.getMyEnrollments({ pageSize: 100 })
        const pairs: EnrolledPair[] = enrollments.items
          .filter((e) => e.status === 'Active' || e.status === 'Completed')
          .map((e) => ({ courseId: e.courseId, sectionId: e.sectionId }))
        setEnrollmentPairs(pairs)

        const uniqueCourseIds = Array.from(new Set(pairs.map((p) => p.courseId)))
        const courseResults = await Promise.allSettled(
          uniqueCourseIds.map((id) => courseService.getCourseById(id)),
        )
        const loaded = courseResults
          .filter((r): r is PromiseFulfilledResult<CourseDto> => r.status === 'fulfilled')
          .map((r) => r.value)
        setCourses(loaded)
      } catch (error) {
        toast.error('Failed to load your schedule', {
          description: error instanceof Error ? error.message : undefined,
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const weekStart = useMemo(() => {
    const d = startOfWeek(new Date())
    d.setDate(d.getDate() + weekOffset * 7)
    return d
  }, [weekOffset])

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

  const events = useMemo(() => {
    void tick
    const enrolledSet = new Set(enrollmentPairs.map((p) => `${p.courseId}::${p.sectionId}`))
    return expandCoursesToWeekEvents(courses, weekStart, {
      sectionFilter: (courseId, sectionId) => enrolledSet.has(`${courseId}::${sectionId}`),
    })
  }, [courses, enrollmentPairs, weekStart, tick])

  const daysWithEvents = useMemo(() => groupByDay(events, weekStart), [events, weekStart])

  const liveNow = events.filter((e) => e.badge === 'live')
  const startingSoon = events.filter((e) => e.badge === 'soon')
  const totalThisWeek = events.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-12"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary" />
            My Live Classes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your weekly class schedule — join live when class starts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
            This week
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Live-now banner */}
      {liveNow.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/[0.04] ring-1 ring-red-500/20">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <Radio className="h-5 w-5 text-red-500 animate-pulse" />
              </div>
              <div>
                <div className="font-semibold">
                  {liveNow.length === 1 ? 'You have a class live now' : `${liveNow.length} classes are live now`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {liveNow.map((e) => e.courseTitle).join(', ')}
                </div>
              </div>
            </div>
            {liveNow[0].joinUrl && (
              <Button asChild variant="default">
                <a href={liveNow[0].joinUrl} target="_blank" rel="noopener noreferrer">
                  <PlayCircle className="mr-1.5 h-4 w-4" />
                  Join {liveNow[0].courseTitle}
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <Radio className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Live now</div>
              <div className="text-2xl font-bold">{liveNow.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Starting soon</div>
              <div className="text-2xl font-bold">{startingSoon.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">This week</div>
              <div className="text-2xl font-bold">{totalThisWeek}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week range */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Week of {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
        </span>
        <span className="text-xs text-muted-foreground">Times shown in your local timezone</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : totalThisWeek === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Video className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h2 className="mt-4 text-lg font-semibold">No classes this week</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {enrollmentPairs.length === 0
                ? "You're not enrolled in any courses yet."
                : "None of your courses have sessions scheduled this week."}
            </p>
            <Button asChild className="mt-4">
              <Link to="/student/catalog">
                <BookOpen className="mr-1.5 h-4 w-4" />
                Browse courses
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {daysWithEvents.map((day) => {
            if (day.events.length === 0) return null
            const isToday = isSameDay(day.date, new Date())
            return (
              <Card key={day.dayIndex}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {day.dayName}
                      <span className="text-sm font-normal text-muted-foreground">
                        {format(day.date, 'MMM d')}
                      </span>
                      {isToday && (
                        <Badge className="bg-primary/10 text-primary border-primary/30">Today</Badge>
                      )}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {day.events.length} {day.events.length === 1 ? 'class' : 'classes'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {day.events.map((event) => (
                    <StudentSessionRow key={event.key} event={event} />
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function StudentSessionRow({ event }: { event: WeeklySessionEvent }) {
  const badgeClass = event.badge ? BADGE_STYLES[event.badge] : ''
  const badgeLabel =
    event.badge === 'live'
      ? 'Live now'
      : event.badge === 'soon'
      ? 'Starting soon'
      : event.badge === 'today'
      ? 'Later today'
      : null

  const canJoin = event.badge === 'live' || event.badge === 'soon'

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/courses/${event.courseId}`}
            className="font-semibold text-sm truncate hover:text-primary hover:underline"
          >
            {event.courseTitle}
          </Link>
          {badgeLabel && (
            <Badge className={`${badgeClass} border text-xs px-2 py-0.5`}>
              {event.badge === 'live' && <Radio className="mr-1 h-3 w-3 animate-pulse" />}
              {badgeLabel}
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <GraduationCap className="h-3 w-3" />
            {event.sectionName}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimeRange(event.startMinutes, event.endMinutes)}
          </span>
          {event.locationLabel && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.locationLabel}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {event.joinUrl ? (
          canJoin ? (
            <Button size="sm" variant="default" asChild>
              <a href={event.joinUrl} target="_blank" rel="noopener noreferrer">
                <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Join
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild>
              <a href={event.joinUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View link
              </a>
            </Button>
          )
        ) : (
          <Button size="sm" variant="outline" disabled title="Your instructor has not set a join link yet">
            <Video className="mr-1.5 h-3.5 w-3.5" />
            No link yet
          </Button>
        )}
      </div>
    </div>
  )
}
