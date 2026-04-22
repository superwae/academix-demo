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
import { useTranslation } from 'react-i18next'

function examStatus(startsAt: string, isActive: boolean): 'Scheduled' | 'Active' | 'Completed' {
  const now = Date.now()
  const start = new Date(startsAt).getTime()
  if (start > now) return 'Scheduled'
  return isActive ? 'Active' : 'Completed'
}

export function TeacherExamsPage() {
  const { t } = useTranslation(['teacher', 'common', 'errors'])
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
        toast.error(t('teacher:exams.errors.loadFailed'), {
          description: error instanceof Error ? error.message : t('teacher:shared.pleaseTryAgain'),
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
          <h1 className="text-3xl font-bold tracking-tight gradient-text">{t('teacher:exams.pageTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('teacher:exams.pageSubtitle')}</p>
        </div>
        <Button variant="gradient" asChild>
          <Link to="/teacher/exams/create">
            <PlusCircle className="h-4 w-4 me-2" />
            {t('teacher:exams.createExam')}
          </Link>
        </Button>
      </div>

      {/* Courses with dropdown exams */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center items-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin me-2" />
              <span className="text-sm">{t('teacher:exams.loadingCourses')}</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{t('teacher:exams.noCoursesYet')}</p>
              <p className="text-xs mt-1">{t('teacher:exams.noCoursesHint')}</p>
            </div>
          ) : (
            <Accordion defaultOpen={[]}>
              {courses.map((course) => {
                const courseExams = examsByCourseId.get(course.id) ?? []
                return (
                  <AccordionItem key={course.id} id={course.id}>
                    <AccordionTrigger className="flex items-center gap-2">
                      <span className="font-medium">{course.title}</span>
                      <Badge variant="secondary" className="ms-2 text-xs">
                        {t('teacher:exams.examCount', { count: courseExams.length })}
                      </Badge>
                    </AccordionTrigger>
                    <AccordionContent>
                      {courseExams.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          <p>{t('teacher:exams.noExamsInCourse')}</p>
                          <Button variant="outline" size="sm" className="mt-2" asChild>
                            <Link to={`/teacher/exams/create?courseId=${course.id}`}>
                              <PlusCircle className="h-3 w-3 me-1" />
                              {t('teacher:exams.createExam')}
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto scroll-fancy">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t('teacher:exams.columns.exam')}</TableHead>
                                <TableHead>{t('teacher:exams.columns.startDate')}</TableHead>
                                <TableHead>{t('teacher:exams.columns.duration')}</TableHead>
                                <TableHead>{t('teacher:exams.columns.questions')}</TableHead>
                                <TableHead>{t('teacher:exams.columns.status')}</TableHead>
                                <TableHead className="text-end">
                                  <div className="flex items-center justify-end gap-2">
                                    <span>{t('teacher:exams.columns.actions')}</span>
                                    <Button variant="outline" size="sm" asChild>
                                      <Link to={`/teacher/exams/create?courseId=${course.id}`}>
                                        <PlusCircle className="h-3 w-3 me-1" />
                                        {t('teacher:exams.createExam')}
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
                                      <div className="text-sm">{t('teacher:courseLessonsManagement.minutes', { count: exam.durationMinutes })}</div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm">{t('teacher:exams.questionsCount', { count: exam.questionCount })}</div>
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
                                        {t(`teacher:exams.statuses.${status.toLowerCase()}`)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-end">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem asChild>
                                            <Link to={`/teacher/exams/${exam.id}`}>
                                              <Eye className="h-3 w-3 me-2" />
                                              {t('teacher:assignments.viewAction')}
                                            </Link>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem asChild>
                                            <Link to={`/teacher/exams/${exam.id}/edit`}>
                                              <Edit className="h-3 w-3 me-2" />
                                              {t('common:edit')}
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
