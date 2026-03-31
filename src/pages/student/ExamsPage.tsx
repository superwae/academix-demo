import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { examService, type ExamDto, type ExamQuestionDto, type ExamAttemptDto, type StartExamResponse } from '../../services/examService'
import { courseService, type CourseDto } from '../../services/courseService'
import { toast } from 'sonner'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../components/ui/accordion'
import { CheckCircle2, XCircle, FileText, ChevronRight, Award, Clock } from 'lucide-react'

type RunningExam = {
  attemptId: string
  examId: string
  startedAt: string
  expiresAt: string
  questions: ExamQuestionDto[]
  answers: Record<string, number> // QuestionId -> ChoiceIndex
  answerTexts: Record<string, string> // QuestionId -> text (ShortAnswer)
}

export function ExamsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [exams, setExams] = useState<ExamDto[]>([])
  const [attempts, setAttempts] = useState<ExamAttemptDto[]>([])
  const [courses, setCourses] = useState<Map<string, CourseDto>>(new Map())
  const [loading, setLoading] = useState(true)

  const [openId, setOpenId] = useState<string | null>(null)

  const [mode, setMode] = useState<'details' | 'running' | 'score' | 'summary'>('details')
  const [running, setRunning] = useState<RunningExam | null>(null)
  const [score, setScore] = useState<{ score: number; total: number; percentage: number; attemptId: string; scorePublishedAt?: string | null } | null>(null)
  const [examResult, setExamResult] = useState<import('../../services/examService').ExamResultDto | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loadingResults, setLoadingResults] = useState(false)
  /** When in summary: did we come from post-submit (score) or from attempt list (details) */
  const [summaryFrom, setSummaryFrom] = useState<'score' | 'attempts'>(`score`)

  // Load exams and attempts
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [examsResult, attemptsResult] = await Promise.all([
          examService.getMyExams({ pageSize: 100 }),
          examService.getMyAttempts({ pageSize: 100 }),
        ])

        // Deduplicate by exam id (same exam can appear from multiple enrollments/courses)
        const seen = new Set<string>()
        const deduped = examsResult.items.filter((e) => {
          if (seen.has(e.id)) return false
          seen.add(e.id)
          return true
        })
        setExams(deduped)
        setAttempts(attemptsResult.items)

        // Load course details for exams
        const courseIds = Array.from(new Set(deduped.map(e => e.courseId)))
        const courseMap = new Map<string, CourseDto>()
        await Promise.all(
          courseIds.map(async (courseId) => {
            try {
              const course = await courseService.getCourseById(courseId)
              courseMap.set(courseId, course)
            } catch (error) {
              console.error(`Failed to load course ${courseId}:`, error)
            }
          })
        )
        setCourses(courseMap)
      } catch (error) {
        console.error('Failed to load exams:', error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Network error - please check if the backend API is running';
        
        // Check if it's a network error
        if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
          toast.error('Failed to load exams', {
            description: 'Cannot connect to the server. Please ensure the backend API is running on http://localhost:5261',
          });
        } else {
          toast.error('Failed to load exams', {
            description: errorMessage,
          });
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate seconds left from expiresAt
  const secondsLeft = useMemo(() => {
    if (!running) return 0
    const now = new Date()
    const expires = new Date(running.expiresAt)
    return Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000))
  }, [running])

  // tick timer while running
  useEffect(() => {
    if (!running || secondsLeft <= 0) return
    const t = window.setInterval(() => {
      // Recalculate seconds left
      const now = new Date()
      const expires = new Date(running.expiresAt)
      const remaining = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000))
      if (remaining === 0) {
        // Auto-submit on timeout
        handleSubmitExam()
      }
    }, 1000)
    return () => window.clearInterval(t)
  }, [running?.attemptId, secondsLeft])

  // Auto-submit on timeout
  useEffect(() => {
    if (!running || secondsLeft > 0) return
    // Only auto-submit if we have a running exam and time expired
    if (running && secondsLeft === 0) {
      handleSubmitExam()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, running?.attemptId])

  async function startExam(examId: string) {
    if (!open) return

    try {
      const response: StartExamResponse = await examService.startExam({ examId })
      
      setMode('running')
      setScore(null)
      setCurrentQuestionIndex(0)
      setRunning({
        attemptId: response.attemptId,
        examId,
        startedAt: response.startedAt,
        expiresAt: response.expiresAt,
        questions: response.questions,
        answers: {},
        answerTexts: {},
      })
      toast.success('Exam started', { description: `You have ${response.durationMinutes} minutes to complete.` })
    } catch (error) {
      toast.error('Failed to start exam', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    }
  }

  async function handleSubmitExam() {
    if (!running || !open) return

    try {
      const attempt = await examService.submitExam({
        attemptId: running.attemptId,
        answers: running.answers,
        answerTexts: Object.keys(running.answerTexts).length ? running.answerTexts : undefined,
      })

      setRunning(null)
      console.log('[ExamsPage] Exam submitted, attempt data:', attempt)
      console.log('[ExamsPage] Attempt ID:', attempt.id)
      
      setScore({
        score: attempt.score,
        total: attempt.total,
        percentage: attempt.percentage,
        attemptId: attempt.id,
        scorePublishedAt: attempt.scorePublishedAt ?? null,
      })
      setMode('score')
      setExamResult(null) // Clear previous results

      // Reload attempts to show the new one
      const attemptsResult = await examService.getMyAttempts({ pageSize: 100 })
      setAttempts(attemptsResult.items)

      toast.success('Exam submitted successfully. Good luck!', {
        description: 'Your answers have been saved. Your instructor may publish your grade later.',
      })
    } catch (error) {
      toast.error('Failed to submit exam', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    }
  }

  const questions = useMemo(() => running?.questions ?? [], [running])
  // One card per exam slot: dedupe by (courseId, title, startsAt) so duplicate DB rows don't show twice
  const displayExams = useMemo(() => {
    const bySlot = new Map<string, ExamDto>()
    for (const e of exams) {
      if (!e?.id) continue
      const slot = `${e.courseId}|${e.title}|${e.startsAt}`
      if (!bySlot.has(slot)) bySlot.set(slot, e)
    }
    return Array.from(bySlot.values())
  }, [exams])

  /** Group exams by course for accordion display */
  const coursesWithExams = useMemo(() => {
    const byCourse = new Map<string, { courseId: string; courseTitle: string; exams: ExamDto[] }>()
    for (const e of displayExams) {
      const existing = byCourse.get(e.courseId)
      if (existing) {
        existing.exams.push(e)
      } else {
        byCourse.set(e.courseId, { courseId: e.courseId, courseTitle: e.courseTitle, exams: [e] })
      }
    }
    return Array.from(byCourse.values()).sort((a, b) =>
      a.courseTitle.localeCompare(b.courseTitle)
    )
  }, [displayExams])

  const open = useMemo(() => displayExams.find((e) => e.id === openId) ?? null, [displayExams, openId])
  const openCourse = useMemo(() => (open ? courses.get(open.courseId) : undefined), [open, courses])

  // Open exam dialog when navigated from dashboard with state.openExamId (must run after displayExams is defined)
  useEffect(() => {
    const openExamId = (location.state as { openExamId?: string } | null)?.openExamId
    if (loading || !openExamId || displayExams.length === 0) return
    const found = displayExams.some((e) => e.id === openExamId)
    if (found) {
      setOpenId(openExamId)
      setMode('details')
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [loading, location.state, location.pathname, navigate, displayExams])

  const sameSlotExamIds = useMemo(() => {
    if (!open) return new Set<string>()
    return new Set(
      exams
        .filter(
          (e) =>
            e.courseId === open.courseId &&
            e.title === open.title &&
            e.startsAt === open.startsAt,
        )
        .map((e) => e.id),
    )
  }, [open, exams])

  const lastAttempt = useMemo(() => {
    if (!open) return null
    return attempts
      .filter((a) => sameSlotExamIds.has(a.examId))
      .sort((a, b) => {
        const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
        const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
        return bTime - aTime
      })[0] ?? null
  }, [open, attempts, sameSlotExamIds])

  /** Last submitted attempt per exam slot (for showing on each card) */
  const lastAttemptBySlot = useMemo(() => {
    const map = new Map<string, (typeof attempts)[0]>()
    for (const a of attempts) {
      if (!a.submittedAt) continue
      const exam = exams.find((e) => e.id === a.examId)
      if (!exam) continue
      const slot = `${exam.courseId}|${exam.title}|${exam.startsAt}`
      const existing = map.get(slot)
      const aTime = new Date(a.submittedAt).getTime()
      if (!existing || new Date(existing.submittedAt!).getTime() < aTime) {
        map.set(slot, a)
      }
    }
    return map
  }, [attempts, exams])

  /** All submitted attempts for this exam (for "View summary" per attempt) */
  const attemptsForOpenExam = useMemo(() => {
    return attempts
      .filter((a) => sameSlotExamIds.has(a.examId) && a.submittedAt)
      .sort((a, b) => {
        const aTime = new Date(a.submittedAt!).getTime()
        const bTime = new Date(b.submittedAt!).getTime()
        return bTime - aTime
      })
  }, [attempts, sameSlotExamIds])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="text-2xl font-semibold">Exams</div>
          <div className="text-sm text-muted-foreground">View and take your exams</div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
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
      <div>
        <div className="text-2xl font-semibold">Exams</div>
        <div className="text-sm text-muted-foreground">Exams grouped by course</div>
      </div>

      {displayExams.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-sm font-medium">No exams yet</div>
            <div className="mt-1 text-sm text-muted-foreground">You're all caught up.</div>
          </CardContent>
        </Card>
      ) : (
        <Accordion defaultOpen={coursesWithExams[0] ? [coursesWithExams[0].courseId] : []}>
          {coursesWithExams.map(({ courseId, courseTitle, exams: courseExams }) => {
            const course = courses.get(courseId)
            return (
              <AccordionItem key={courseId} id={courseId}>
                <AccordionTrigger className="flex items-center gap-2">
                  <span className="font-medium">{courseTitle}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {courseExams.length} exam{courseExams.length !== 1 ? 's' : ''}
                  </Badge>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {courseExams
                      .slice()
                      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
                      .map((e) => {
                        const slot = `${e.courseId}|${e.title}|${e.startsAt}`
                        const lastAttemptForExam = lastAttemptBySlot.get(slot) ?? null
                        return (
                          <Card key={e.id}>
                            <CardHeader>
                              <CardTitle>{e.title}</CardTitle>
                              <CardDescription>
                                {course ? (
                                  <Link to={`/courses/${course.id}`} className="hover:text-primary transition-colors">
                                    {e.courseTitle}
                                  </Link>
                                ) : (
                                  e.courseTitle
                                )}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">Starts {format(new Date(e.startsAt), 'MMM d, p')}</Badge>
                                <Badge variant="subtle">{e.durationMinutes} min</Badge>
                                {e.allowRetake && <Badge variant="outline">Retake allowed</Badge>}
                              </div>
                              {e.description && (
                                <div className="text-sm text-muted-foreground">{e.description}</div>
                              )}
                              {lastAttemptForExam && (
                                <div className="text-xs text-muted-foreground">
                                  Last attempt: {lastAttemptForExam.score}/{lastAttemptForExam.total} ({typeof lastAttemptForExam.percentage === 'number' ? lastAttemptForExam.percentage.toFixed(1) : '—'}%)
                                </div>
                              )}
                            </CardContent>
                            <CardFooter className="justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setOpenId(e.id)
                                  setMode('details')
                                  setScore(null)
                                  setRunning(null)
                                  setExamResult(null)
                                  setCurrentQuestionIndex(0)
                                }}
                              >
                                Details
                              </Button>
                            </CardFooter>
                          </Card>
                        )
                      })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}

      <Dialog
        open={!!open}
        onOpenChange={(o) => {
          if (!o) {
            setOpenId(null)
            setRunning(null)
            setScore(null)
            setExamResult(null)
            setMode('details')
            setCurrentQuestionIndex(0)
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.title}</DialogTitle>
                <DialogDescription>
                  {openCourse ? (
                    <Link to={`/courses/${openCourse.id}`} className="hover:text-primary transition-colors">
                      {open.courseTitle}
                    </Link>
                  ) : (
                    open.courseTitle
                  )}
                  {' • '}
                  {open.durationMinutes} min • {open.questionCount} questions
                </DialogDescription>
              </DialogHeader>

              {mode === 'details' && (
                <div className="mt-4 space-y-4">
                  {open.description && (
                    <div className="text-sm text-muted-foreground">{open.description}</div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    This exam has {open.questionCount} questions and a duration of {open.durationMinutes} minutes.
                    {open.allowRetake && ' You can retake this exam.'}
                    {open.maxAttempts && ` Maximum attempts: ${open.maxAttempts}`}
                  </div>

                  {attemptsForOpenExam.length > 0 && (
                    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        <FileText className="h-4 w-4" />
                        Your attempts
                      </div>
                      <ul className="space-y-2">
                        {attemptsForOpenExam.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {format(new Date(a.submittedAt!), 'MMM d, yyyy · h:mm a')}
                              </span>
                              {a.scorePublishedAt ? (
                                <Badge variant="secondary" className="text-xs">
                                  {a.score}/{a.total} ({a.percentage.toFixed(0)}%)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Grade pending</Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary shrink-0"
                              onClick={async () => {
                                try {
                                  setLoadingResults(true)
                                  setSummaryFrom('attempts')
                                  const result = await examService.getExamResults(a.id)
                                  setExamResult(result)
                                  setMode('summary')
                                } catch (err) {
                                  toast.error('Could not load summary', {
                                    description: err instanceof Error ? err.message : 'Try again later.',
                                  })
                                } finally {
                                  setLoadingResults(false)
                                }
                              }}
                              disabled={loadingResults}
                            >
                              View summary
                              <ChevronRight className="h-4 w-4 ml-0.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={() => startExam(open.id)} disabled={!open.isActive}>
                      Start Exam
                    </Button>
                  </div>
                </div>
              )}

              {mode === 'running' && running && questions.length > 0 && (
                <div className="mt-4 space-y-4">
                  {/* Timer and Progress */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center justify-between flex-1 rounded-md border border-border bg-background p-3 text-sm">
                      <div className="font-medium">Time left</div>
                      <div className={`tabular-nums font-semibold ${secondsLeft < 60 ? 'text-destructive' : ''}`}>
                        {formatSeconds(secondsLeft)}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-background px-4 py-2 text-sm">
                      <div className="font-medium text-muted-foreground">Question</div>
                      <div className="tabular-nums font-semibold">
                        {currentQuestionIndex + 1} / {questions.length}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>

                  {/* Current Question */}
                  <div className="rounded-md border border-border bg-card p-6">
                    <div className="text-base font-semibold mb-4">
                      {currentQuestionIndex + 1}. {questions[currentQuestionIndex].prompt}
                    </div>
                    <div className="space-y-2">
                      {questions[currentQuestionIndex].type === 'ShortAnswer' ? (
                        <textarea
                          className="w-full min-h-[120px] rounded-lg border-2 border-border px-4 py-3 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          placeholder="Type your answer here..."
                          value={running.answerTexts[questions[currentQuestionIndex].id] ?? ''}
                          onChange={(e) =>
                            setRunning((r) =>
                              r
                                ? {
                                    ...r,
                                    answerTexts: {
                                      ...r.answerTexts,
                                      [questions[currentQuestionIndex].id]: e.target.value,
                                    },
                                  }
                                : r,
                            )
                          }
                        />
                      ) : (
                        questions[currentQuestionIndex].choices.map((choice, ci) => (
                          <label
                            key={ci}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-border px-4 py-3 hover:bg-accent/40 hover:border-primary/50 transition-all"
                          >
                            <input
                              type="radio"
                              name={questions[currentQuestionIndex].id}
                              className="mt-1"
                              checked={running.answers[questions[currentQuestionIndex].id] === ci}
                              onChange={() =>
                                setRunning((r) =>
                                  r
                                    ? {
                                        ...r,
                                        answers: {
                                          ...r.answers,
                                          [questions[currentQuestionIndex].id]: ci,
                                        },
                                      }
                                    : r,
                                )
                              }
                            />
                            <div className="text-sm flex-1">{choice}</div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
                          setOpenId(null)
                        }
                      }}
                      className="flex-shrink-0"
                    >
                      Exit
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (currentQuestionIndex > 0) {
                            setCurrentQuestionIndex(currentQuestionIndex - 1)
                          }
                        }}
                        disabled={currentQuestionIndex === 0}
                      >
                        Previous
                      </Button>
                      {currentQuestionIndex < questions.length - 1 ? (
                        <Button
                          onClick={() => {
                            if (currentQuestionIndex < questions.length - 1) {
                              setCurrentQuestionIndex(currentQuestionIndex + 1)
                            }
                          }}
                        >
                          Next
                        </Button>
                      ) : (
                        <Button onClick={handleSubmitExam}>Submit</Button>
                      )}
                    </div>
                  </div>

                  {/* Question Navigation Dots */}
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {questions.map((q, idx) => {
                      const answered = running.answers[q.id] !== undefined || (running.answerTexts[q.id]?.trim() ?? '') !== ''
                      return (
                        <button
                          key={q.id}
                          onClick={() => setCurrentQuestionIndex(idx)}
                          className={`h-2 rounded-full transition-all ${
                            idx === currentQuestionIndex
                              ? 'w-8 bg-primary'
                              : answered
                                ? 'w-2 bg-primary/50'
                                : 'w-2 bg-muted hover:bg-muted-foreground/50'
                          }`}
                          aria-label={`Go to question ${idx + 1}`}
                        />
                      )
                    })}
                  </div>
                </div>
              )}

              {mode === 'score' && score && (
                <div className="mt-4 space-y-5">
                  <div className="rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/30 dark:border-green-800/50 p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-green-500/20 p-2 shrink-0">
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-green-800 dark:text-green-200">Exam submitted successfully. Good luck!</div>
                        <div className="mt-1 text-sm text-green-700 dark:text-green-300">
                      Your answers have been saved. Your instructor may publish your grade later — you can check back here or we’ll notify you when it’s available.
                    </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-md border border-border bg-background p-4">
                    <div className="text-sm text-muted-foreground">Score</div>
                    {score.scorePublishedAt ? (
                      <>
                        <div className="text-3xl font-semibold">
                          {score.score}/{score.total}
                        </div>
                        <div className="text-lg text-muted-foreground">
                          {score.percentage.toFixed(1)}%
                        </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground">
                        Your grade will be available when your instructor publishes it. You can check back here or we’ll notify you.
                      </div>
                    )}
                    <div className="mt-1 text-sm text-muted-foreground">
                      Your attempt has been saved.
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenId(null)}>
                      Close
                    </Button>
                    <Button 
                      onClick={async () => {
                        if (!score || !score.attemptId) {
                          // Fallback: try to get the attempt ID from the attempts list
                          try {
                            setLoadingResults(true)
                            const attemptsResult = await examService.getMyAttempts({ pageSize: 100 })
                            const lastAttempt = attemptsResult.items
                              .filter((a) => sameSlotExamIds.has(a.examId) && a.submittedAt)
                              .sort((a, b) => {
                                const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
                                const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
                                return bTime - aTime
                              })[0]
                            
                            if (lastAttempt) {
                              setSummaryFrom('score')
                              const result = await examService.getExamResults(lastAttempt.id)
                              setExamResult(result)
                              setMode('summary')
                            } else {
                              toast.error('Failed to load exam results', {
                                description: 'Could not find the submitted attempt.',
                              })
                            }
                          } catch (error) {
                            toast.error('Failed to load exam results', {
                              description: error instanceof Error ? error.message : 'Please try again later',
                            })
                          } finally {
                            setLoadingResults(false)
                          }
                          return
                        }
                        try {
                          setLoadingResults(true)
                          // Use the attempt ID from the score (stored during submission)
                          console.log('[ExamsPage] Loading exam results for attempt:', score.attemptId)
                          console.log('[ExamsPage] Score object:', score)
                          
                          if (!score.attemptId) {
                            throw new Error('Attempt ID is missing from score data')
                          }
                          
setSummaryFrom('score')
                          const result = await examService.getExamResults(score.attemptId)
                              setExamResult(result)
                              setMode('summary')
                        } catch (error) {
                          console.error('[ExamsPage] Error loading exam results:', error)
                          const errorMessage = error instanceof Error 
                            ? error.message 
                            : typeof error === 'object' && error !== null && 'error' in error
                            ? (error as { error: string }).error
                            : 'Please try again later'
                          
                          toast.error('Failed to load exam results', {
                            description: errorMessage,
                          })
                        } finally {
                          setLoadingResults(false)
                        }
                      }}
                      disabled={loadingResults}
                    >
                      {loadingResults ? 'Loading...' : 'View summary'}
                    </Button>
                  </div>
                </div>
              )}

              {mode === 'summary' && examResult && (
                <div className="mt-4 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                  <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                      <Award className="h-4 w-4" />
                      Score
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold tabular-nums">{examResult.score}/{examResult.total}</span>
                      <span className="text-xl text-muted-foreground tabular-nums">{examResult.percentage.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <FileText className="h-5 w-5" />
                      Question Review
                    </div>
                    {examResult.questions.map((question, idx) => {
                      const isShortAnswer = question.type === 'ShortAnswer'
                      const isCorrect = question.isCorrect
                      return (
                        <div
                          key={question.id}
                          className={`rounded-xl border-2 p-4 ${
                            isShortAnswer
                              ? 'border-amber-500/40 bg-amber-500/5'
                              : isCorrect
                                ? 'border-green-500/50 bg-green-500/5'
                                : 'border-red-500/50 bg-red-500/5'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="font-semibold text-base">
                              {idx + 1}. {question.prompt}
                            </div>
                            {isShortAnswer ? (
                              <span className="text-xs font-medium px-2 py-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
                                Short answer · Graded by instructor
                              </span>
                            ) : (
                              <div className={`text-sm font-medium px-2 py-1 rounded shrink-0 ${
                                isCorrect ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'
                              }`}>
                                {isCorrect ? (
                                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3" /> Correct</span>
                                ) : (
                                  <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3" /> Incorrect</span>
                                )}
                              </div>
                            )}
                          </div>
                          {isShortAnswer ? (
                            <div className="rounded-lg border border-border bg-background p-3 mt-2">
                              <div className="text-xs font-medium text-muted-foreground mb-1">Your answer</div>
                              <div className="text-sm">{question.userAnswerText ?? '—'}</div>
                            </div>
                          ) : (
                            <div className="space-y-2 mt-2">
                              {question.choices.map((choice, ci) => {
                                const isUserAnswer = ci === question.userAnswerIndex
                                const isCorrectChoice = ci === question.correctAnswerIndex
                                return (
                                  <div
                                    key={ci}
                                    className={`p-3 rounded-lg border-2 ${
                                      isCorrectChoice ? 'border-green-500 bg-green-500/10' : isUserAnswer && !isCorrect ? 'border-red-500 bg-red-500/10' : 'border-border bg-muted/30'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{choice}</span>
                                      {isCorrectChoice && <span className="text-xs font-semibold text-green-700 dark:text-green-400">(Correct)</span>}
                                      {isUserAnswer && !isCorrectChoice && <span className="text-xs font-semibold text-red-700 dark:text-red-400">(Your answer)</span>}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          <div className="mt-2 text-sm text-muted-foreground">
                            Points: {question.points} {!isShortAnswer && (isCorrect ? '(Earned)' : '(Not earned)')}
                            {isShortAnswer && '(Instructor graded)'}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => {
                      setMode(summaryFrom === 'score' ? 'score' : 'details')
                      setExamResult(null)
                    }}>
                      Back
                    </Button>
                    <Button variant="outline" onClick={() => setOpenId(null)}>Close</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatSeconds(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
