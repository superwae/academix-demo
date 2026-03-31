import { useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow, isValid } from 'date-fns'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { enrollmentService } from '../../services/enrollmentService'
import { assignmentService } from '../../services/assignmentService'
import { courseService, type CourseDto } from '../../services/courseService'
import { dayStringToJsWeekday, getLiveSessionBadge, type MeetingMeta } from '../../lib/liveSession'
import { examService } from '../../services/examService'
import { recommendationService } from '../../services/recommendationService'
import { Clock, BookOpen, Mail, Calendar, FileText, GraduationCap, Sparkles, TrendingUp, Award, PlayCircle, ArrowRight, Star, Video } from 'lucide-react'
import { progressService } from '../../services/progressService'
import { Progress } from '../../components/ui/progress'

// Helper function to safely parse dates
function safeDate(dateValue: string | null | undefined): Date | null {
  if (!dateValue) return null
  const date = new Date(dateValue)
  return isValid(date) ? date : null
}

function useFakeLoad() {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const ms = 600 + Math.floor(Math.random() * 300)
    const t = window.setTimeout(() => setLoading(false), ms)
    return () => window.clearTimeout(t)
  }, [])
  return loading
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
  },
}

export function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([])
  const [learningStats, setLearningStats] = useState<{
    totalLessonsCompleted: number;
    totalStudyTime: number;
    coursesInProgress: number;
    continueWatching: any | null;
  }>({
    totalLessonsCompleted: 0,
    totalStudyTime: 0,
    coursesInProgress: 0,
    continueWatching: null,
  })

  const [recommendations, setRecommendations] = useState<CourseDto[]>([])
  const [trendingCourses, setTrendingCourses] = useState<CourseDto[]>([])
  /** Course details keyed by id — used for section join URLs (live lesson links from teacher) */
  const [coursesById, setCoursesById] = useState<Map<string, CourseDto>>(new Map())
  const [dashboardTick, setDashboardTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setDashboardTick((t) => t + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const todayLiveSlots = useMemo(() => {
    void dashboardTick
    const now = new Date()
    const dow = now.getDay()
    const rows: {
      key: string
      courseTitle: string
      sectionName: string
      timeLabel: string
      joinUrl?: string
      courseId: string
      meta: MeetingMeta
    }[] = []

    const fmtRange = (startMinutes: number, endMinutes: number, startTime?: string, endTime?: string) => {
      if (startTime && endTime) return `${startTime} – ${endTime}`
      const f = (m: number) => {
        const h = Math.floor(m / 60)
        const min = m % 60
        const ap = h >= 12 ? 'PM' : 'AM'
        const h12 = h % 12 || 12
        return min ? `${h12}:${min.toString().padStart(2, '0')} ${ap}` : `${h12} ${ap}`
      }
      return `${f(startMinutes)} – ${f(endMinutes)}`
    }

    for (const e of enrollments) {
      const course = coursesById.get(e.courseId)
      const sec = course?.sections.find((s) => s.id === e.sectionId)
      if (!sec?.meetingTimes?.length) continue
      for (const mt of sec.meetingTimes) {
        if (dayStringToJsWeekday(mt.day) !== dow) continue
        rows.push({
          key: `${e.id}-${mt.day}-${mt.startMinutes}`,
          courseTitle: e.courseTitle,
          sectionName: e.sectionName,
          timeLabel: fmtRange(mt.startMinutes, mt.endMinutes, mt.startTime, mt.endTime),
          joinUrl: sec.joinUrl?.trim(),
          courseId: e.courseId,
          meta: { day: mt.day, startMinutes: mt.startMinutes, endMinutes: mt.endMinutes },
        })
      }
    }
    rows.sort((a, b) => a.meta.startMinutes - b.meta.startMinutes)
    return rows
  }, [enrollments, coursesById, dashboardTick])

  const loadData = async () => {
    try {
      setLoading(true)
      const [enrollmentsResult, assignmentsResult, examsResult, featuredResult] = await Promise.all([
        enrollmentService.getMyEnrollments({ pageSize: 10 }),
        assignmentService.getMyAssignments({ pageSize: 10 }),
        examService.getMyExams({ pageSize: 100 }).catch(() => ({ items: [] })), // Don't fail if exams fail to load
        courseService.getFeaturedCourses(),
      ])
      
      setEnrollments(enrollmentsResult.items)

      const uniqueCourseIds = Array.from(new Set(enrollmentsResult.items.map((e: { courseId: string }) => e.courseId)))
      const courseMap = new Map<string, CourseDto>()
      await Promise.all(
        uniqueCourseIds.map(async (courseId) => {
          try {
            const course = await courseService.getCourseById(courseId)
            courseMap.set(courseId, course)
          } catch {
            /* course row still shows without live link */
          }
        }),
      )
      setCoursesById(courseMap)
      setAssignments(assignmentsResult.items)
      setExams(examsResult.items || [])
      setFeaturedCourses(featuredResult.slice(0, 2))

      // Calculate learning stats - get progress for all enrolled courses
      const courseIds = new Set(enrollmentsResult.items.map((e: any) => e.courseId))
      const allProgressPromises = Array.from(courseIds).map(async (courseId: any) => {
        return await progressService.getCourseLessonsProgress(courseId as string)
      })
      const allProgressArrays = await Promise.all(allProgressPromises)
      const allProgress = allProgressArrays.flat()
      const completedLessons = allProgress.filter((p) => p.isCompleted)
      const totalStudyTime = allProgress.reduce((sum, p) => sum + p.watchedDuration, 0)
      
      // Get courses in progress - a course is in progress if:
      // 1. User has watched any lessons (watchedDuration > 0), OR
      // 2. User has completed some but not all lessons
      const coursesInProgress = []
      const courseIdsArray = Array.from(courseIds)
      for (let i = 0; i < courseIdsArray.length; i++) {
        const courseId = courseIdsArray[i]
        const courseProgress = await progressService.getCourseProgress(courseId as string, 0)
        const courseLessonsProgress = allProgressArrays[i] || []
        
        // Check if user has any progress (watched any lessons)
        const hasAnyProgress = courseLessonsProgress.some((p: any) => p.watchedDuration > 0)
        
        // Check if course is partially completed (some but not all lessons completed)
        const isPartiallyCompleted = courseProgress.completedLessons > 0 && 
                                     courseProgress.totalLessons > 0 &&
                                     courseProgress.completedLessons < courseProgress.totalLessons
        
        // A course is "in progress" if user has any progress OR is partially completed
        if (hasAnyProgress || isPartiallyCompleted) {
          coursesInProgress.push(courseId)
        }
      }

      // Get continue watching
      let continueWatching = null
      for (const enrollment of enrollmentsResult.items) {
        const cw = await progressService.getContinueWatching(enrollment.courseId)
        if (cw) {
          // Get course progress to show completion stats
          const courseProgress = await progressService.getCourseProgress(enrollment.courseId, 0)
          continueWatching = { 
            ...cw, 
            courseTitle: enrollment.courseTitle, 
            courseId: enrollment.courseId,
            completedLessons: courseProgress.completedLessons,
            totalLessons: courseProgress.totalLessons
          }
          break
        }
      }

      setLearningStats({
        totalLessonsCompleted: completedLessons.length,
        totalStudyTime: Math.floor(totalStudyTime / 60), // Convert to minutes
        coursesInProgress: coursesInProgress.length,
        continueWatching,
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // Listen for enrollment changes to refresh dashboard
    const handleEnrollmentChange = (event: Event) => {
      const customEvent = event as CustomEvent
      console.log('Enrollment changed, refreshing dashboard:', customEvent.detail)
      // Clear existing data first to prevent stale data from showing
      setEnrollments([])
      setAssignments([])
      setExams([])
      // Then reload fresh data
      loadData()
    }
    window.addEventListener('enrollmentChanged', handleEnrollmentChange)

    return () => {
      window.removeEventListener('enrollmentChanged', handleEnrollmentChange)
    }
  }, [])

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const [recResponse, trending] = await Promise.all([
          recommendationService.getRecommendations(4),
          recommendationService.getTrendingCourses(4),
        ])
        setRecommendations(recResponse.forYou || [])
        setTrendingCourses(trending || [])
      } catch (error) {
        console.error('[Dashboard] Recommendations fetch error:', error)
      }
    }
    fetchRecommendations()
  }, [])

  const pendingAssignments = useMemo(
    () => assignments.filter((a) => {
      if (!a.dueAt) return false
      const dueDate = safeDate(a.dueAt)
      if (!dueDate) return false
      const now = new Date()
      return now < dueDate
    }),
    [assignments],
  )
  
  const sortedPendingAssignments = useMemo(
    () =>
      [...pendingAssignments].sort((a, b) => {
        const dateA = safeDate(a.dueAt)?.getTime() ?? 0
        const dateB = safeDate(b.dueAt)?.getTime() ?? 0
        return dateA - dateB
      }),
    [pendingAssignments],
  )
  const nextAssignment = sortedPendingAssignments[0] ?? null

  // Dedupe by slot (same as exams page) and sort by start date (soonest first)
  const dashboardExams = useMemo(() => {
    if (!exams || exams.length === 0) return []
    const bySlot = new Map<string, (typeof exams)[0]>()
    for (const e of exams) {
      if (!e?.id) continue
      const slot = `${e.courseId}|${e.title}|${e.startsAt}`
      if (!bySlot.has(slot)) bySlot.set(slot, e)
    }
    return Array.from(bySlot.values()).sort((a, b) => {
      const dateA = safeDate(a.startsAt)?.getTime() ?? 0
      const dateB = safeDate(b.startsAt)?.getTime() ?? 0
      return dateA - dateB
    })
  }, [exams])

  return (
    <motion.div
      variants={containerVariants}
      initial="visible"
      animate="visible"
      transition={{ staggerChildren: 0.1 }}
      className="space-y-2"
    >
      {/* Header */}
      <motion.div variants={itemVariants} transition={{ duration: 0.4, ease: 'easeOut' }} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text md:text-4xl">Dashboard</h1>
          <p className="mt-1.5 text-muted-foreground">Your week at a glance</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 shadow-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium tabular-nums">{format(new Date(), 'EEEE, MMM d, yyyy')}</span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} transition={{ duration: 0.4, ease: 'easeOut' }} className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Enrolled Classes"
          value={enrollments.length}
          icon={GraduationCap}
          color="primary"
          loading={loading}
          delay={0}
        />
        <StatCard
          title="Lessons Completed"
          value={learningStats.totalLessonsCompleted}
          icon={Award}
          color="primary"
          loading={loading}
          delay={0.1}
        />
        <StatCard
          title="Study Time"
          value={learningStats.totalStudyTime}
          icon={Clock}
          color="primary"
          loading={loading}
          delay={0.2}
          suffix=" min"
        />
        <StatCard
          title="Courses In Progress"
          value={learningStats.coursesInProgress}
          icon={TrendingUp}
          color="primary"
          loading={loading}
          delay={0.3}
        />
      </motion.div>

      {/* Continue Watching */}
      {learningStats.continueWatching && (
        <motion.div variants={itemVariants} transition={{ duration: 0.4, ease: 'easeOut' }}>
          <Card className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-sm">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/15 p-1.5">
                  <PlayCircle className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-lg">Continue Watching</CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">Pick up where you left off</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-3">
                {/* Progress Info */}
                {learningStats.continueWatching.totalLessons > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {learningStats.continueWatching.completedLessons || 0} of {learningStats.continueWatching.totalLessons} lessons completed
                  </div>
                )}
                
                {/* Course Title and Button */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{learningStats.continueWatching.courseTitle}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {(() => {
                        const lastWatchedDate = safeDate(learningStats.continueWatching.lastWatchedAt)
                        if (lastWatchedDate) {
                          return `Last watched ${formatDistanceToNow(lastWatchedDate, { addSuffix: true })}`
                        }
                        return 'Continue watching'
                      })()}
                    </div>
                  </div>
                  <Button asChild className="shrink-0">
                    <Link to={`/student/my-classes/${learningStats.continueWatching.courseId}/lessons/${learningStats.continueWatching.lessonId}`}>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Continue Watching
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Content Grid - fixed height with scroll (static, like Exams & Quizzes) */}
      <div className="grid gap-2 lg:grid-cols-3">
        {/* Today's Schedule - same scroll behavior as Exams & Quizzes */}
        <motion.div variants={itemVariants} transition={{ duration: 0.4, ease: 'easeOut' }} className="lg:col-span-2 flex min-h-0">
          <Card
            data-dashboard-tick={dashboardTick}
            className="flex flex-1 flex-col rounded-2xl border border-border/80 shadow-sm transition-shadow hover:shadow-md min-h-0 max-h-[280px]"
          >
            <CardHeader className="shrink-0 px-4 pt-3 pb-1.5">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-lg">Today's Schedule</CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Today&apos;s live sessions only — full week in Calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 pt-1.5 pb-4 scroll-fancy">
              {loading ? (
                <div className="space-y-2">
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : enrollments.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No enrolled classes yet"
                  body="Browse the catalog and enroll to see your schedule here."
                />
              ) : todayLiveSlots.length === 0 ? (
                <div className="space-y-3 pr-0.5">
                  <p className="text-sm text-muted-foreground">
                    No live sessions scheduled for today. Open{' '}
                    <Link to="/student/calendar" className="text-primary font-medium underline-offset-2 hover:underline">
                      Calendar
                    </Link>{' '}
                    for your full week.
                  </p>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                    <Link to="/student/calendar">View weekly calendar</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 pr-0.5">
                  {todayLiveSlots.map((slot) => {
                    const badge = getLiveSessionBadge(slot.meta, new Date())
                    return (
                      <div
                        key={slot.key}
                        className={`rounded-xl border px-3 py-2 transition-colors ${
                          badge === 'live'
                            ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border/60 bg-muted/30 hover:bg-muted/50 hover:border-primary/20'
                        }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm">{slot.courseTitle}</span>
                              {badge === 'live' && (
                                <Badge className="text-[10px] h-5 bg-red-600 hover:bg-red-600">Live now</Badge>
                              )}
                              {badge === 'soon' && (
                                <Badge variant="secondary" className="text-[10px] h-5">
                                  Starting soon
                                </Badge>
                              )}
                              {badge === 'today' && (
                                <Badge variant="outline" className="text-[10px] h-5 border-primary/40 text-primary">
                                  Today
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2">
                              <span>{slot.sectionName}</span>
                              <span className="text-foreground/80 font-medium tabular-nums">{slot.timeLabel}</span>
                            </div>
                          </div>
                          {slot.joinUrl ? (
                            <Button size="sm" className="shrink-0 gap-1.5 w-full sm:w-auto" asChild>
                              <a href={slot.joinUrl} target="_blank" rel="noopener noreferrer">
                                <Video className="h-3.5 w-3.5" />
                                Join
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Enroll - same fixed height for consistent row */}
        <motion.div variants={itemVariants} transition={{ duration: 0.4, ease: 'easeOut' }} className="flex min-h-0">
          <Card className="flex flex-1 flex-col rounded-2xl border border-border/80 shadow-sm transition-shadow hover:shadow-md min-h-0 max-h-[280px]">
            <CardHeader className="shrink-0 px-4 pt-3 pb-1.5">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-lg">Quick Enroll</CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">Featured courses to get you started</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 pt-1.5 pb-4 space-y-2 scroll-fancy">
              {loading ? (
                <div className="space-y-2">
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : featuredCourses.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="No featured courses"
                  body="Check back later for featured courses."
                />
              ) : (
                <div className="space-y-2 pr-0.5">
                  {featuredCourses.map((c, idx) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.08 }}
                      whileHover={{ y: -1 }}
                      className="group rounded-xl border border-border/60 bg-muted/20 p-3 transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm truncate group-hover:text-primary">{c.title}</h4>
                          <p className="mt-0.5 text-xs text-muted-foreground">{c.providerName}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-xs font-normal">{c.category}</Badge>
                            <Badge variant="outline" className="text-xs font-normal">{c.modality}</Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="default" className="shrink-0" asChild>
                          <Link to={`/courses/${c.id}`}>View</Link>
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Cards - compact with scroll */}
      <div className="grid gap-3 md:grid-cols-2">
        <motion.div variants={itemVariants} transition={{ duration: 0.4, ease: 'easeOut' }} className="flex min-h-0">
          <Card className="flex flex-1 flex-col rounded-2xl border border-border/80 shadow-sm transition-shadow hover:shadow-md min-h-0 max-h-[280px]">
            <CardHeader className="shrink-0 pb-1.5 pt-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-lg">Next Due Assignment</CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">Stay on track this week</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto pt-1.5 scroll-fancy">
              {loading ? (
                <SkeletonRow />
              ) : sortedPendingAssignments.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No assignments yet"
                  body="Once you enroll, assignments will appear here."
                />
              ) : (
                <div className="space-y-2 pr-0.5">
                  {sortedPendingAssignments.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent px-3 py-2.5 transition-colors hover:border-primary/30"
                    >
                      <div className="font-semibold text-sm truncate">{a.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground truncate">{a.courseTitle}</div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {(() => {
                        const d = safeDate(a.dueAt)
                        return d ? `Due ${format(d, 'MMM d, p')}` : 'Due date not set'
                      })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} transition={{ duration: 0.4, ease: 'easeOut' }} className="flex min-h-0">
          <Card className="flex flex-1 flex-col rounded-2xl border border-border/80 shadow-sm transition-shadow hover:shadow-md min-h-0 max-h-[280px]">
            <CardHeader className="shrink-0 pb-1.5 pt-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-1.5">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Exams & Quizzes</CardTitle>
                </div>
                {dashboardExams.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs shrink-0 text-primary hover:text-primary" asChild>
                    <Link to="/student/exams" className="flex items-center gap-1">
                      View all
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </div>
              <CardDescription className="text-xs mt-0.5">
                {dashboardExams.length > 0 ? 'Available and upcoming exams from your courses' : 'Practice mode available in the demo'}
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto pt-1.5 scroll-fancy">
              {loading ? (
                <SkeletonRow />
              ) : dashboardExams.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No exams yet"
                  body="You're all caught up. Enroll in courses to see exams and quizzes here."
                />
              ) : (
                <ul className="space-y-2 pr-0.5">
                  {dashboardExams.map((exam) => {
                    const startDate = safeDate(exam.startsAt)
                    const now = new Date()
                    const isUpcoming = startDate && startDate > now
                    const slotKey = `${exam.courseId}|${exam.title}|${exam.startsAt}`
                    return (
                      <li key={slotKey}>
                        <Link
                          to="/student/exams"
                          state={{ openExamId: exam.id }}
                          className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
                        >
                          <div className="rounded-lg bg-primary/10 p-1.5 shrink-0">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate">{exam.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{exam.courseTitle || 'Course'}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 shrink-0" />
                                {startDate
                                  ? isUpcoming
                                    ? `Starts ${format(startDate, 'MMM d, p')}`
                                    : `Started ${format(startDate, 'MMM d')}`
                                  : '—'}
                              </span>
                              {exam.durationMinutes != null && (
                                <span>{exam.durationMinutes} min</span>
                              )}
                              {exam.questionCount != null && (
                                <span>{exam.questionCount} question{exam.questionCount !== 1 ? 's' : ''}</span>
                              )}
                            </div>
                          </div>
                          <Badge variant={isUpcoming ? 'secondary' : 'default'} className="shrink-0 text-xs font-medium">
                            {isUpcoming ? 'Upcoming' : 'Available'}
                          </Badge>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recommended For You & Trending Now */}
      {(recommendations.length > 0 || trendingCourses.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="space-y-3"
        >
          {recommendations.length > 0 && (
            <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-1.5">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Recommended For You</CardTitle>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="text-primary">
                    <Link to="/student/catalog" className="flex items-center gap-1">
                      View All <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
                <CardDescription className="text-xs mt-0.5">Personalized course suggestions based on your interests</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {recommendations.map((course, idx) => (
                    <RecommendationCard key={course.id} course={course} delay={idx * 0.1} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {trendingCourses.length > 0 && (
            <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-1.5">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Trending Now</CardTitle>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="text-primary">
                    <Link to="/student/catalog" className="flex items-center gap-1">
                      View All <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
                <CardDescription className="text-xs mt-0.5">Popular courses based on recent enrollments</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {trendingCourses.map((course, idx) => (
                    <RecommendationCard key={course.id} course={course} delay={idx * 0.1} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color = 'primary',
  loading,
  delay = 0,
  suffix = '',
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color?: 'primary' | 'destructive'
  loading: boolean
  delay?: number
  suffix?: string
}) {
  const bgGradient = color === 'primary' 
    ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent'
    : 'bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent'
  const iconColor = color === 'primary' ? 'text-primary' : 'text-destructive'
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Card className="relative h-full overflow-hidden rounded-2xl border border-border/80 bg-card/50 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
        <div className={`absolute inset-0 ${bgGradient} opacity-40`} />
        <CardHeader className="relative pb-3 pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </CardDescription>
            <div className={`rounded-lg bg-primary/10 p-1.5 ${iconColor}`}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
          <CardTitle className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            {loading ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="inline-block h-9 w-20 rounded-lg bg-muted"
              />
            ) : (
              <motion.span
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="tabular-nums"
              >
                {value}{suffix}
              </motion.span>
            )}
          </CardTitle>
        </CardHeader>
      </Card>
    </motion.div>
  )
}

function SkeletonRow() {
  return (
    <div className="space-y-2">
      <div className="h-4 w-3/4 max-w-[180px] animate-pulse rounded-lg bg-muted" />
      <div className="h-3 w-1/2 max-w-[120px] animate-pulse rounded-lg bg-muted/80" style={{ animationDelay: '0.1s' }} />
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 py-6 px-4 text-center">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
      >
        <Icon className="mx-auto h-8 w-8 text-muted-foreground/40" />
      </motion.div>
      <div className="mt-2 font-medium text-sm text-foreground/90">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground max-w-[240px] mx-auto">{body}</div>
    </div>
  )
}

function RecommendationCard({ course, delay }: { course: CourseDto; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -2 }}
      className="h-full"
    >
      <Link to={`/courses/${course.id}`} className="block h-full">
        <Card className="h-full overflow-hidden rounded-xl border border-border/70 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 cursor-pointer group">
          <div className="relative h-28 w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-primary/15 to-primary/5">
            {course.thumbnailUrl ? (
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-10 w-10 text-primary/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
          </div>
          <CardContent className="p-3 space-y-1.5">
            <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {course.title}
            </h4>
            <p className="text-xs text-muted-foreground truncate">{course.instructorName}</p>
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                <span className="text-xs font-medium tabular-nums">{course.rating?.toFixed(1) || 'N/A'}</span>
              </div>
              <Badge variant="secondary" className="text-xs font-normal">{course.level}</Badge>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

