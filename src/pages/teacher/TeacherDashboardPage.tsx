import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import {
  GraduationCap,
  Users,
  BookOpen,
  FileText,
  Star,
  Calendar,
  Clock,
  TrendingUp,
  PlusCircle,
  Video,
  FileCheck,
  MessageSquare,
  PlayCircle,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  ArrowRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { teacherService, type TeacherDashboardStats, type TodayClass, type RecentActivity } from '../../services/teacherService'
import { analyticsService, type StudentAnalytics } from '../../services/analyticsService'
import { toast } from 'sonner'

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

export function TeacherDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<TeacherDashboardStats>({
    totalCourses: 0,
    totalStudents: 0,
    activeClasses: 0,
    pendingSubmissions: 0,
    averageRating: 0,
  })
  const [todaysClasses, setTodaysClasses] = useState<TodayClass[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [atRiskStudents, setAtRiskStudents] = useState<StudentAnalytics[]>([])
  const [loadingAtRisk, setLoadingAtRisk] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        
        // Load all data in parallel
        const [statsData, classesData, activityData] = await Promise.all([
          teacherService.getDashboardStats().catch((error) => {
            console.error('Failed to load dashboard stats:', error)
            toast.error('Failed to load dashboard statistics')
            return {
              totalCourses: 0,
              totalStudents: 0,
              activeClasses: 0,
              pendingSubmissions: 0,
              averageRating: 0,
            } as TeacherDashboardStats
          }),
          teacherService.getTodaysClasses().catch((error) => {
            console.error('Failed to load today\'s classes:', error)
            return [] as TodayClass[]
          }),
          teacherService.getRecentActivity(10).catch((error) => {
            console.error('Failed to load recent activity:', error)
            return [] as RecentActivity[]
          }),
        ])

        setStats(statsData)
        setTodaysClasses(classesData)
        setRecentActivity(activityData)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  // Fetch at-risk students from instructor analytics
  useEffect(() => {
    const loadAtRiskStudents = async () => {
      try {
        setLoadingAtRisk(true)
        const instructorAnalytics = await analyticsService.getMyInstructorAnalytics()
        // Collect all at-risk students from all courses
        const allAtRisk: StudentAnalytics[] = []
        for (const course of instructorAnalytics.courseAnalytics || []) {
          for (const student of course.atRiskStudents || []) {
            // Avoid duplicates
            if (!allAtRisk.some(s => s.userId === student.userId)) {
              allAtRisk.push(student)
            }
          }
        }
        // Sort by risk score descending (highest risk first)
        allAtRisk.sort((a, b) => b.riskScore - a.riskScore)
        setAtRiskStudents(allAtRisk.slice(0, 5)) // Show top 5
      } catch (error) {
        console.error('Failed to load at-risk students:', error)
        // Silently fail - at-risk data is supplementary
      } finally {
        setLoadingAtRisk(false)
      }
    }

    loadAtRiskStudents()
  }, [])

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Teacher Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Overview of your courses and students</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-1.5 backdrop-blur-sm">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{format(new Date(), 'EEEE, MMM d, yyyy')}</span>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Courses"
          value={stats.totalCourses}
          icon={BookOpen}
          color="primary"
          loading={loading}
          delay={0}
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          color="primary"
          loading={loading}
          delay={0.1}
        />
        <StatCard
          title="Active Classes"
          value={stats.activeClasses}
          icon={GraduationCap}
          color="primary"
          loading={loading}
          delay={0.2}
        />
        <StatCard
          title="Pending Submissions"
          value={stats.pendingSubmissions}
          icon={FileText}
          color="primary"
          loading={loading}
          delay={0.3}
        />
        <StatCard
          title="Avg. Rating"
          value={stats.averageRating}
          icon={Star}
          color="primary"
          loading={loading}
          delay={0.4}
          suffix="/ 5.0"
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Today's Classes */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">Today's Classes</CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">Your scheduled classes for today</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              {loading ? (
                <div className="space-y-1.5">
                  <SkeletonRow />
                  <SkeletonRow />
                </div>
              ) : todaysClasses.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No classes today"
                  body="You have no scheduled classes for today."
                />
              ) : (
                <div className="max-h-[320px] overflow-y-auto scroll-fancy space-y-1.5 pr-1">
                  {todaysClasses.map((classItem) => (
                    <div key={classItem.id} className="rounded-lg border border-border/50 bg-muted/20 p-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{classItem.courseName}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {classItem.startTime} - {classItem.endTime}
                            </span>
                            <Badge variant="subtle" className="text-xs">
                              {classItem.modality}
                            </Badge>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="gradient" 
                          asChild={!!classItem.joinUrl}
                          onClick={!classItem.joinUrl ? () => toast.info('Join URL not available') : undefined}
                        >
                          {classItem.joinUrl ? (
                            <a href={classItem.joinUrl} target="_blank" rel="noopener noreferrer">
                              <PlayCircle className="h-3 w-3 mr-1" />
                              Start Session
                            </a>
                          ) : (
                            <span>
                              <PlayCircle className="h-3 w-3 mr-1" />
                              Start Session
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link to="/teacher/create-course">
                  <PlusCircle className="h-4 w-4" />
                  Create New Course
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link to="/teacher/lessons">
                  <Video className="h-4 w-4" />
                  Add Lesson
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link to="/teacher/assignments">
                  <FileText className="h-4 w-4" />
                  Create Assignment
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link to="/teacher/exams">
                  <FileCheck className="h-4 w-4" />
                  Schedule Exam
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </div>
            <CardDescription className="text-xs mt-0.5">Latest updates and notifications</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <div className="space-y-1.5">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : recentActivity.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No recent activity"
                body="Activity will appear here as it happens."
              />
            ) : (
              <div className="max-h-[280px] overflow-y-auto scroll-fancy space-y-1.5 pr-1">
                {recentActivity.map((activity) => {
                  // Map activity type to icon
                  const getIcon = () => {
                    switch (activity.type) {
                      case 'enrollment':
                        return Users
                      case 'submission':
                        return FileCheck
                      case 'message':
                        return MessageSquare
                      default:
                        return TrendingUp
                    }
                  }
                  const Icon = getIcon()
                  
                  return (
                    <div key={activity.id} className="rounded-lg border border-border/50 bg-muted/20 p-2">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">{activity.message}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{activity.time}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* At-Risk Students */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <CardTitle className="text-lg">At-Risk Students</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/teacher/at-risk-students">
                  View All <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
            <CardDescription className="text-xs mt-0.5">Students who may need additional support</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {loadingAtRisk ? (
              <div className="space-y-1.5">
                <SkeletonRow />
                <SkeletonRow />
              </div>
            ) : atRiskStudents.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No at-risk students"
                body="All your students are on track!"
              />
            ) : (
              <div className="max-h-[320px] overflow-y-auto scroll-fancy space-y-2 pr-1">
                {atRiskStudents.map((student) => (
                  <AtRiskStudentCard key={student.userId} student={student} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

function AtRiskStudentCard({ student }: { student: StudentAnalytics }) {
  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'destructive'
      case 'High':
        return 'destructive'
      case 'Medium':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'text-red-500'
      case 'High':
        return 'text-orange-500'
      case 'Medium':
        return 'text-yellow-500'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
      className="rounded-lg border border-border/50 bg-background/50 p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm">{student.studentName}</div>
            <Badge variant={getRiskBadgeVariant(student.riskLevel)} className="text-xs">
              {student.riskLevel} Risk
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{student.email}</div>

          {/* Risk Factors */}
          {student.riskFactors.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {student.riskFactors.slice(0, 2).map((factor, idx) => (
                <span key={idx} className={`text-xs ${getRiskColor(student.riskLevel)}`}>
                  {factor}{idx < Math.min(student.riskFactors.length, 2) - 1 ? ' • ' : ''}
                </span>
              ))}
            </div>
          )}

          {/* Progress & Activity */}
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium">{Math.round(student.completionRate)}%</span>
              </div>
              <Progress value={student.completionRate} className="h-1.5" />
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Last active: </span>
              <span className="font-medium">
                {student.lastActivityAt
                  ? formatDistanceToNow(new Date(student.lastActivityAt), { addSuffix: true })
                  : 'Never'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/teacher/students/${student.userId}`}>
              <Users className="h-3 w-3 mr-1" />
              View
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/teacher/messages?student=${student.userId}`}>
              <MessageSquare className="h-3 w-3 mr-1" />
              Message
            </Link>
          </Button>
        </div>
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
  suffix = '',
}: {
  title: string
  value: number | string
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
      whileHover={{ scale: 1.03, y: -4 }}
    >
      <Card className="relative overflow-hidden border-2 border-border/60 transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
        <div className={`absolute inset-0 ${bgGradient} opacity-50`} />
        <CardHeader className="relative pb-2 pt-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </CardDescription>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Icon className={`h-4 w-4 ${iconColor} opacity-80`} />
            </motion.div>
          </div>
          <CardTitle className="mt-1.5 text-2xl font-bold">
            {loading ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="inline-block h-8 w-16 rounded bg-muted"
              />
            ) : (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
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
      <div className="h-4 w-3/4 animate-pulse rounded bg-gradient-to-r from-muted via-muted/50 to-muted" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-gradient-to-r from-muted via-muted/50 to-muted" style={{ animationDelay: '0.1s' }} />
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
    <div className="rounded-xl border-2 border-dashed border-border/50 bg-muted/30 p-3 text-center">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Icon className="mx-auto h-6 w-6 text-muted-foreground/50 mb-1.5" />
      </motion.div>
      <div className="font-semibold text-xs">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{body}</div>
    </div>
  )
}

