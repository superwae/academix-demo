import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import {
  SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import {
  User,
  Mail,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Clock,
  ArrowLeft,
  Activity,
  Loader2,
  Award,
  History,
  TrendingUp,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import {
  analyticsService,
  type StudentInstructorCourses,
  type StudentCourseStats,
} from '../../services/analyticsService'

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<StudentInstructorCourses | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        setLoading(true)
        const result = await analyticsService.getStudentInstructorCourses(id)
        setData(result)
        if (result.activeCourses.length > 0) {
          setSelectedCourseId(result.activeCourses[0].courseId)
        }
      } catch (error) {
        toast.error('Failed to load student profile', {
          description: error instanceof Error ? error.message : undefined,
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const selectedCourse = useMemo(
    () => data?.activeCourses.find((c) => c.courseId === selectedCourseId),
    [data, selectedCourseId],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h2 className="mt-4 text-xl font-semibold">Student not found</h2>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasAnyCourses = data.activeCourses.length > 0 || data.completedCourses.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-12"
    >
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to students
      </Button>

      {/* Profile header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-3xl font-bold text-primary-foreground shadow-lg">
            {data.profilePictureUrl ? (
              <img src={data.profilePictureUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{data.studentName?.[0]?.toUpperCase() ?? '?'}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{data.studentName}</h1>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate">{data.email}</span>
            </div>
            {data.bio && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{data.bio}</p>
            )}
          </div>
          <div className="flex gap-2">
            {data.activeCourses.length > 0 && (
              <Badge variant="secondary" className="px-3 py-1.5">
                <Activity className="mr-1.5 h-3.5 w-3.5" />
                {data.activeCourses.length} active
              </Badge>
            )}
            {data.completedCourses.length > 0 && (
              <Badge variant="secondary" className="px-3 py-1.5">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                {data.completedCourses.length} completed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {!hasAnyCourses && (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            This student is not enrolled in any of your courses.
          </CardContent>
        </Card>
      )}

      {/* Active courses section */}
      {data.activeCourses.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Current Course
              </CardTitle>
              <CardDescription>Stats for this student in your active courses</CardDescription>
            </div>
            {data.activeCourses.length > 1 && (
              <SelectRoot value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {data.activeCourses.map((c) => (
                    <SelectItem key={c.courseId} value={c.courseId}>
                      {c.courseTitle} — {c.sectionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            )}
          </CardHeader>
          <CardContent>
            {selectedCourse && <CourseStatsView stats={selectedCourse} />}
          </CardContent>
        </Card>
      )}

      {/* Past completed courses section — only visible if there are any */}
      {data.completedCourses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-emerald-500" />
              Completed with you
            </CardTitle>
            <CardDescription>
              Courses this student finished with you previously
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {data.completedCourses.map((c) => (
                <CompletedCourseCard key={c.enrollmentId} stats={c} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

function CourseStatsView({ stats }: { stats: StudentCourseStats }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{stats.courseTitle}</span>
          <span className="text-muted-foreground">{stats.sectionName}</span>
        </div>
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Course progress</span>
            <span className="font-mono font-semibold">{Math.round(stats.progressPercentage)}%</span>
          </div>
          <Progress value={stats.progressPercentage} className="h-2" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-blue-500" />}
          label="Lessons"
          value={`${stats.lessonsCompleted}/${stats.totalLessons || 0}`}
          hint={
            stats.totalLessons
              ? `${Math.round((stats.lessonsCompleted / stats.totalLessons) * 100)}% complete`
              : 'No lessons yet'
          }
        />
        <StatCard
          icon={<Award className="h-5 w-5 text-emerald-500" />}
          label="Assignments"
          value={`${stats.assignmentsSubmitted}/${stats.totalAssignments || 0}`}
          hint={
            stats.averageAssignmentScore != null
              ? `Avg score: ${stats.averageAssignmentScore.toFixed(1)}`
              : 'Not graded yet'
          }
        />
        <StatCard
          icon={<GraduationCap className="h-5 w-5 text-violet-500" />}
          label="Exams"
          value={`${stats.examsTaken}/${stats.totalExams || 0}`}
          hint={
            stats.averageExamScore != null
              ? `Avg score: ${stats.averageExamScore.toFixed(1)}%`
              : 'Not taken yet'
          }
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-amber-500" />}
          label="Overall Grade"
          value={stats.overallGrade != null ? `${stats.overallGrade.toFixed(1)}%` : '—'}
          hint="Combined assignments + exams"
        />
      </div>

      {/* Activity */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Enrolled: {format(new Date(stats.enrolledAt), 'MMM d, yyyy')}
        </span>
        {stats.lastActivityAt && (
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Last active{' '}
            {formatDistanceToNow(new Date(stats.lastActivityAt), { addSuffix: true })}
          </span>
        )}
        <Badge variant="outline" className="ml-auto">
          {stats.status}
        </Badge>
      </div>
    </div>
  )
}

function CompletedCourseCard({ stats }: { stats: StudentCourseStats }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:border-emerald-500/30 hover:bg-muted/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm leading-snug truncate">{stats.courseTitle}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{stats.sectionName}</p>
        </div>
        <Badge className="shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-0">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground">Final grade</div>
          <div className="font-semibold text-base">
            {stats.overallGrade != null ? `${stats.overallGrade.toFixed(1)}%` : '—'}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Completion</div>
          <div className="font-semibold text-base">{Math.round(stats.progressPercentage)}%</div>
        </div>
        <div>
          <div className="text-muted-foreground">Assignments</div>
          <div className="font-medium">
            {stats.assignmentsSubmitted}/{stats.totalAssignments}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Exams</div>
          <div className="font-medium">
            {stats.examsTaken}/{stats.totalExams}
          </div>
        </div>
      </div>
      {stats.completedAt && (
        <div className="mt-3 text-[11px] text-muted-foreground">
          Finished {format(new Date(stats.completedAt), 'MMM d, yyyy')}
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">{icon}</div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="truncate text-lg font-bold">{value}</div>
          {hint && <div className="text-[10px] text-muted-foreground/80">{hint}</div>}
        </div>
      </div>
    </div>
  )
}
