import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { ArrowLeft, Clock, Users, UserX, Loader2, Save, FileText, Send, Eye, ChevronDown, ChevronRight, CheckCircle2, XCircle, User } from 'lucide-react'
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
import { examService, type ExamDto, type ExamAttemptDto, type ExamResultDto } from '../../services/examService'
import { enrollmentService, type EnrollmentDto } from '../../services/enrollmentService'
import { notificationService } from '../../services/notificationService'

export function TeacherExamDetailPage() {
  const { id: examId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const openedAttemptFromQueryRef = useRef(false)
  const [exam, setExam] = useState<ExamDto | null>(null)
  const [attempts, setAttempts] = useState<ExamAttemptDto[]>([])
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [savingScore, setSavingScore] = useState<string | null>(null)
  const [publishingAttemptId, setPublishingAttemptId] = useState<string | null>(null)
  const [editScores, setEditScores] = useState<Record<string, string>>({})
  const [submissionDialog, setSubmissionDialog] = useState<{
    open: boolean
    result: ExamResultDto | null
    studentName: string
    loading: boolean
    teacherNotes: Record<string, string>
  }>({
    open: false,
    result: null,
    studentName: '',
    loading: false,
    teacherNotes: {},
  })
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!examId) return
    const load = async () => {
      try {
        setLoading(true)
        const [examRes, attemptsRes] = await Promise.all([
          examService.getExamById(examId),
          examService.getExamAttempts(examId, { pageSize: 500 }),
        ])
        setExam(examRes)
        setAttempts(attemptsRes.items)
        const initialScores: Record<string, string> = {}
        attemptsRes.items.forEach((a) => {
          initialScores[a.id] = String(a.score)
        })
        setEditScores(initialScores)
        if (examRes.courseId) {
          try {
            const enrollRes = await enrollmentService.getCourseEnrollments(examRes.courseId, {
              pageSize: 500,
            })
            setEnrollments(enrollRes.items)
          } catch {
            setEnrollments([])
          }
        }
      } catch (error) {
        toast.error('Failed to load exam', {
          description: error instanceof Error ? error.message : 'Please try again.',
        })
        navigate('/teacher/exams')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [examId, navigate])

  useEffect(() => {
    openedAttemptFromQueryRef.current = false
  }, [examId])

  const attemptedUserIds = new Set(attempts.map((a) => a.userId))
  const notTaken = enrollments.filter((e) => !attemptedUserIds.has(e.userId))

  // One entry per student with their attempts (newest first). Teacher sees one row per student, then expands to see attempts.
  const studentsWithAttempts = (() => {
    const byUser = new Map<string, ExamAttemptDto[]>()
    for (const a of attempts) {
      const list = byUser.get(a.userId) ?? []
      list.push(a)
      byUser.set(a.userId, list)
    }
    for (const list of byUser.values()) {
      list.sort((a, b) => {
        const tA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
        const tB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
        return tB - tA
      })
    }
    return Array.from(byUser.entries())
      .map(([userId, list]) => ({ userId, userName: list[0]?.userName ?? '', attempts: list }))
      .sort((a, b) => a.userName.localeCompare(b.userName))
  })()

  const handleSaveScore = async (attemptId: string) => {
    const raw = editScores[attemptId]
    const score = raw === '' ? NaN : parseInt(raw, 10)
    const attempt = attempts.find((a) => a.id === attemptId)
    if (!attempt || isNaN(score) || score < 0 || (attempt.total > 0 && score > attempt.total)) {
      toast.error('Enter a valid score')
      return
    }
    setSavingScore(attemptId)
    try {
      const updated = await examService.updateAttemptScore(attemptId, score)
      setAttempts((prev) => prev.map((a) => (a.id === attemptId ? updated : a)))
      setEditScores((prev) => ({ ...prev, [attemptId]: String(updated.score) }))
      toast.success('Grade updated')
    } catch (error) {
      toast.error('Failed to update grade', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setSavingScore(null)
    }
  }

  const handleViewSubmission = useCallback(async (attemptId: string, studentName: string) => {
    setSubmissionDialog((prev) => ({ ...prev, open: true, studentName, loading: true, result: null, teacherNotes: {} }))
    try {
      const result = await examService.getAttemptSubmission(attemptId)
      setSubmissionDialog((prev) => ({ ...prev, result, loading: false }))
    } catch (error) {
      toast.error('Failed to load submission', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
      setSubmissionDialog((prev) => ({ ...prev, open: false, loading: false }))
    }
  }, [])

  // Open submission dialog when arriving from notification link: ?attempt={attemptId}
  useEffect(() => {
    if (loading || attempts.length === 0 || openedAttemptFromQueryRef.current) return
    const attemptIdFromUrl = searchParams.get('attempt')
    if (!attemptIdFromUrl) return

    const att = attempts.find((a) => a.id === attemptIdFromUrl)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('attempt')
    setSearchParams(nextParams, { replace: true })

    if (!att) return

    openedAttemptFromQueryRef.current = true
    setExpandedUserId(att.userId)
    void handleViewSubmission(att.id, att.userName || 'Student')
  }, [loading, attempts, searchParams, setSearchParams, handleViewSubmission])

  const handlePublishScore = async (attemptId: string) => {
    const attempt = attempts.find((a) => a.id === attemptId)
    if (!attempt || attempt.scorePublishedAt) return
    setPublishingAttemptId(attemptId)
    try {
      const updated = await examService.publishAttemptScore(attemptId)
      setAttempts((prev) => prev.map((a) => (a.id === attemptId ? updated : a)))
      if (updated.userEmail && exam) {
        notificationService.sendNotificationToUser(
          updated.userEmail,
          'grade',
          'Exam grade published',
          `Your grade for "${exam.title}" is now available. Check your exams page.`,
          '/student/exams'
        )
      }
      toast.success('Score published', {
        description: 'The student can now see their grade and has been notified.',
      })
    } catch (error) {
      toast.error('Failed to publish score', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setPublishingAttemptId(null)
    }
  }

  if (loading || !exam) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/teacher/exams">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">{exam.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {exam.courseTitle} · {exam.questionCount} questions · {exam.durationMinutes} min
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to={`/teacher/exams/${exam.id}/edit`}>Edit Exam</Link>
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Starts {format(new Date(exam.startsAt), 'PPp')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-4 w-4" />
              Took the exam
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold">{attempts.length}</p>
            <p className="text-xs text-muted-foreground">submitted attempts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Did not take
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold">{notTaken.length}</p>
            <p className="text-xs text-muted-foreground">enrolled students</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Students who took the exam</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            View grades and update scores. Short answer questions are not auto-graded — set each student’s score manually below after reviewing their answers. Attempts are grouped by student so you don't miss grading any attempt.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {attempts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No submissions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto scroll-fancy">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Student</TableHead>
                    <TableHead className="w-[120px]">Attempts</TableHead>
                    <TableHead className="w-[100px]">Latest score</TableHead>
                    <TableHead className="w-[100px]">Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsWithAttempts.map(({ userId, userName, attempts: studentAttempts }) => {
                    const isExpanded = expandedUserId === userId
                    const latest = studentAttempts[0]
                    const pendingCount = studentAttempts.filter((a) => !a.scorePublishedAt).length
                    return (
                      <React.Fragment key={userId}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50 transition-colors border-b"
                          onClick={() => setExpandedUserId((id) => (id === userId ? null : userId))}
                        >
                          <TableCell className="w-10 align-middle">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{userName}</div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                              {studentAttempts.length} attempt{studentAttempts.length !== 1 ? 's' : ''}
                            </span>
                          </TableCell>
                          <TableCell>
                            {latest && (
                              <span className="text-sm tabular-nums">
                                {latest.score}/{latest.total}
                                <span className="text-muted-foreground ml-1">({Number(latest.percentage).toFixed(0)}%)</span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {pendingCount > 0 ? (
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                                {pendingCount} to grade
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">All published</span>
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={5} className="p-0 align-top">
                              <div className="px-4 pb-4 pt-1 space-y-3">
                                {studentAttempts.map((a, idx) => (
                                  <div
                                    key={a.id}
                                    className="rounded-xl border border-border bg-background p-4 shadow-sm space-y-3"
                                  >
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-3">
                                        <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums">
                                          {idx === 0 && studentAttempts.length > 1 ? 'Latest' : `Attempt ${idx + 1}`}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                          {format(new Date(a.startedAt), 'MMM d, yyyy · h:mm a')}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium tabular-nums">
                                          {a.score}/{a.total}
                                        </span>
                                        <span className="text-sm text-muted-foreground">({Number(a.percentage).toFixed(1)}%)</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleViewSubmission(a.id, userName)
                                        }}
                                      >
                                        <Eye className="h-3.5 w-3" />
                                        View submission
                                      </Button>
                                      <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5">
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">Grade:</span>
                                        <Input
                                          type="number"
                                          min={0}
                                          max={a.total || 100}
                                          className="w-16 h-8 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                          value={editScores[a.id] ?? ''}
                                          onChange={(e) =>
                                            setEditScores((prev) => ({ ...prev, [a.id]: e.target.value }))
                                          }
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <span className="text-xs text-muted-foreground">/ {a.total}</span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 shrink-0"
                                          disabled={savingScore === a.id}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleSaveScore(a.id)
                                          }}
                                        >
                                          {savingScore === a.id ? (
                                            <Loader2 className="h-3.5 w-3 animate-spin" />
                                          ) : (
                                            <Save className="h-3.5 w-3" />
                                          )}
                                        </Button>
                                      </div>
                                      {a.scorePublishedAt ? (
                                        <span className="text-xs text-muted-foreground">Published</span>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          className="gap-1.5"
                                          disabled={publishingAttemptId === a.id}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handlePublishScore(a.id)
                                          }}
                                        >
                                          {publishingAttemptId === a.id ? (
                                            <Loader2 className="h-3.5 w-3 animate-spin" />
                                          ) : (
                                            <>
                                              <Send className="h-3.5 w-3" />
                                              Publish score
                                            </>
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={submissionDialog.open} onOpenChange={(open) => !submissionDialog.loading && setSubmissionDialog((p) => ({ ...p, open }))}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scroll-fancy pr-2">
          <DialogHeader>
            <DialogTitle>Submission — {submissionDialog.studentName}</DialogTitle>
            <DialogDescription>
              Review answers below to grade short-answer questions and set the score.
            </DialogDescription>
          </DialogHeader>
          {submissionDialog.loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : submissionDialog.result ? (
            <div className="space-y-4 pt-2">
              <div className="text-sm text-muted-foreground">
                Score: {submissionDialog.result.score}/{submissionDialog.result.total} ({Number(submissionDialog.result.percentage).toFixed(1)}%)
              </div>
              {submissionDialog.result.questions.map((q, idx) => {
                const studentAnswerDisplay =
                  q.type === 'ShortAnswer'
                    ? (q.userAnswerText != null && q.userAnswerText !== '' ? q.userAnswerText : '(No answer)')
                    : null
                const choices = q.choices ?? []
                const correctIdx = q.correctAnswerIndex
                const studentIdx = q.userAnswerIndex
                return (
                  <div key={q.id} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="font-medium text-sm">
                      {idx + 1}. {q.prompt}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Type: {q.type}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">Points: {q.points}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className={q.isCorrect ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                        {q.isCorrect ? (
                          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Correct</span>
                        ) : (
                          <span className="inline-flex items-center gap-1"><XCircle className="h-3 w-3" /> Incorrect</span>
                        )}
                      </span>
                    </div>
                    {q.type === 'ShortAnswer' ? (
                      <div className="text-sm">
                        <span className="text-muted-foreground font-medium">Student answer: </span>
                        <span>{studentAnswerDisplay}</span>
                      </div>
                    ) : choices.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">Choices:</div>
                        <ul className="space-y-1.5">
                          {choices.map((choice, i) => {
                            const isCorrect = i === correctIdx
                            const isStudent = i === studentIdx
                            return (
                              <li
                                key={i}
                                className={`flex items-center gap-2 text-sm py-1.5 px-2 rounded-md ${
                                  isCorrect && isStudent
                                    ? 'bg-green-500/10 border border-green-500/30'
                                    : isCorrect
                                      ? 'bg-green-500/10 border border-green-500/30'
                                      : isStudent
                                        ? 'bg-amber-500/10 border border-amber-500/30'
                                        : 'bg-muted/30'
                                }`}
                              >
                                <span className="font-mono text-xs w-5">{String.fromCharCode(65 + i)}.</span>
                                <span className="flex-1">{choice}</span>
                                <span className="flex gap-1.5 shrink-0">
                                  {isCorrect && (
                                    <span className="inline-flex items-center gap-0.5 text-green-600 text-xs font-medium">
                                      <CheckCircle2 className="h-3 w-3" /> Correct
                                    </span>
                                  )}
                                  {isStudent && (
                                    <span className="inline-flex items-center gap-0.5 text-primary text-xs font-medium">
                                      <User className="h-3 w-3" /> Student answer
                                    </span>
                                  )}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No choices available</div>
                    )}
                    <div className="space-y-1.5 pt-2 border-t border-border">
                      <Label htmlFor={`note-${q.id}`} className="text-xs font-medium text-muted-foreground">
                        Note for student (optional)
                      </Label>
                      <Textarea
                        id={`note-${q.id}`}
                        placeholder="Explain why this answer was incorrect, or add feedback for the student..."
                        value={submissionDialog.teacherNotes[q.id] ?? ''}
                        onChange={(e) =>
                          setSubmissionDialog((p) => ({
                            ...p,
                            teacherNotes: { ...p.teacherNotes, [q.id]: e.target.value },
                          }))
                        }
                        className="min-h-[60px] text-sm resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Students who did not take the exam</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Enrolled in the course but have no submitted attempt
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {notTaken.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              All enrolled students have attempted the exam.
            </p>
          ) : (
            <ul className="space-y-1">
              {notTaken.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                  <span className="font-medium">{e.userName}</span>
                  <span className="text-muted-foreground">{e.userEmail}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
