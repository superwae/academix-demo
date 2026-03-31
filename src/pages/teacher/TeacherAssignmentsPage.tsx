import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { 
  FileText, 
  PlusCircle, 
  Eye, 
  CheckCircle2,
  Clock,
  Users,
  Search,
  Loader2,
  Pencil,
  Send,
} from 'lucide-react'
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
import { assignmentService, type AssignmentDto } from '../../services/assignmentService'
import { teacherService } from '../../services/teacherService'

interface AssignmentWithStats extends AssignmentDto {
  submissionCount: number
  totalStudents: number
}

export function TeacherAssignmentsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [assignments, setAssignments] = useState<AssignmentWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        setLoading(true)
        
        // Get instructor's courses
        const coursesResult = await teacherService.getMyCourses({ pageSize: 1000 })
        const courses = coursesResult.items
        
        // Get assignments for each course
        const allAssignments: AssignmentWithStats[] = []
        
        for (const course of courses) {
          try {
            const assignmentsResult = await assignmentService.getCourseAssignments(course.id, { pageSize: 1000 })
            
            // Get submission counts for each assignment
            for (const assignment of assignmentsResult.items) {
              try {
                const submissionsResult = await assignmentService.getSubmissions(assignment.id, { pageSize: 1000 })
                const submissionCount = submissionsResult.items.length
                
                // Get total enrolled students for the course
                // We'll use a placeholder for now - ideally should get from enrollments
                const totalStudents = course.sections?.reduce((sum, section) => sum + (section.maxSeats - section.seatsRemaining), 0) || 0
                
                allAssignments.push({
                  ...assignment,
                  submissionCount,
                  totalStudents: totalStudents || 0,
                })
              } catch (error) {
                // If we can't get submissions, just set to 0
                allAssignments.push({
                  ...assignment,
                  submissionCount: 0,
                  totalStudents: 0,
                })
              }
            }
          } catch (error) {
            console.warn(`Failed to load assignments for course ${course.id}:`, error)
          }
        }
        
        setAssignments(allAssignments)
      } catch (error) {
        console.error('Failed to load assignments:', error)
        toast.error('Failed to load assignments', {
          description: error instanceof Error ? error.message : 'Please try again later',
        })
      } finally {
        setLoading(false)
      }
    }

    loadAssignments()
  }, [])

  const handlePublish = async (id: string) => {
    try {
      await assignmentService.updateAssignment(id, { status: 'Published' })
      toast.success('Assignment published', {
        description: 'Students enrolled in the course can now see it.',
      })
      setAssignments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'Published' } : a)),
      )
    } catch (error) {
      toast.error('Could not publish', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  const filteredAssignments = assignments.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.courseTitle || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight gradient-text sm:text-3xl">Assignments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage assignments and grade submissions</p>
        </div>
        <Button variant="gradient" asChild className="w-full shrink-0 sm:w-auto">
          <Link to="/teacher/assignments/create">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Assignment
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">All Assignments</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No assignments found</p>
              <p className="text-xs mt-1">Create your first assignment to get started</p>
            </div>
          ) : (
            <>
              {/* Mobile: stacked cards — no horizontal table scroll */}
              <div className="space-y-3 md:hidden">
                {filteredAssignments.map((assignment) => {
                  const dueLabel = assignment.dueAt
                    ? (() => {
                        try {
                          return format(new Date(assignment.dueAt), 'MMM d, yyyy')
                        } catch {
                          return 'Invalid date'
                        }
                      })()
                    : 'No due date'
                  return (
                    <div
                      key={assignment.id}
                      className="rounded-xl border border-border/70 bg-card/80 p-4 shadow-sm"
                    >
                      <div className="font-semibold leading-snug">{assignment.title}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{assignment.courseTitle || 'Unknown course'}</p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground">Due</dt>
                          <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {dueLabel}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Submissions</dt>
                          <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
                            <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {assignment.submissionCount} / {assignment.totalStudents || '?'}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-xs text-muted-foreground">Status</dt>
                          <dd className="mt-1">
                            <Badge
                              variant={assignment.status === 'Published' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {assignment.status || 'Draft'}
                            </Badge>
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-3">
                        <Button variant="outline" size="sm" className="flex-1 min-w-[calc(50%-0.25rem)]" asChild>
                          <Link to={`/teacher/assignments/${assignment.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Link>
                        </Button>
                        {assignment.status !== 'Published' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            className="flex-1 min-w-[calc(50%-0.25rem)]"
                            onClick={() => handlePublish(assignment.id)}
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Publish
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="flex-1 min-w-[calc(50%-0.25rem)]" asChild>
                          <Link to={`/teacher/assignments/${assignment.id}/submissions`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Submissions
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 min-w-[calc(50%-0.25rem)]" asChild>
                          <Link to={`/teacher/assignments/${assignment.id}/grade`}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Grade
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block md:rounded-lg md:border md:border-border/50">
                <div className="max-h-[min(70vh,720px)] overflow-auto scroll-fancy">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assignment</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Submissions</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            <div className="font-medium text-sm">{assignment.title}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">{assignment.courseTitle || 'Unknown Course'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {assignment.dueAt ? (() => {
                                try {
                                  return format(new Date(assignment.dueAt), 'MMM d, yyyy')
                                } catch {
                                  return 'Invalid date'
                                }
                              })() : 'No due date'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              {assignment.submissionCount} / {assignment.totalStudents || '?'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={assignment.status === 'Published' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {assignment.status || 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/teacher/assignments/${assignment.id}/edit`}>
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit
                                </Link>
                              </Button>
                              {assignment.status !== 'Published' && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  type="button"
                                  onClick={() => handlePublish(assignment.id)}
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  Publish
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/teacher/assignments/${assignment.id}/submissions`}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Link>
                              </Button>
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/teacher/assignments/${assignment.id}/grade`}>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Grade
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}


