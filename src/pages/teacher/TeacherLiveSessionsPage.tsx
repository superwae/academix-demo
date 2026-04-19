import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import {
  Video,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Link as LinkIcon,
  ExternalLink,
  Loader2,
  Radio,
  Calendar,
  Edit2,
  Check,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { format, isSameDay, addDays } from 'date-fns'
import { teacherService } from '../../services/teacherService'
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

export function TeacherLiveSessionsPage() {
  const [courses, setCourses] = useState<CourseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [tick, setTick] = useState(0)
  const [editSession, setEditSession] = useState<WeeklySessionEvent | null>(null)
  const [newJoinUrl, setNewJoinUrl] = useState('')
  const [savingUrl, setSavingUrl] = useState(false)

  // Auto-refresh "live now" status every minute
  useEffect(() => {
    const i = window.setInterval(() => setTick((t) => t + 1), 60_000)
    return () => window.clearInterval(i)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const result = await teacherService.getMyCourses({ pageSize: 500 })
        setCourses(result.items)
      } catch (error) {
        toast.error('Failed to load your courses', {
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
    void tick // subscribe so live badges refresh
    return expandCoursesToWeekEvents(courses, weekStart)
  }, [courses, weekStart, tick])

  const daysWithEvents = useMemo(() => groupByDay(events, weekStart), [events, weekStart])

  const upcomingToday = useMemo(() => {
    const today = new Date()
    return events.filter((e) => isSameDay(e.start, today))
  }, [events])

  const liveNow = upcomingToday.filter((e) => e.badge === 'live')
  const startingSoon = upcomingToday.filter((e) => e.badge === 'soon')

  const openUrlEditor = (session: WeeklySessionEvent) => {
    setEditSession(session)
    setNewJoinUrl(session.joinUrl ?? '')
  }

  const saveJoinUrl = async () => {
    if (!editSession) return
    const url = newJoinUrl.trim()
    if (url && !/^https?:\/\//i.test(url)) {
      toast.error('Invalid URL', { description: 'Link must start with http:// or https://' })
      return
    }
    try {
      setSavingUrl(true)
      const course = courses.find((c) => c.id === editSession.courseId)
      const section = course?.sections.find((s) => s.id === editSession.sectionId)
      if (!course || !section) {
        toast.error('Section no longer exists')
        return
      }
      await courseService.updateSection(course.id, section.id, {
        name: section.name,
        locationLabel: section.locationLabel,
        joinUrl: url || undefined,
        maxSeats: section.maxSeats,
        meetingTimes: section.meetingTimes.map((mt) => ({
          day: mt.day,
          startMinutes: mt.startMinutes,
          endMinutes: mt.endMinutes,
        })),
      })
      // Optimistic update
      setCourses((prev) =>
        prev.map((c) =>
          c.id !== course.id
            ? c
            : {
                ...c,
                sections: c.sections.map((s) =>
                  s.id !== section.id ? s : { ...s, joinUrl: url || undefined },
                ),
              },
        ),
      )
      toast.success(url ? 'Join link updated' : 'Join link cleared')
      setEditSession(null)
    } catch (error) {
      toast.error('Failed to update join link', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setSavingUrl(false)
    }
  }

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
            Live Sessions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your weekly class schedule and join links
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

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <Radio className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Live right now</div>
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
              <div className="text-xs text-muted-foreground">Total this week</div>
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
        {weekOffset === 0 && (
          <span className="text-xs text-muted-foreground">Times are in your local timezone</span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : totalThisWeek === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Video className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h2 className="mt-4 text-lg font-semibold">No sessions this week</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sessions appear here based on each course section's weekly schedule.
            </p>
            <Button asChild className="mt-4">
              <Link to="/teacher/courses">Manage courses</Link>
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
                      {day.events.length} {day.events.length === 1 ? 'session' : 'sessions'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {day.events.map((event) => (
                    <TeacherSessionRow
                      key={event.key}
                      event={event}
                      onEditUrl={() => openUrlEditor(event)}
                    />
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!editSession} onOpenChange={(open) => { if (!open) setEditSession(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set join link</DialogTitle>
            <DialogDescription>
              Paste the meeting URL (Zoom, Google Meet, Teams, etc.). This applies to the entire
              section — every weekly occurrence will use the same link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="join-url">Meeting URL</Label>
            <Input
              id="join-url"
              value={newJoinUrl}
              onChange={(e) => setNewJoinUrl(e.target.value)}
              placeholder="https://meet.google.com/abc-defg-hij"
              autoComplete="off"
            />
            {editSession && (
              <p className="text-xs text-muted-foreground">
                {editSession.courseTitle} — {editSession.sectionName}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSession(null)} disabled={savingUrl}>
              Cancel
            </Button>
            <Button onClick={saveJoinUrl} disabled={savingUrl}>
              {savingUrl ? 'Saving…' : 'Save link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function TeacherSessionRow({
  event,
  onEditUrl,
}: {
  event: WeeklySessionEvent
  onEditUrl: () => void
}) {
  const badgeClass = event.badge ? BADGE_STYLES[event.badge] : ''
  const badgeLabel =
    event.badge === 'live'
      ? 'Live now'
      : event.badge === 'soon'
      ? 'Starting soon'
      : event.badge === 'today'
      ? 'Later today'
      : null

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm truncate">{event.courseTitle}</span>
          {badgeLabel && (
            <Badge className={`${badgeClass} border text-xs px-2 py-0.5`}>
              {event.badge === 'live' && <Radio className="mr-1 h-3 w-3 animate-pulse" />}
              {badgeLabel}
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
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
          <>
            <Button size="sm" variant="outline" onClick={onEditUrl} title="Edit link">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={event.badge === 'live' ? 'default' : 'outline'}
              asChild
            >
              <a href={event.joinUrl} target="_blank" rel="noopener noreferrer">
                {event.badge === 'live' ? (
                  <>
                    <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Start
                  </>
                ) : (
                  <>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open
                  </>
                )}
              </a>
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={onEditUrl}>
            <LinkIcon className="mr-1.5 h-3.5 w-3.5" /> Add link
          </Button>
        )}
      </div>
    </div>
  )
}

