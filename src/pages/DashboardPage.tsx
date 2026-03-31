import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useAppStore } from '../store/useAppStore'
import { toast } from 'sonner'
import { Clock, BookOpen, Mail, Calendar, FileText, GraduationCap, Sparkles, TrendingUp, Star, ArrowRight } from 'lucide-react'
import { recommendationService } from '../services/recommendationService'
import type { CourseDto } from '../services/courseService'

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
  const loading = useFakeLoad()
  const { courses, assignments, exams, messages, enrolled, messageRead } = useAppStore((s) => s.data)
  const enroll = useAppStore((s) => s.enroll)

  // Recommendations state
  const [recommendations, setRecommendations] = useState<CourseDto[]>([])
  const [trendingCourses, setTrendingCourses] = useState<CourseDto[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(true)

  // Fetch recommendations from backend
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoadingRecommendations(true)
        console.log('[Dashboard] Fetching recommendations...')
        const [recResponse, trending] = await Promise.all([
          recommendationService.getRecommendations(4),
          recommendationService.getTrendingCourses(4),
        ])
        console.log('[Dashboard] Recommendations response:', recResponse)
        console.log('[Dashboard] ForYou:', recResponse.forYou)
        console.log('[Dashboard] Trending:', trending)
        // Combine forYou recommendations
        setRecommendations(recResponse.forYou || [])
        setTrendingCourses(trending || [])
      } catch (error) {
        console.error('[Dashboard] Recommendations fetch error:', error)
        // Silently fail - recommendations are optional
      } finally {
        setLoadingRecommendations(false)
      }
    }

    fetchRecommendations()
  }, [])

  const featured = useMemo(() => courses.filter((c) => c.featured).slice(0, 2), [courses])
  const unreadCount = useMemo(
    () => messages.filter((m) => !messageRead[m.id]).length,
    [messages, messageRead],
  )
  const pendingAssignments = useMemo(
    () => assignments.filter((a) => a.status !== 'Submitted' && a.status !== 'Graded'),
    [assignments],
  )
  const nextExam = useMemo(() => {
    const sorted = [...exams].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
    return sorted[0]
  }, [exams])

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.1 }}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} transition={{ duration: 0.4, ease: 'easeOut' }} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight gradient-text">Dashboard</h1>
          <p className="mt-2 text-lg text-muted-foreground">Your week at a glance</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-4 py-2 backdrop-blur-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{format(new Date(), 'EEEE, MMM d, yyyy')}</span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} transition={{ duration: 0.4, ease: 'easeOut' }} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Enrolled Classes"
          value={enrolled.length}
          icon={GraduationCap}
          color="primary"
          loading={loading}
          delay={0}
        />
        <StatCard
          title="Pending Assignments"
          value={pendingAssignments.length}
          icon={FileText}
          color="destructive"
          loading={loading}
          delay={0.1}
        />
        <StatCard
          title="Upcoming Exams"
          value={exams.length}
          icon={Clock}
          color="primary"
          loading={loading}
          delay={0.2}
        />
        <StatCard
          title="Unread Messages"
          value={unreadCount}
          icon={Mail}
          color="primary"
          loading={loading}
          delay={0.3}
        />
      </motion.div>

      {/* Personalized Recommendations */}
      {(recommendations.length > 0 || trendingCourses.length > 0) && (
        <motion.div variants={itemVariants} transition={{ duration: 0.4, ease: 'easeOut' }} className="space-y-6">
          {/* For You Section */}
          {recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <CardTitle className="text-2xl">Recommended For You</CardTitle>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/catalog">
                      View All <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <CardDescription>Personalized course suggestions based on your interests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {recommendations.map((course, idx) => (
                    <RecommendationCard key={course.id} course={course} delay={idx * 0.1} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trending Section */}
          {trendingCourses.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle className="text-2xl">Trending Now</CardTitle>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/catalog">
                      View All <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <CardDescription>Popular courses based on recent enrollments</CardDescription>
              </CardHeader>
              <CardContent>
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

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <motion.div variants={itemVariants} transition={{ duration: 0.4, ease: 'easeOut' }} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl">Today's Schedule</CardTitle>
              </div>
              <CardDescription>Next up from your enrolled classes</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : enrolled.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No enrolled classes yet"
                  body="Browse the catalog and enroll to see your schedule here."
                />
              ) : (
                <div className="rounded-xl border-2 border-dashed border-border/50 bg-muted/30 p-8 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Schedule events appear in Calendar once you enroll.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Enroll */}
        <motion.div variants={itemVariants} transition={{ duration: 0.4, ease: 'easeOut' }}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl">Quick Enroll</CardTitle>
              </div>
              <CardDescription>Featured courses to get you started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {featured.map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="group rounded-xl border-2 border-border/50 bg-gradient-to-br from-background to-muted/20 p-4 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-base truncate">{c.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground font-medium">{c.providerName}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Badge variant="subtle" className="text-xs">{c.category}</Badge>
                        <Badge variant="subtle" className="text-xs">{c.modality}</Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="gradient"
                      className="shrink-0"
                      onClick={() => {
                        const firstSection = c.sections[0]
                        enroll(c.id, firstSection.id)
                        toast.success('Enrolled! 🎉', {
                          description: `${c.title} • ${firstSection.name}`,
                        })
                      }}
                    >
                      Enroll
                    </Button>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div variants={itemVariants} transition={{ duration: 0.4, ease: 'easeOut' }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl">Next Due Assignment</CardTitle>
              </div>
              <CardDescription>Stay on track this week</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonRow />
              ) : pendingAssignments.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No assignments yet"
                  body="Once you enroll, assignments will appear here."
                />
              ) : (
                <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-4">
                  <div className="font-bold text-lg">{pendingAssignments[0].title}</div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Due {format(new Date(pendingAssignments[0].dueAt), 'MMM d, p')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} transition={{ duration: 0.4, ease: 'easeOut' }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl">Upcoming Exam</CardTitle>
              </div>
              <CardDescription>Practice mode available in the demo</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonRow />
              ) : !nextExam ? (
                <EmptyState
                  icon={BookOpen}
                  title="No exams scheduled"
                  body="You're all caught up for now."
                />
              ) : (
                <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-4">
                  <div className="font-bold text-lg">{nextExam.title}</div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Starts {format(new Date(nextExam.startsAt), 'MMM d, p')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
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
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color?: 'primary' | 'destructive'
  loading: boolean
  delay?: number
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
      whileHover={{ scale: 1.03, y: -4 }}
    >
      <Card className="relative overflow-hidden border-2 border-border/60 transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
        <div className={`absolute inset-0 ${bgGradient} opacity-50`} />
        <CardHeader className="relative pb-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </CardDescription>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Icon className={`h-5 w-5 ${iconColor} opacity-80`} />
            </motion.div>
          </div>
          <CardTitle className="mt-4 text-4xl font-bold">
            {loading ? (
              <span className="inline-block h-10 w-16 animate-pulse rounded bg-muted" />
            ) : (
              value
            )}
          </CardTitle>
        </CardHeader>
      </Card>
    </motion.div>
  )
}

function SkeletonRow() {
  return (
    <div className="h-12 w-full animate-pulse rounded-xl bg-gradient-to-r from-muted via-muted/50 to-muted" />
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
    <div className="rounded-xl border-2 border-dashed border-border/50 bg-muted/30 p-8 text-center">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Icon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
      </motion.div>
      <div className="font-semibold text-base">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{body}</div>
    </div>
  )
}

function RecommendationCard({ course, delay }: { course: CourseDto; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.03, y: -4 }}
    >
      <Link to={`/courses/${course.id}`}>
        <Card className="h-full overflow-hidden border-2 border-border/60 transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 cursor-pointer group">
          {/* Course Image */}
          <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
            {course.thumbnailUrl ? (
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="h-10 w-10 text-primary/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          </div>
          <CardContent className="p-4 space-y-2">
            <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {course.title}
            </h4>
            <p className="text-xs text-muted-foreground">{course.instructorName}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-medium">{course.rating?.toFixed(1) || 'N/A'}</span>
              </div>
              <Badge variant="secondary" className="text-xs">{course.level}</Badge>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}
