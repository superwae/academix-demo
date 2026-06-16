import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { AlertCircle, ArrowLeft, CalendarClock, CheckCircle2, ExternalLink, Loader2, Save } from 'lucide-react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { fileService } from '../../services/fileService'
import { cn } from '../../lib/cn'
import {
  assignmentService,
  type AssignmentDto,
  type AssignmentSubmissionDto,
} from '../../services/assignmentService'
import { useTranslation } from 'react-i18next'

/** Stable string for number inputs; avoids floating-point noise after save/reload. */
function formatScoreInput(n: number): string {
  if (!Number.isFinite(n)) return ''
  return String(Math.round(n * 100) / 100)
}

export function TeacherAssignmentGradePage() {
  const { t } = useTranslation(['teacher', 'common', 'errors'])
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const [assignment, setAssignment] = useState<AssignmentDto | null>(null)
  const [submissions, setSubmissions] = useState<AssignmentSubmissionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [scores, setScores] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rowStatus, setRowStatus] = useState<
    Record<string, { variant: 'success' | 'error'; message: string } | null>
  >({})

  const clearRowStatus = (submissionId: string) => {
    setRowStatus((prev) => {
      if (prev[submissionId] == null) return prev
      return { ...prev, [submissionId]: null }
    })
  }

  useEffect(() => {
    if (!assignmentId) return

    const load = async () => {
      try {
        setLoading(true)
        setLoadError(null)
        const [a, subs] = await Promise.all([
          assignmentService.getAssignmentById(assignmentId),
          assignmentService.getSubmissions(assignmentId, { pageSize: 500 }),
        ])
        setAssignment(a)
        const items = subs.items
        setSubmissions(items)
        const sc: Record<string, string> = {}
        const fb: Record<string, string> = {}
        items.forEach((s) => {
          const forInput =
            s.instructorScore != null
              ? s.instructorScore
              : s.score != null
                ? s.score
                : null
          sc[s.id] = forInput != null ? formatScoreInput(forInput) : ''
          fb[s.id] = s.feedback ?? ''
        })
        setScores(sc)
        setFeedback(fb)
        setRowStatus({})
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : t('teacher:assignmentGrade.errors.loadFailed'))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [assignmentId])

  const maxScore = assignment ? Number(assignment.maxScore) : 100

  const saveGrade = async (submissionId: string) => {
    if (!assignmentId) return
    const raw = scores[submissionId]?.trim()
    if (raw === '' || raw === undefined) {
      setRowStatus((p) => ({
        ...p,
        [submissionId]: { variant: 'error', message: t('teacher:assignmentGrade.errors.enterScore') },
      }))
      return
    }
    const num = parseFloat(raw)
    if (Number.isNaN(num) || num < 0 || num > maxScore) {
      setRowStatus((p) => ({
        ...p,
        [submissionId]: { variant: 'error', message: t('teacher:assignmentGrade.errors.scoreRange', { max: maxScore }) },
      }))
      return
    }

    setSavingId(submissionId)
    setRowStatus((p) => ({ ...p, [submissionId]: null }))
    try {
      const updated = await assignmentService.gradeSubmission(submissionId, {
        score: num,
        feedback: feedback[submissionId]?.trim() || undefined,
      })
      setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? updated : s)))
      const keepRaw =
        updated.instructorScore != null ? updated.instructorScore : num
      setScores((p) => ({ ...p, [submissionId]: formatScoreInput(keepRaw) }))
      setFeedback((p) => ({ ...p, [submissionId]: updated.feedback ?? '' }))
      const row = submissions.find((x) => x.id === submissionId)
      const isLateRow = updated.isLate ?? row?.isLate ?? false
      const final =
        updated.score != null
          ? formatScoreInput(Number(updated.score))
          : formatScoreInput(
              Math.max(
                0,
                num -
                  (assignment?.latePenaltyPercent != null &&
                  isLateRow &&
                  assignment.latePenaltyPercent > 0
                    ? num * (assignment.latePenaltyPercent / 100)
                    : 0),
              ),
            )
      const pen = assignment?.latePenaltyPercent
      const successMsg =
        isLateRow && pen != null && pen > 0
          ? t('teacher:assignmentGrade.savedLate', { final, max: maxScore, pen })
          : t('teacher:assignmentGrade.saved', { final, max: maxScore })
      setRowStatus((p) => ({
        ...p,
        [submissionId]: { variant: 'success', message: successMsg },
      }))
    } catch (err) {
      setRowStatus((p) => ({
        ...p,
        [submissionId]: {
          variant: 'error',
          message: err instanceof Error ? err.message : t('teacher:assignmentGrade.errors.saveFailed'),
        },
      }))
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (loadError || !assignment) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/teacher/assignments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">{t('teacher:assignmentGrade.pageTitle')}</h1>
        </div>
        <div
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive flex gap-3"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{loadError ?? t('teacher:assignmentGrade.errors.loadFailed')}</p>
        </div>
      </div>
    )
  }

  let dueLabel = assignment.dueAt
  try {
    dueLabel = format(new Date(assignment.dueAt), 'PPP p')
  } catch {
    /* keep raw */
  }

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
            <h1 className="text-2xl font-bold tracking-tight">{t('teacher:assignmentGrade.pageTitle')}</h1>
            <p className="text-sm text-muted-foreground">
              {assignment.courseTitle} · {assignment.title}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to={`/teacher/assignments/${assignmentId}/submissions`}>{t('teacher:assignmentGrade.viewSummary')}</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-3 text-sm text-muted-foreground items-center">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            <span>
              <span className="font-medium text-foreground">{t('teacher:assignmentGrade.dueLabel')}</span> {dueLabel}
            </span>
          </div>
          <span>
            <span className="font-medium text-foreground">{t('teacher:assignmentGrade.maxScoreLabel')}</span> {maxScore}
          </span>
          {assignment.latePenaltyPercent != null && assignment.latePenaltyPercent > 0 ? (
            <Badge variant="secondary">{t('teacher:assignmentGrade.latePenaltyBadge', { pen: assignment.latePenaltyPercent })}</Badge>
          ) : null}
        </CardContent>
      </Card>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            {t('teacher:assignmentGrade.noSubmissions')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{s.userName}</CardTitle>
                    <CardDescription>
                      {t('teacher:assignmentGrade.submittedLabel')}{' '}
                      {(() => {
                        try {
                          return format(new Date(s.submittedAt), 'PP p')
                        } catch {
                          return s.submittedAt
                        }
                      })()}
                      {s.isLate ? (
                        <Badge variant="destructive" className="ms-2 text-[10px]">
                          {t('teacher:assignmentGrade.late')}
                        </Badge>
                      ) : null}
                    </CardDescription>
                  </div>
                  {s.gradedAt ? (
                    <Badge variant="outline" className="text-xs">
                      {t('teacher:assignmentGrade.lastGraded')}{' '}
                      {(() => {
                        try {
                          return format(new Date(s.gradedAt), 'PP')
                        } catch {
                          return ''
                        }
                      })()}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-3 space-y-2 text-sm max-h-[min(50vh,320px)] overflow-y-auto">
                  {s.text ? (
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">{s.text}</p>
                  ) : (
                    <p className="text-muted-foreground italic">{t('teacher:assignmentGrade.noWrittenAnswer')}</p>
                  )}
                  {s.fileUrl ? (
                    <button
                      type="button"
                      onClick={() => fileService.openProtectedFile(s.fileUrl!).catch(() => toast.error(t('teacher:assignmentGrade.openAttachment')))}
                      className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {s.fileName || t('teacher:assignmentGrade.openAttachment')}
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-[140px_1fr_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor={`score-${s.id}`}>{t('teacher:assignmentGrade.scoreRange', { max: maxScore })}</Label>
                    <Input
                      id={`score-${s.id}`}
                      type="number"
                      min={0}
                      max={maxScore}
                      step="any"
                      value={scores[s.id] ?? ''}
                      onChange={(e) => {
                        clearRowStatus(s.id)
                        setScores((p) => ({ ...p, [s.id]: e.target.value }))
                      }}
                    />
                    {s.isLate &&
                    assignment.latePenaltyPercent != null &&
                    assignment.latePenaltyPercent > 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('teacher:assignmentGrade.studentRecord')}{' '}
                        {(() => {
                          const v = parseFloat(scores[s.id] ?? '')
                          if (Number.isNaN(v)) return '—'
                          const pen = v * (assignment.latePenaltyPercent / 100)
                          return formatScoreInput(Math.max(0, v - pen))
                        })()}{' '}
                        {t('teacher:assignmentGrade.outOfAfterPenalty', { max: maxScore, pen: assignment.latePenaltyPercent })}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor={`fb-${s.id}`}>{t('teacher:assignmentGrade.feedbackOptional')}</Label>
                    <Textarea
                      id={`fb-${s.id}`}
                      rows={3}
                      value={feedback[s.id] ?? ''}
                      onChange={(e) => {
                        clearRowStatus(s.id)
                        setFeedback((p) => ({ ...p, [s.id]: e.target.value }))
                      }}
                      placeholder={t('teacher:assignmentGrade.feedbackPlaceholder')}
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end sm:justify-end sm:min-w-[min(100%,260px)]">
                    <Button
                      type="button"
                      variant="gradient"
                      className="w-full sm:w-auto shrink-0"
                      disabled={savingId === s.id}
                      onClick={() => saveGrade(s.id)}
                    >
                      {savingId === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 me-2" />
                          {t('teacher:assignmentGrade.saveGrade')}
                        </>
                      )}
                    </Button>
                    {rowStatus[s.id] ? (
                      <div
                        role="status"
                        aria-live="polite"
                        className={cn(
                          'w-full rounded-lg border px-3 py-2 text-xs leading-relaxed sm:max-w-[300px]',
                          rowStatus[s.id]!.variant === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-slate-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-zinc-200'
                            : 'border-destructive/40 bg-destructive/10 text-destructive',
                        )}
                      >
                        <span className="flex items-start gap-2">
                          {rowStatus[s.id]!.variant === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-400" />
                          ) : (
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          )}
                          <span className="text-slate-900 dark:text-zinc-200">{rowStatus[s.id]!.message}</span>
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  )
}
