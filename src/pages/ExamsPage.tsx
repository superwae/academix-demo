import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useAppStore } from '../store/useAppStore'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { toast } from 'sonner'

type RunningExam = {
  examId: string
  startedAt: string
  secondsLeft: number
  answers: Record<string, number>
}

export function ExamsPage() {
  const { exams, courses, examQuestionsByExamId, examAttempts } = useAppStore((s) => s.data)
  const addAttempt = useAppStore((s) => s.addExamAttempt)

  const [openId, setOpenId] = useState<string | null>(null)
  const open = useMemo(() => exams.find((e) => e.id === openId) ?? null, [exams, openId])
  const openCourse = useMemo(() => (open ? courses.find((c) => c.id === open.courseId) : undefined), [open, courses])
  const questions = useMemo(() => (open ? examQuestionsByExamId[open.id] ?? [] : []), [open, examQuestionsByExamId])

  const [mode, setMode] = useState<'details' | 'running' | 'score'>('details')
  const [running, setRunning] = useState<RunningExam | null>(null)
  const [score, setScore] = useState<{ score: number; total: number } | null>(null)

  // tick timer while running
  useEffect(() => {
    if (!running) return
    const t = window.setInterval(() => {
      setRunning((r) => {
        if (!r) return r
        const next = Math.max(0, r.secondsLeft - 1)
        return { ...r, secondsLeft: next }
      })
    }, 1000)
    return () => window.clearInterval(t)
  }, [running?.examId])

  // auto-submit on timeout
  useEffect(() => {
    if (!running || !open) return
    if (running.secondsLeft > 0) return
    submitExam(open.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running?.secondsLeft])

  function startExam(examId: string, durationMin: number) {
    setMode('running')
    setScore(null)
    setRunning({
      examId,
      startedAt: new Date().toISOString(),
      secondsLeft: durationMin * 60,
      answers: {},
    })
    toast.message('Exam started', { description: 'Demo timer is running.' })
  }

  function submitExam(examId: string) {
    const exam = exams.find((e) => e.id === examId)
    if (!exam || !running) return
    const qs = examQuestionsByExamId[examId] ?? []
    let correct = 0
    for (const q of qs) {
      if (running.answers[q.id] === q.answerIndex) correct++
    }
    const total = qs.length
    addAttempt({
      examId,
      startedAt: running.startedAt,
      submittedAt: new Date().toISOString(),
      score: correct,
      total,
    })
    setRunning(null)
    setScore({ score: correct, total })
    setMode('score')
    toast.success('Exam submitted', { description: `Score: ${correct}/${total}` })
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Exams</div>
        <div className="text-sm text-muted-foreground">Start a timed demo exam (frontend-only)</div>
      </div>

      {exams.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-6">
          <div className="text-sm font-medium">No exams yet</div>
          <div className="mt-1 text-sm text-muted-foreground">You’re all caught up.</div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {exams
            .slice()
            .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
            .map((e) => {
              const course = courses.find((c) => c.id === e.courseId)
              const lastAttempt = examAttempts
                .filter((x) => x.examId === e.id)
                .slice()
                .sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt))[0]
              return (
                <Card key={e.id}>
                  <CardHeader>
                    <CardTitle>{e.title}</CardTitle>
                    <CardDescription>{course?.title ?? 'Course'}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Starts {format(new Date(e.startsAt), 'MMM d, p')}</Badge>
                      <Badge variant="subtle">{e.durationMin} min</Badge>
                    </div>
                    {lastAttempt && (
                      <div className="text-xs text-muted-foreground">
                        Last attempt: {lastAttempt.score}/{lastAttempt.total}
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
                      }}
                    >
                      Details
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
        </div>
      )}

      <Dialog
        open={!!open}
        onOpenChange={(o) => {
          if (!o) {
            setOpenId(null)
            setRunning(null)
            setScore(null)
            setMode('details')
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.title}</DialogTitle>
                <DialogDescription>
                  {openCourse?.title} • {open.durationMin} min
                </DialogDescription>
              </DialogHeader>

              {mode === 'details' && (
                <div className="mt-4 space-y-3">
                  <div className="text-sm text-muted-foreground">
                    This is a demo exam with {questions.length} MCQs and a simple timer. Your score will be saved in localStorage.
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => startExam(open.id, open.durationMin)}>Start Exam</Button>
                  </div>
                </div>
              )}

              {mode === 'running' && running && (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between rounded-md border border-border bg-background p-3 text-sm">
                    <div className="font-medium">Time left</div>
                    <div className="tabular-nums">{formatSeconds(running.secondsLeft)}</div>
                  </div>

                  <div className="space-y-3">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="rounded-md border border-border bg-card p-4">
                        <div className="text-sm font-medium">
                          {idx + 1}. {q.prompt}
                        </div>
                        <div className="mt-3 grid gap-2">
                          {q.choices.map((choice, ci) => (
                            <label
                              key={choice}
                              className="flex cursor-pointer items-start gap-3 rounded-md border border-border px-3 py-2 hover:bg-accent/40"
                            >
                              <input
                                type="radio"
                                name={q.id}
                                className="mt-1"
                                checked={running.answers[q.id] === ci}
                                onChange={() =>
                                  setRunning((r) =>
                                    r ? { ...r, answers: { ...r.answers, [q.id]: ci } } : r,
                                  )
                                }
                              />
                              <div className="text-sm">{choice}</div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenId(null)}>
                      Exit
                    </Button>
                    <Button onClick={() => submitExam(open.id)}>Submit</Button>
                  </div>
                </div>
              )}

              {mode === 'score' && score && (
                <div className="mt-4 space-y-3">
                  <div className="rounded-md border border-border bg-background p-4">
                    <div className="text-sm text-muted-foreground">Score</div>
                    <div className="text-3xl font-semibold">
                      {score.score}/{score.total}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Saved to your exam attempts (localStorage).
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpenId(null)}>
                      Close
                    </Button>
                    <Button onClick={() => startExam(open.id, open.durationMin)}>Retry</Button>
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


