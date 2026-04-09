import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import {
  User,
  Mail,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Clock,
  ArrowLeft,
  Activity,
  Loader2,
  Lightbulb,
  Award,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import { analyticsService, type StudentAnalytics, type RiskLevel } from '../../services/analyticsService'
import { userService, type UserDto } from '../../services/userService'

const RISK_BADGE_STYLES: Record<RiskLevel, { bg: string; text: string; label: string }> = {
  Low: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', label: 'Low Risk' },
  Medium: { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', label: 'Medium Risk' },
  High: { bg: 'bg-orange-500/10', text: 'text-orange-700 dark:text-orange-300', label: 'High Risk' },
  Critical: { bg: 'bg-red-500/10', text: 'text-red-700 dark:text-red-300', label: 'Critical Risk' },
}

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null)
  const [user, setUser] = useState<UserDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        setLoading(true)
        const [analyticsResult, userResult] = await Promise.allSettled([
          analyticsService.getStudentAnalytics(id),
          userService.getUserById(id),
        ])
        if (analyticsResult.status === 'fulfilled') setAnalytics(analyticsResult.value)
        if (userResult.status === 'fulfilled') setUser(userResult.value)
        if (analyticsResult.status === 'rejected' && userResult.status === 'rejected') {
          toast.error('Failed to load student profile')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  if (!analytics && !user) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h2 className="mt-4 text-xl font-semibold">Student not found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We couldn't find any data for this student.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const displayName = analytics?.studentName || user?.fullName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Student'
  const email = analytics?.email || user?.email
  const profilePictureUrl = analytics?.profilePictureUrl || user?.profilePictureUrl
  const riskBadge = analytics ? RISK_BADGE_STYLES[analytics.riskLevel] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pb-12"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to students
        </Button>
      </div>

      {/* Profile header card */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-3xl font-bold text-primary-foreground shadow-lg">
            {profilePictureUrl ? (
              <img src={profilePictureUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{displayName[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
            {email && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{email}</span>
              </div>
            )}
            {user?.bio && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
            )}
          </div>
          {riskBadge && (
            <Badge className={`${riskBadge.bg} ${riskBadge.text} border-0 px-3 py-1.5 text-sm font-semibold`}>
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
              {riskBadge.label}
            </Badge>
          )}
        </CardContent>
      </Card>

      {analytics ? (
        <>
          {/* Stats grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
              label="Engagement"
              value={`${Math.round(analytics.engagementScore)}%`}
              hint={analytics.engagementLevel}
            />
            <StatCard
              icon={<GraduationCap className="h-5 w-5 text-emerald-500" />}
              label="Average Grade"
              value={`${analytics.averageGrade.toFixed(1)}%`}
              hint={`Predicted final: ${analytics.predictedFinalGrade.toFixed(1)}%`}
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5 text-violet-500" />}
              label="Completion Rate"
              value={`${Math.round(analytics.completionRate)}%`}
              hint={`${analytics.completedCourses} of ${analytics.totalEnrollments} courses`}
            />
            <StatCard
              icon={<Activity className="h-5 w-5 text-amber-500" />}
              label="Last Activity"
              value={
                analytics.lastActivityAt
                  ? formatDistanceToNow(new Date(analytics.lastActivityAt), { addSuffix: true })
                  : 'Never'
              }
              hint={`${analytics.daysSinceLastActivity} days ago`}
            />
          </div>

          {/* Risk score detail */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Risk Assessment
              </CardTitle>
              <CardDescription>How this student's risk score is calculated</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Risk Score</span>
                  <span className="font-mono">{analytics.riskScore.toFixed(0)} / 100</span>
                </div>
                <Progress value={analytics.riskScore} className="h-2" />
              </div>

              {analytics.riskFactors.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Risk Factors</h4>
                  <ul className="space-y-1.5">
                    {analytics.riskFactors.map((factor, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity breakdown */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{analytics.totalLessonsWatched}</div>
                    <div className="text-xs text-muted-foreground">Lessons watched</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8 text-emerald-500" />
                  <div>
                    <div className="text-2xl font-bold">{analytics.totalAssignmentsSubmitted}</div>
                    <div className="text-xs text-muted-foreground">Assignments submitted</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-violet-500" />
                  <div>
                    <div className="text-2xl font-bold">{analytics.totalExamsTaken}</div>
                    <div className="text-xs text-muted-foreground">Exams taken</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {analytics.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Recommendations
                </CardTitle>
                <CardDescription>Suggested next steps to support this student</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analytics.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Analytics not available for this student yet.
          </CardContent>
        </Card>
      )}

      {user?.createdAt && (
        <p className="text-xs text-muted-foreground">
          Member since {format(new Date(user.createdAt), 'MMMM yyyy')}
        </p>
      )}
    </motion.div>
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
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">{icon}</div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="truncate text-lg font-bold">{value}</div>
            {hint && <div className="text-[10px] text-muted-foreground/80">{hint}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
