import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../components/ui/accordion'
import { FileText, PlusCircle, Eye, Edit, Clock, Loader2, MoreHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { examService, type ExamDto } from '../../services/examService'
import { teacherService } from '../../services/teacherService'
import type { CourseDto } from '../../services/courseService'

function examStatus(startsAt: string, isActive: boolean): 'Scheduled' | 'Active' | 'Completed' {
  const now = Date.now()
  const start = new Date(startsAt).getTime()
  if (start > now) return 'Scheduled'
  return isActive ? 'Active' : 'Completed'
}

export function TeacherExamsPage() {
  const [courses, setCourses] = useState<CourseDto[]>([])
  const [examsByCourseId, setExamsByCourseId] = useState<Map<string, ExamDto[]>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadExams = async () => {
      try {
        setLoading(true)
        const coursesResult = await teacherService.getMyCourses({ pageSize: 500 })
        setCourses(coursesResult.items)
        const map = new Map<string, ExamDto[]>()
        await Promise.all(
          coursesResult.items.map(async (course) => {
            try {
              const result = await examService.getCourseExams(course.id, { pageSize: 500 })
              map.set(course.id, result.items)
            } catch {
              map.set(course.id, [])
            }
          })
        )
        setExamsByCourseId(map)
      } catch (error) {
        toast.error('Failed to load exams', {
          description: error instanceof Error ? error.message : 'Please try again.',
        })
      } finally {
        setLoading(false)
      }
    }
    loadExams()
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
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Exams & Quizzes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Exams grouped by course</p>
        </div>
        <Button variant="gradient" asChild>
          <Link to="/teacher/exams/create">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Exam
          </Link>
        </Button>
      </div>

      {/* Courses with dropdown exams */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center items-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span className="text-sm">Loading courses...</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No courses yet</p>
              <p className="text-xs mt-1">Create a course first to add exams.</p>
            </div>
          ) : (
            <Accordion defaultOpen={[]}>
              {courses.map((course) => {
                const courseExams = examsByCourseId.get(course.id) ?? []
                return (
                  <AccordionItem key={course.id} id={course.id}>
                    <AccordionTrigger className="flex items-center gap-2">
                      <span className="font-medium">{course.title}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {courseExams.length} exam{courseExams.length !== 1 ? 's' : ''}
                      </Badge>
                    </AccordionTrigger>
                    <AccordionContent>
                      {courseExams.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          <p>No exams in this course yet.</p>
                          <Button variant="outline" size="sm" className="mt-2" asChild>
                            <Link to={`/teacher/exams/create?courseId=${course.id}`}>
                              <PlusCircle className="h-3 w-3 mr-1" />
                              Create exam
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto scroll-fancy">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Exam</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Questions</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <span>Actions</span>
                                    <Button variant="outline" size="sm" asChild>
                                      <Link to={`/teacher/exams/create?courseId=${course.id}`}>
                                        <PlusCircle className="h-3 w-3 mr-1" />
                                        Create Exam
                                      </Link>
                                    </Button>
                                  </div>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {courseExams.map((exam) => {
                                const status = examStatus(exam.startsAt, exam.isActive)
                                return (
                                  <TableRow key={exam.id}>
                                    <TableCell>
                                      <div className="font-medium text-sm">{exam.title}</div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1.5 text-sm">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        {format(new Date(exam.startsAt), 'MMM d, yyyy HH:mm')}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm">{exam.durationMinutes} min</div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm">{exam.questionCount} questions</div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={
                                          status === 'Active'
                                            ? 'default'
                                            : status === 'Completed'
                                              ? 'secondary'
                                              : 'outline'
                                        }
                                        className="text-xs"
                                      >
                                        {status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem asChild>
                                            <Link to={`/teacher/exams/${exam.id}`}>
                                              <Eye className="h-3 w-3 mr-2" />
                                              View
                                            </Link>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem asChild>
                                            <Link to={`/teacher/exams/${exam.id}/edit`}>
                                              <Edit className="h-3 w-3 mr-2" />
                                              Edit
                                            </Link>
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
