import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import { Users, MessageSquare, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { analyticsService, type StudentAnalytics } from '../../services/analyticsService'
import { toast } from 'sonner'

export function TeacherAtRiskStudentsPage() {
  const [atRiskStudents, setAtRiskStudents] = useState<StudentAnalytics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const instructorAnalytics = await analyticsService.getMyInstructorAnalytics()
        const allAtRisk: StudentAnalytics[] = []
        for (const course of instructorAnalytics.courseAnalytics || []) {
          for (const student of course.atRiskStudents || []) {
            if (!allAtRisk.some(s => s.userId === student.userId)) {
              allAtRisk.push(student)
            }
          }
        }
        allAtRisk.sort((a, b) => b.riskScore - a.riskScore)
        setAtRiskStudents(allAtRisk)
      } catch (error) {
        console.error('Failed to load at-risk students:', error)
        toast.error('Failed to load at-risk students')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">At-Risk Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">Students who may need additional support</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/teacher/students">
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to Students
          </Link>
        </Button>
      </div>

      {/* At-Risk Students - full list */}
      <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-lg">At-Risk Students</CardTitle>
          </div>
          <CardDescription className="text-xs mt-0.5">
            Students who may need additional support
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : atRiskStudents.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm">No at-risk students identified</p>
              <p className="text-xs mt-1">All your students are on track</p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link to="/teacher/students">Back to Students</Link>
              </Button>
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto scroll-fancy space-y-2 pr-1">
              {atRiskStudents.map((student) => (
                <AtRiskStudentCard key={student.userId} student={student} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function AtRiskStudentCard({ student }: { student: StudentAnalytics }) {
  const riskCount = student.riskFactors?.length ?? 0
  return (
    <div className="rounded-lg border border-border/50 bg-background/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm">{student.studentName}</div>
            <Badge variant="secondary" className="text-xs">
              {riskCount} Risk
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{student.email}</div>
          {student.riskFactors && student.riskFactors.length > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              {student.riskFactors.join(' • ')}
            </div>
          )}
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium">{Math.round(student.completionRate ?? 0)}%</span>
              </div>
              <Progress value={student.completionRate ?? 0} className="h-1.5" />
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
    </div>
  )
}
