import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Progress } from '../../components/ui/progress'
import { 
  Users, 
  MessageSquare, 
  ArrowLeft,
  Search,
  Mail,
  Loader2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { courseService, type CourseDto } from '../../services/courseService'
import { teacherService } from '../../services/teacherService'

interface Enrollment {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  enrolledAt: string
  progress: number
  status: 'Active' | 'Completed' | 'Dropped'
}

export function CourseStudentsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<CourseDto | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        toast.error('Course ID is required')
        navigate('/teacher/courses')
        return
      }

      try {
        setLoading(true)
        const courseData = await courseService.getCourseById(id)
        setCourse(courseData)

        // Load enrollments for this course
        const enrollmentsResult = await teacherService.getCourseEnrollments(id, { pageSize: 100 })
        const enrollmentData: Enrollment[] = enrollmentsResult.items.map((enrollment) => ({
          id: enrollment.id,
          studentId: enrollment.userId,
          studentName: enrollment.userName || 'Unknown',
          studentEmail: enrollment.userEmail || '',
          enrolledAt: enrollment.enrolledAt,
          progress: enrollment.progressPercentage ?? 0,
          status: (enrollment.status as Enrollment['status']) || 'Active',
        }))
        setEnrollments(enrollmentData)
      } catch (error) {
        toast.error('Failed to load course data', {
          description: error instanceof Error ? error.message : 'Please try again later',
        })
        navigate('/teacher/courses')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, navigate])

  const filteredEnrollments = enrollments.filter(
    (enrollment) =>
      enrollment.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enrollment.studentEmail.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Course not found</p>
        <Button onClick={() => navigate('/teacher/courses')} className="mt-4">
          Back to Courses
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/courses')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">Course Students</h1>
            <p className="mt-1 text-sm text-muted-foreground">{course.title}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{enrollments.length}</div>
                <div className="text-sm text-muted-foreground">Total Students</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {enrollments.filter((e) => e.status === 'Active').length}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {Math.round(
                    enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length || 0
                  )}
                  %
                </div>
                <div className="text-sm text-muted-foreground">Avg. Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Students</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {filteredEnrollments.length} student{filteredEnrollments.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {filteredEnrollments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No students found matching your search' : 'No students enrolled yet'}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto scroll-fancy">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">{enrollment.studentName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {enrollment.studentEmail}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress value={enrollment.progress} className="h-2" />
                        <span className="text-xs text-muted-foreground">{enrollment.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          enrollment.status === 'Active'
                            ? 'default'
                            : enrollment.status === 'Completed'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {enrollment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(enrollment.enrolledAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
