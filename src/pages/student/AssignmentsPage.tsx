import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { assignmentService, type AssignmentDto, type AssignmentSubmissionDto } from '../../services/assignmentService'
import { enrollmentService, type EnrollmentDto } from '../../services/enrollmentService'
import { fileService } from '../../services/fileService'
import { toast } from 'sonner'
import { FileText, Clock, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { useUnreadGradeNotifications } from '../../hooks/useUnreadGradeNotifications'
import { notificationApiService } from '../../services/notificationApiService'
import { notificationService } from '../../services/notificationService'

export function AssignmentsPage() {
  const { unreadCount: unreadNewGrades, refetch: refetchGradeNotifications } = useUnreadGradeNotifications()
  const [assignments, setAssignments] = useState<AssignmentDto[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([])
  const [submissions, setSubmissions] = useState<Map<string, AssignmentSubmissionDto>>(new Map())
  const [loading, setLoading] = useState(true)
  const [courseFilter, setCourseFilter] = useState<string>('All')
  const [openId, setOpenId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const open = useMemo(() => assignments.find((a) => a.id === openId) ?? null, [assignments, openId])
  const existingSub = useMemo(() => {
    if (!open) return undefined
    return submissions.get(open.id)
  }, [open, submissions])

  const [text, setText] = useState('')
  const [fileMeta, setFileMeta] = useState<{ name?: string; size?: number }>({})
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Load assignments and enrollments in parallel
        const [assignmentsResult, enrollmentsResult] = await Promise.all([
          assignmentService.getMyAssignments({ pageSize: 100 }),
          enrollmentService.getMyEnrollments({ pageSize: 100 }),
        ])

        // Validate response structure and deduplicate by ID
        if (!assignmentsResult || !Array.isArray(assignmentsResult.items)) {
          console.error('Invalid assignments response:', assignmentsResult)
          setAssignments([])
        } else {
          // Deduplicate assignments by ID (in case of duplicates in database)
          const uniqueAssignments = assignmentsResult.items.reduce((acc, assignment) => {
            if (assignment && assignment.id && !acc.find(a => a.id === assignment.id)) {
              acc.push(assignment)
            }
            return acc
          }, [] as AssignmentDto[])
          
          setAssignments(uniqueAssignments)
          
          // Log if duplicates were found
          if (uniqueAssignments.length !== assignmentsResult.items.length) {
            console.warn(`Found ${assignmentsResult.items.length - uniqueAssignments.length} duplicate assignments, removed them`)
          }
        }

        if (!enrollmentsResult || !Array.isArray(enrollmentsResult.items)) {
          console.error('Invalid enrollments response:', enrollmentsResult)
          setEnrollments([])
        } else {
          setEnrollments(enrollmentsResult.items)
        }

        // Load submissions for each assignment
        const submissionMap = new Map<string, AssignmentSubmissionDto>()
        const assignmentsToLoad = Array.isArray(assignmentsResult?.items) ? assignmentsResult.items : []
        
        await Promise.all(
          assignmentsToLoad.map(async (assignment) => {
            try {
              if (!assignment || !assignment.id) {
                console.warn('Invalid assignment in list:', assignment)
                return
              }
              const submission = await assignmentService.getSubmission(assignment.id)
              if (submission && submission.id) {
                submissionMap.set(assignment.id, submission)
              }
            } catch (error) {
              // Submission doesn't exist yet, that's fine
              console.debug(`No submission found for assignment ${assignment?.id}:`, error)
            }
          })
        )
        setSubmissions(submissionMap)
      } catch (error) {
        console.error('Failed to load assignments:', error)
        toast.error('Failed to load assignments', {
          description: error instanceof Error ? error.message : 'Please try again later',
        })
        // Set empty arrays to prevent blank page
        setAssignments([])
        setEnrollments([])
        setSubmissions(new Map())
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Listen for enrollment changes to refresh assignments
    const handleEnrollmentChange = (event: Event) => {
      const customEvent = event as CustomEvent
      console.log('Enrollment changed, refreshing assignments:', customEvent.detail)
      // Clear existing data first to prevent stale data from showing
      setAssignments([])
      setEnrollments([])
      setSubmissions(new Map())
      // Then reload fresh data
      loadData()
    }
    window.addEventListener('enrollmentChanged', handleEnrollmentChange)
    
    return () => {
      window.removeEventListener('enrollmentChanged', handleEnrollmentChange)
    }
  }, [])

  const dismissNewGradesBanner = async () => {
    try {
      await notificationApiService.markAsReadByType('grade')
      await notificationService.loadFromApi()
      window.dispatchEvent(new Event('notificationUpdate'))
      await refetchGradeNotifications()
    } catch {
      toast.error('Could not clear grade alerts', { description: 'Try again from the bell menu.' })
    }
  }

  // Get unique courses from assignments
  const courses = useMemo(() => {
    try {
      const courseMap = new Map<string, { id: string; title: string }>()
      if (Array.isArray(assignments)) {
        assignments.forEach((a) => {
          if (a && a.courseId && a.courseTitle) {
            if (!courseMap.has(a.courseId)) {
              courseMap.set(a.courseId, { id: a.courseId, title: a.courseTitle })
            }
          }
        })
      }
      return Array.from(courseMap.values())
    } catch (error) {
      console.error('Error computing courses:', error)
      return []
    }
  }, [assignments])

  const filtered = useMemo(() => {
    try {
      if (!Array.isArray(assignments)) {
        return []
      }
      return assignments
        .filter((a) => a && a.id && (courseFilter === 'All' || a.courseId === courseFilter))
        .sort((a, b) => {
          try {
            return +new Date(a.dueAt) - +new Date(b.dueAt)
          } catch {
            return 0
          }
        })
    } catch (error) {
      console.error('Error filtering assignments:', error)
      return []
    }
  }, [assignments, courseFilter])

  const getAssignmentStatus = (assignment: AssignmentDto, submission?: AssignmentSubmissionDto) => {
    try {
      if (!assignment || !assignment.dueAt) {
        return { label: 'Pending', variant: 'secondary' as const, icon: Clock }
      }
      
      const now = new Date()
      const dueDate = new Date(assignment.dueAt)
      const isOverdue = now > dueDate

      if (submission) {
        if (submission.gradedAt) {
          return { label: 'Graded', variant: 'default' as const, icon: CheckCircle }
        }
        return { label: 'Submitted', variant: 'default' as const, icon: CheckCircle }
      }

      if (isOverdue) {
        return { label: 'Overdue', variant: 'destructive' as const, icon: AlertCircle }
      }

      return { label: 'Pending', variant: 'secondary' as const, icon: Clock }
    } catch (error) {
      console.error('Error computing assignment status:', error)
      return { label: 'Pending', variant: 'secondary' as const, icon: Clock }
    }
  }

  const handleOpenAssignment = async (assignmentId: string) => {
    setOpenId(assignmentId)
    const assignment = assignments.find((a) => a.id === assignmentId)
    if (!assignment) return

    // Load submission if not already loaded
    if (!submissions.has(assignmentId)) {
      try {
        const submission = await assignmentService.getSubmission(assignmentId)
        if (submission) {
          setSubmissions((prev) => new Map(prev).set(assignmentId, submission))
          setText(submission.text)
          setFileMeta({ name: submission.fileName, size: submission.fileSize })
        } else {
          setText('')
          setFileMeta({})
        }
      } catch (error) {
        setText('')
        setFileMeta({})
        setSelectedFile(null)
      }
    } else {
      const submission = submissions.get(assignmentId)
      setText(submission?.text || '')
      setFileMeta({ name: submission?.fileName, size: submission?.fileSize })
      setSelectedFile(null)
    }
  }

  const handleSubmit = async () => {
    if (!open) return
    if (!text.trim()) {
      toast.error('Submission is empty', { description: 'Please add some text before submitting.' })
      return
    }

    try {
      setSubmitting(true)
      let fileUrl: string | undefined
      let fileName: string | undefined
      let fileSize: number | undefined

      if (selectedFile) {
        const uploadResult = await fileService.uploadFile(selectedFile, 'assignments')
        fileUrl = uploadResult.fileUrl
        fileName = uploadResult.fileName
        fileSize = uploadResult.fileSize
      } else if (existingSub?.fileUrl) {
        fileUrl = existingSub.fileUrl
        fileName = existingSub.fileName ?? undefined
        fileSize = existingSub.fileSize ?? undefined
      }

      const submission = await assignmentService.submitAssignment(open.id, {
        text,
        fileName: fileName ?? fileMeta.name,
        fileSize: fileSize ?? fileMeta.size,
        fileUrl,
      })

      // Validate submission response
      if (!submission || !submission.id) {
        throw new Error('Invalid submission response from server')
      }

      // Update submissions map
      setSubmissions((prev) => {
        const newMap = new Map(prev)
        newMap.set(open.id, submission)
        return newMap
      })
      
      // Reload assignments to ensure state consistency
      try {
        const assignmentsResult = await assignmentService.getMyAssignments({ pageSize: 100 })
        if (assignmentsResult && Array.isArray(assignmentsResult.items)) {
          // Deduplicate assignments by ID
          const uniqueAssignments = assignmentsResult.items.reduce((acc, assignment) => {
            if (assignment && assignment.id && !acc.find(a => a.id === assignment.id)) {
              acc.push(assignment)
            }
            return acc
          }, [] as AssignmentDto[])
          setAssignments(uniqueAssignments)
        }
      } catch (reloadError) {
        console.error('Failed to reload assignments after submission:', reloadError)
        // Don't show error to user, just log it
      }

      toast.success('Assignment submitted', { description: open.title })
      setOpenId(null)
      setText('')
      setFileMeta({})
      setSelectedFile(null)
    } catch (error) {
      console.error('Assignment submission error:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : (typeof error === 'object' && error !== null && 'error' in error)
          ? String((error as any).error)
          : 'Please try again later'
      
      toast.error('Failed to submit assignment', {
        description: errorMessage,
      })
      
      // Don't close dialog on error so user can retry
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="text-2xl font-semibold">Assignments</div>
          <div className="text-sm text-muted-foreground">View and submit your assignments</div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-3/4 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Assignments</div>
          <div className="text-sm text-muted-foreground">View and submit your assignments</div>
        </div>
        {courses.length > 0 && (
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="All">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {unreadNewGrades > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm"
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/20">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="font-semibold text-foreground">
                New graded work
                {unreadNewGrades > 1 ? ` (${unreadNewGrades})` : ''}
              </div>
              <div className="text-muted-foreground mt-0.5">
                Your instructor posted a grade. Open an assignment below to view your score and feedback.
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0"
            onClick={() => void dismissNewGradesBanner()}
          >
            Mark as seen
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="rounded-full bg-muted p-4 mb-4"
            >
              <FileText className="h-8 w-8 text-muted-foreground" />
            </motion.div>
            <CardTitle className="text-xl mb-2">No assignments</CardTitle>
            <CardDescription className="max-w-md">
              {enrollments.length === 0
                ? 'Enroll in a course to see assignments here.'
                : 'No assignments have been assigned to your enrolled courses yet.'}
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((assignment) => {
            const submission = submissions.get(assignment.id)
            const status = getAssignmentStatus(assignment, submission)
            const isOverdue = new Date() > new Date(assignment.dueAt) && !submission

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card className={`h-full hover:shadow-lg transition-shadow ${isOverdue ? 'border-destructive/50' : ''}`}>
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{assignment.title}</CardTitle>
                    <CardDescription className="line-clamp-1">
                      <Link to={`/courses/${assignment.courseId}`} className="hover:text-primary transition-colors">
                        {assignment.courseTitle}
                      </Link>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={submission?.gradedAt ? 'outline' : status.variant}
                        className={cn(
                          submission?.gradedAt &&
                            'gap-1 rounded-full border-violet-300/90 bg-violet-100 font-medium text-violet-950 shadow-none hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-100 dark:hover:bg-violet-500/20'
                        )}
                      >
                        <status.icon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Due {format(new Date(assignment.dueAt), 'MMM d, p')}
                      </Badge>
                      {submission?.score != null && typeof submission.score === 'number' && (
                        <Badge variant="default">
                          Score: {submission.score.toFixed(1)}/{assignment.maxScore}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2">{assignment.prompt}</div>
                    {submission?.feedback && (
                      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                        <div className="font-medium mb-1">Feedback:</div>
                        <div className="text-muted-foreground">{submission.feedback}</div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleOpenAssignment(assignment.id)}>
                      {submission ? 'View Submission' : 'Submit'}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => (!o ? setOpenId(null) : null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.title}</DialogTitle>
                <DialogDescription>
                  <Link to={`/courses/${open.courseId}`} className="hover:text-primary transition-colors">
                    {open.courseTitle}
                  </Link>
                  {' • '}
                  Due {format(new Date(open.dueAt), 'MMM d, p')}
                  {existingSub && (
                    <>
                      {' • '}
                      <span className="text-primary">Submitted {format(new Date(existingSub.submittedAt), 'MMM d, p')}</span>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                <div className="rounded-md border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                  <div className="font-medium mb-2">Assignment Prompt:</div>
                  <div className="text-muted-foreground">{open.prompt}</div>
                </div>

                {existingSub?.score != null && typeof existingSub.score === 'number' && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Grade</div>
                      <div className="text-2xl font-bold text-primary">
                        {existingSub.score.toFixed(1)}/{open.maxScore}
                      </div>
                    </div>
                    {existingSub.feedback && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <div className="font-medium mb-1">Feedback:</div>
                        <div>{existingSub.feedback}</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-sm font-medium">Your Submission</div>
                  <textarea
                    className="min-h-[200px] w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Write your submission…"
                    disabled={!!existingSub?.gradedAt}
                  />
                  {existingSub?.gradedAt && (
                    <div className="text-xs text-muted-foreground">
                      This assignment has been graded. You cannot modify your submission.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Attachment</div>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.png,.jpg,.jpeg,.gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 25 * 1024 * 1024) {
                        toast.error('File too large', { description: 'Maximum size is 25 MB' })
                        return
                      }
                      setSelectedFile(file)
                      setFileMeta({ name: file.name, size: file.size })
                    }}
                    disabled={!!existingSub?.gradedAt}
                  />
                  {(fileMeta.name || existingSub?.fileName) && (
                    <div className="text-xs text-muted-foreground">
                      Attached: {fileMeta.name ?? existingSub?.fileName}
                      {fileMeta.size !== undefined || existingSub?.fileSize !== undefined
                        ? ` (${Math.round((fileMeta.size ?? existingSub?.fileSize ?? 0) / 1024)} KB)`
                        : ''}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenId(null)}>
                  Close
                </Button>
                {!existingSub?.gradedAt && (
                  <Button onClick={handleSubmit} disabled={submitting || !text.trim()}>
                    {existingSub ? 'Update Submission' : 'Submit'}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}



