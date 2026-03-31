import { useEffect, useState, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { ArrowLeft, CalendarClock, ClipboardList, ExternalLink, Eye, FileText, Loader2, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  assignmentService,
  type AssignmentDto,
  type AssignmentSubmissionDto,
} from '../../services/assignmentService'

export function TeacherAssignmentSubmissionsPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const openedSubmissionFromQueryRef = useRef(false)
  const [assignment, setAssignment] = useState<AssignmentDto | null>(null)
  const [submissions, setSubmissions] = useState<AssignmentSubmissionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<AssignmentSubmissionDto | null>(null)

  useEffect(() => {
    if (!assignmentId) return

    const load = async () => {
      try {
        setLoading(true)
        const [a, subs] = await Promise.all([
          assignmentService.getAssignmentById(assignmentId),
          assignmentService.getSubmissions(assignmentId, { pageSize: 500 }),
        ])
        setAssignment(a)
        setSubmissions(subs.items)
      } catch (err) {
        toast.error('Failed to load assignment', {
          description: err instanceof Error ? err.message : undefined,
        })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [assignmentId])

  useEffect(() => {
    openedSubmissionFromQueryRef.current = false
  }, [assignmentId])

  useEffect(() => {
    if (loading || submissions.length === 0 || openedSubmissionFromQueryRef.current) return
    const sid = searchParams.get('submission')
    if (!sid) return

    const sub = submissions.find((s) => s.id === sid)
    const next = new URLSearchParams(searchParams)
    next.delete('submission')
    setSearchParams(next, { replace: true })

    if (!sub) return

    openedSubmissionFromQueryRef.current = true
    setViewing(sub)
  }, [loading, submissions, searchParams, setSearchParams])

  if (loading || !assignment) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const dueLabel = (() => {
    try {
      return format(new Date(assignment.dueAt), 'PPP p')
    } catch {
      return assignment.dueAt
    }
  })()

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/teacher/assignments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
            <p className="text-sm text-muted-foreground">
              {assignment.courseTitle} · {assignment.title}
            </p>
          </div>
        </div>
        <Button variant="gradient" asChild>
          <Link to={`/teacher/assignments/${assignmentId}/grade`}>
            <Pencil className="h-4 w-4 mr-2" />
            Grade students
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Assignment details
          </CardTitle>
          <CardDescription>Due date, points, and instructions students received</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="h-4 w-4 shrink-0" />
              <span>
                <span className="font-medium text-foreground">Due:</span> {dueLabel}
              </span>
            </div>
            <div>
              <span className="font-medium">Max score:</span> {Number(assignment.maxScore)} ·{' '}
              <span className="font-medium">Weight:</span> {Number(assignment.weight)}
            </div>
            <Badge variant={assignment.status === 'Published' ? 'default' : 'secondary'}>
              {assignment.status}
            </Badge>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 whitespace-pre-wrap">{assignment.prompt}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Student work ({submissions.length})</CardTitle>
          <CardDescription>What each student submitted and when</CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No submissions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Submitted at</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right w-[1%] whitespace-nowrap">Submission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.userName}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {(() => {
                          try {
                            return format(new Date(s.submittedAt), 'PP p')
                          } catch {
                            return s.submittedAt
                          }
                        })()}
                      </TableCell>
                      <TableCell>
                        {s.isLate ? (
                          <Badge variant="destructive" className="text-xs">
                            Late
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            On time
                          </Badge>
                        )}
                        {s.gradedAt ? (
                          <Badge variant="secondary" className="text-xs ml-1">
                            Graded
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {s.score != null ? (
                          <span className="font-semibold">{Number(s.score)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] text-muted-foreground hidden sm:inline">
                            {s.text?.trim()
                              ? `${s.fileUrl ? 'Text + file' : 'Text only'}`
                              : s.fileUrl
                                ? 'File only'
                                : 'Empty'}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => setViewing(s)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          {viewing && assignment && (
            <>
              <DialogHeader className="p-6 pb-4 border-b shrink-0 text-left space-y-1">
                <DialogTitle className="text-lg">{viewing.userName}&apos;s submission</DialogTitle>
                <DialogDescription asChild>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                    <span>
                      Submitted{' '}
                      {(() => {
                        try {
                          return format(new Date(viewing.submittedAt), 'PPP p')
                        } catch {
                          return viewing.submittedAt
                        }
                      })()}
                    </span>
                    {viewing.isLate ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Late
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        On time
                      </Badge>
                    )}
                    {viewing.gradedAt ? (
                      <span>
                        Graded:{' '}
                        {viewing.score != null ? (
                          <strong>
                            {Number(viewing.score)} / {Number(assignment.maxScore)}
                          </strong>
                        ) : (
                          '—'
                        )}
                      </span>
                    ) : null}
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="overflow-y-auto px-6 py-4 space-y-4">
                {viewing.feedback ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    <div className="font-medium text-foreground mb-1">Feedback for student</div>
                    <p className="text-muted-foreground whitespace-pre-wrap break-words">{viewing.feedback}</p>
                  </div>
                ) : null}

                <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                  <div className="font-medium text-foreground mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0" />
                    Written response
                  </div>
                  {viewing.text?.trim() ? (
                    <div className="min-h-[80px] max-h-[min(50vh,360px)] overflow-y-auto rounded-md border border-border/60 bg-background p-3 text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {viewing.text}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic text-sm">No written answer.</p>
                  )}
                </div>

                {viewing.fileUrl ? (
                  <div className="rounded-lg border p-4 text-sm space-y-2">
                    <div className="font-medium">Attachment</div>
                    <Button variant="secondary" size="sm" className="w-full sm:w-auto" asChild>
                      <a href={viewing.fileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {viewing.fileName || 'Open file'}
                      </a>
                    </Button>
                    {viewing.fileSize != null ? (
                      <p className="text-xs text-muted-foreground">
                        {Math.max(1, Math.round(viewing.fileSize / 1024))} KB
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {!viewing.text?.trim() && !viewing.fileUrl ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No content submitted.</p>
                ) : null}
              </div>

              <div className="p-4 border-t shrink-0 flex justify-end gap-2 bg-muted/20">
                <Button variant="outline" onClick={() => setViewing(null)}>
                  Close
                </Button>
                <Button variant="gradient" asChild>
                  <Link to={`/teacher/assignments/${assignmentId}/grade`}>Go to grading</Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
