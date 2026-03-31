import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Progress } from '../../components/ui/progress'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../components/ui/accordion'
import {
  Users,
  MessageSquare,
  Search,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { teacherService, type EnrolledStudent } from '../../services/teacherService'
import { analyticsService, type StudentAnalytics, type RiskLevel } from '../../services/analyticsService'
import type { CourseDto } from '../../services/courseService'
import { toast } from 'sonner'

// Extended student type with risk data
interface StudentWithRisk extends EnrolledStudent {
  riskLevel?: RiskLevel
  riskScore?: number
  riskFactors?: string[]
  lastActivityAt?: string
}

export function TeacherStudentsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [courses, setCourses] = useState<CourseDto[]>([])
  const [students, setStudents] = useState<StudentWithRisk[]>([])
  const [atRiskStudents, setAtRiskStudents] = useState<StudentAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [cardStats, setCardStats] = useState<{
    total: number
    active: number
    avgProgress: number
  } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        // Load courses, students, and instructor analytics in parallel
        const [coursesResult, enrolledStudents, instructorAnalytics] = await Promise.all([
          teacherService.getMyCourses({ pageSize: 500 }),
          teacherService.getEnrolledStudents(),
          analyticsService.getMyInstructorAnalytics().catch(() => null)
        ])

        setCourses(coursesResult.items)

        // 1) At-Risk: from analytics API
        const allAtRisk: StudentAnalytics[] = []
        if (instructorAnalytics) {
          for (const course of instructorAnalytics.courseAnalytics || []) {
            for (const student of course.atRiskStudents || []) {
              if (!allAtRisk.some(s => s.userId === student.userId)) {
                allAtRisk.push(student)
              }
            }
          }
          allAtRisk.sort((a, b) => b.riskScore - a.riskScore)
        }
        setAtRiskStudents(allAtRisk)

        // 2) Card stats: prefer InstructorAnalytics (real API data), fallback to enrolled students
        if (instructorAnalytics) {
          const rate = instructorAnalytics.averageCompletionRate ?? 0
          setCardStats({
            total: instructorAnalytics.totalStudents ?? 0,
            active: instructorAnalytics.activeStudents ?? 0,
            avgProgress: rate <= 1 ? Math.round(rate * 100) : Math.round(rate)
          })
        } else {
          // Fallback: count UNIQUE students (not enrollments) - matches backend logic
          const uniqueStudentIds = new Set(enrolledStudents.map(s => s.userId))
          const activeStudentIds = new Set(
            enrolledStudents.filter(s => s.status === 'Active').map(s => s.userId)
          )
          const total = uniqueStudentIds.size
          const active = activeStudentIds.size
          const avgProgress = enrolledStudents.length > 0
            ? Math.round(enrolledStudents.reduce((sum, s) => sum + s.progress, 0) / enrolledStudents.length)
            : 0
          setCardStats({ total, active, avgProgress })
        }

        // 3) Create risk map for merging with enrolled students (table Risk column)
        const riskMap = new Map<string, StudentAnalytics>()
        for (const s of allAtRisk) {
          riskMap.set(s.userId, s)
        }

        // 4) Merge risk data with enrolled students for table
        const studentsWithRisk: StudentWithRisk[] = enrolledStudents.map(student => {
          const riskData = riskMap.get(student.userId)
          return {
            ...student,
            riskLevel: riskData?.riskLevel,
            riskScore: riskData?.riskScore,
            riskFactors: riskData?.riskFactors,
            lastActivityAt: riskData?.lastActivityAt
          }
        })

        setStudents(studentsWithRisk)
      } catch (error) {
        console.error('Failed to load students:', error)
        toast.error('Failed to load students', {
          description: error instanceof Error ? error.message : 'An error occurred',
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // At-risk count from analytics (same source as Dashboard) - not from merged students
  const atRiskCount = atRiskStudents.length

  const filteredStudents = useMemo(() => {
    let result = students.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.courseName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Sort by risk score descending (at-risk students first)
    return result.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
  }, [students, searchQuery])

  // Group filtered students by course (for accordion display)
  const studentsByCourseId = useMemo(() => {
    const map = new Map<string, StudentWithRisk[]>()
    for (const student of filteredStudents) {
      const list = map.get(student.courseId) ?? []
      list.push(student)
      map.set(student.courseId, list)
    }
    return map
  }, [filteredStudents])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight gradient-text sm:text-3xl">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">Students grouped by course</p>
        </div>
      </div>

      {/* Stats Cards - real data from InstructorAnalytics API */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</div>
              <div className="mt-1 text-xl font-bold">
                {loading ? '—' : (cardStats?.total ?? students.length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</div>
              <div className="mt-1 text-xl font-bold">
                {loading ? '—' : (cardStats?.active ?? students.filter(s => s.status === 'Active').length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg. Progress</div>
              <div className="mt-1 text-xl font-bold">
                {loading ? '—' : `${cardStats?.avgProgress ?? (students.length > 0 ? Math.round(students.reduce((sum, s) => sum + s.progress, 0) / students.length) : 0)}%`}
              </div>
            </CardContent>
          </Card>
          {atRiskCount > 0 ? (
            <Link to="/teacher/at-risk-students">
              <Card className="cursor-pointer hover:border-orange-500/50 transition-colors h-full">
                <CardContent className="pt-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">At-Risk</div>
                  <div className="mt-1 text-xl font-bold text-orange-500 flex items-center gap-1">
                    {atRiskCount}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">At-Risk</div>
                <div className="mt-1 text-xl font-bold">{atRiskCount}</div>
              </CardContent>
            </Card>
          )}
      </div>

      {/* Search bar - below cards */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Students Table - Grouped by Course */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">All Students</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} across {courses.length} course{courses.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No courses yet</p>
              <p className="text-xs mt-1">Create a course first to see students</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No students found</p>
              <p className="text-xs mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <Accordion className="w-full">
              {courses
                .filter((course) => (studentsByCourseId.get(course.id) ?? []).length > 0)
                .map((course) => {
                const courseStudents = studentsByCourseId.get(course.id) ?? []
                return (
                  <AccordionItem key={course.id} id={course.id}>
                    <AccordionTrigger className="flex items-center gap-2">
                      <span className="font-medium">{course.title}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {courseStudents.length} student{courseStudents.length !== 1 ? 's' : ''}
                      </Badge>
                    </AccordionTrigger>
                    <AccordionContent>
                      {courseStudents.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          No students matching your search in this course.
                        </div>
                      ) : (
                        <>
                          {/* Mobile: full-width cards — no horizontal scroll */}
                          <div className="space-y-3 pb-2 md:hidden">
                            {courseStudents.map((student) => (
                              <div
                                key={student.id}
                                className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm"
                              >
                                <div className="font-semibold">{student.name}</div>
                                <p className="mt-0.5 break-all text-sm text-muted-foreground">{student.email}</p>
                                <div className="mt-3 space-y-2">
                                  <div className="flex items-center justify-between gap-2 text-sm">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="tabular-nums font-semibold">{Math.round(student.progress)}%</span>
                                  </div>
                                  <Progress value={student.progress} className="h-2.5" />
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Risk:</span>
                                  {student.riskLevel ? (
                                    <Badge
                                      variant={student.riskLevel === 'Medium' ? 'secondary' : 'outline'}
                                      className={`text-xs ${
                                        student.riskLevel === 'Critical'
                                          ? 'border-red-500 bg-red-500 text-white'
                                          : student.riskLevel === 'High'
                                            ? 'border-orange-500 bg-orange-500 text-white'
                                            : ''
                                      }`}
                                    >
                                      {student.riskLevel}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                  <Badge variant={student.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                                    {student.status}
                                  </Badge>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  Enrolled {formatDistanceToNow(new Date(student.enrolledAt), { addSuffix: true })}
                                </p>
                                <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-3 sm:flex-row">
                                  <Button variant="outline" size="sm" className="w-full" asChild>
                                    <Link to={`/teacher/students/${student.userId}`}>
                                      <Users className="h-4 w-4 mr-2" />
                                      Profile
                                    </Link>
                                  </Button>
                                  <Button variant="outline" size="sm" className="w-full" asChild>
                                    <Link to={`/teacher/messages?student=${student.userId}`}>
                                      <MessageSquare className="h-4 w-4 mr-2" />
                                      Message
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Desktop: table in scroll region */}
                          <div className="hidden max-h-[min(520px,60vh)] overflow-auto rounded-lg border border-border/50 md:block">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Student Name</TableHead>
                                  <TableHead>Progress</TableHead>
                                  <TableHead>Risk</TableHead>
                                  <TableHead>Enrolled</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {courseStudents.map((student) => (
                                  <TableRow key={student.id}>
                                    <TableCell>
                                      <div>
                                        <div className="font-medium text-sm">{student.name}</div>
                                        <div className="text-xs text-muted-foreground">{student.email}</div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="min-w-[8rem] space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-muted-foreground">Progress</span>
                                          <span className="font-medium tabular-nums">{Math.round(student.progress)}%</span>
                                        </div>
                                        <Progress value={student.progress} className="h-2" />
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {student.riskLevel ? (
                                        <Badge
                                          variant={student.riskLevel === 'Medium' ? 'secondary' : 'outline'}
                                          className={`text-xs ${
                                            student.riskLevel === 'Critical'
                                              ? 'border-red-500 bg-red-500 text-white'
                                              : student.riskLevel === 'High'
                                                ? 'border-orange-500 bg-orange-500 text-white'
                                                : ''
                                          }`}
                                        >
                                          {student.riskLevel}
                                        </Badge>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm text-muted-foreground">
                                        {formatDistanceToNow(new Date(student.enrolledAt), { addSuffix: true })}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={student.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                                        {student.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <Button variant="ghost" size="sm" asChild>
                                          <Link to={`/teacher/students/${student.userId}`}>
                                            <Users className="h-3 w-3 mr-1" />
                                            Profile
                                          </Link>
                                        </Button>
                                        <Button variant="ghost" size="sm" asChild>
                                          <Link to={`/teacher/messages?student=${student.userId}`}>
                                            <MessageSquare className="h-3 w-3 mr-1" />
                                            Message
                                          </Link>
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
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

