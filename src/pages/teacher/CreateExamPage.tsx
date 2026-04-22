import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Switch } from '../../components/ui/switch'
import {
  SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Save,
  ArrowLeft,
  Loader2,
  PlusCircle,
  Trash2,
  GripVertical,
} from 'lucide-react'
import { examService, type CreateExamRequest, type CreateExamQuestionRequest } from '../../services/examService'
import { teacherService } from '../../services/teacherService'
import type { CourseDto } from '../../services/courseService'
import { useTranslation } from 'react-i18next'

type QuestionTypeValue = 'MultipleChoice' | 'TrueFalse' | 'ShortAnswer'

const defaultQuestion = (order: number): CreateExamQuestionRequest => ({
  prompt: '',
  type: 'MultipleChoice',
  choices: ['', ''],
  answerIndex: 0,
  points: 1,
  order,
})

/** Format an ISO date string for datetime-local input (local time YYYY-MM-DDTHH:mm) */
function toLocalDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

export function CreateExamPage() {
  const { t } = useTranslation(['teacher', 'common', 'errors'])
  const QUESTION_TYPES: { value: QuestionTypeValue; label: string }[] = [
    { value: 'MultipleChoice', label: t('teacher:createExam.questionTypes.multipleChoice') },
    { value: 'TrueFalse', label: t('teacher:createExam.questionTypes.trueFalse') },
    { value: 'ShortAnswer', label: t('teacher:createExam.questionTypes.shortAnswer') },
  ]
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlCourseId = searchParams.get('courseId') ?? ''
  const [loading, setLoading] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [courses, setCourses] = useState<CourseDto[]>([])
  const [courseId, setCourseId] = useState(urlCourseId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [allowRetake, setAllowRetake] = useState(false)
  const [maxAttempts, setMaxAttempts] = useState<number | undefined>(undefined)
  const [questions, setQuestions] = useState<CreateExamQuestionRequest[]>([
    defaultQuestion(0),
  ])

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true)
        const result = await teacherService.getMyCourses({ pageSize: 1000 })
        setCourses(result.items)
        const validUrlCourse = urlCourseId && result.items.some((c) => c.id === urlCourseId)
        setCourseId(validUrlCourse ? urlCourseId : result.items[0]?.id ?? '')
      } catch (error) {
        toast.error(t('teacher:createAssignment.errors.coursesFailed'), {
          description: error instanceof Error ? error.message : t('teacher:shared.tryAgainLater'),
        })
      } finally {
        setLoadingCourses(false)
      }
    }
    loadCourses()
  }, [urlCourseId])

  const updateQuestion = (index: number, patch: Partial<CreateExamQuestionRequest>) => {
    setQuestions((prev) => {
      const next = [...prev]
      const q = { ...next[index], ...patch }
      if (q.type === 'TrueFalse') {
        q.choices = ['True', 'False']
        q.answerIndex = Math.min(q.answerIndex, 1)
      }
      if (q.type === 'ShortAnswer') {
        q.choices = []
        q.answerIndex = 0
      }
      next[index] = q
      return next.map((x, i) => ({ ...x, order: i }))
    })
  }

  const setQuestionChoice = (qIndex: number, choiceIndex: number, value: string) => {
    setQuestions((prev) => {
      const next = prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              choices: q.choices.map((c, j) => (j === choiceIndex ? value : c)),
            }
          : q
      )
      return next.map((x, i) => ({ ...x, order: i }))
    })
  }

  const addQuestionChoice = (qIndex: number) => {
    setQuestions((prev) => {
      const next = prev.map((q, i) =>
        i === qIndex ? { ...q, choices: [...q.choices, ''] } : q
      )
      return next.map((x, i) => ({ ...x, order: i }))
    })
  }

  const removeQuestionChoice = (qIndex: number, choiceIndex: number) => {
    setQuestions((prev) => {
      const next = prev.map((q, i) => {
        if (i !== qIndex) return q
        const choices = q.choices.filter((_, j) => j !== choiceIndex)
        const answerIndex = Math.min(q.answerIndex, Math.max(0, choices.length - 1))
        return { ...q, choices, answerIndex }
      })
      return next.map((x, i) => ({ ...x, order: i }))
    })
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev.map((x, i) => ({ ...x, order: i })), defaultQuestion(prev.length)])
  }

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error(t('teacher:createExam.errors.atLeastOneQuestion'))
      return
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index).map((x, i) => ({ ...x, order: i })))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!courseId) {
      toast.error(t('teacher:createAssignment.errors.selectCourse'))
      return
    }
    if (!title.trim()) {
      toast.error(t('teacher:createExam.errors.titleRequired'))
      return
    }
    if (!startsAt) {
      toast.error(t('teacher:createExam.errors.startRequired'))
      return
    }
    if (durationMinutes < 1) {
      toast.error(t('teacher:createExam.errors.durationMinimum'))
      return
    }

    const validQuestions = questions.filter((q) => q.prompt.trim())
    if (validQuestions.length === 0) {
      toast.error(t('teacher:createExam.errors.addOneWithPrompt'))
      return
    }

    for (let i = 0; i < validQuestions.length; i++) {
      const q = validQuestions[i]
      if (q.type === 'MultipleChoice' && q.choices.some((c) => !c.trim())) {
        toast.error(t('teacher:createExam.errors.choicesFilled', { n: i + 1 }))
        return
      }
      if (q.type !== 'ShortAnswer' && q.type !== 'MultipleChoice' && q.type !== 'TrueFalse') {
        toast.error(t('teacher:createExam.errors.unknownType', { n: i + 1 }))
        return
      }
      if (q.points < 0) {
        toast.error(t('teacher:createExam.errors.pointsNegative', { n: i + 1 }))
        return
      }
    }

    setLoading(true)
    try {
      const request: CreateExamRequest = {
        courseId,
        title: title.trim(),
        description: description.trim() || undefined,
        startsAt: new Date(startsAt).toISOString(),
        durationMinutes,
        allowRetake,
        maxAttempts: maxAttempts ?? undefined,
        questions: validQuestions.map((q) => ({
          ...q,
          choices:
            q.type === 'TrueFalse'
              ? ['True', 'False']
              : q.type === 'ShortAnswer'
                ? []
                : q.choices.map((c) => c.trim()).filter(Boolean),
          answerIndex: q.type === 'ShortAnswer' ? 0 : q.answerIndex,
        })),
      }
      await examService.createExam(request)
      toast.success(t('teacher:createExam.toasts.created'), {
        description: t('teacher:createExam.toasts.createdDescription'),
      })
      navigate('/teacher/exams')
    } catch (error) {
      toast.error(t('teacher:createExam.errors.createFailed'), {
        description: error instanceof Error ? error.message : t('teacher:shared.tryAgainLater'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/exams')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">{t('teacher:createExam.pageTitle')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('teacher:createExam.pageSubtitle')}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">{t('teacher:createExam.examInfo')}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{t('teacher:createExam.examInfoDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="course">{t('teacher:createAssignment.courseRequired')}</Label>
                  <SelectRoot
                    value={courseId}
                    onValueChange={setCourseId}
                    disabled={loadingCourses}
                  >
                    <SelectTrigger id="course">
                      <SelectValue placeholder={loadingCourses ? t('teacher:createAssignment.loadingCourses') : t('teacher:createAssignment.selectCourse')} />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="title">{t('teacher:createExam.examTitleRequired')}</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('teacher:createExam.examTitlePlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">{t('teacher:createExam.descriptionOptional')}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('teacher:createExam.descriptionPlaceholder')}
                    rows={3}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="startsAt">{t('teacher:createExam.startDateTimeRequired')}</Label>
                    <Input
                      id="startsAt"
                      type="datetime-local"
                      value={startsAt ? toLocalDatetimeLocal(startsAt) : ''}
                      onChange={(e) =>
                        setStartsAt(e.target.value ? new Date(e.target.value).toISOString() : '')
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="duration">{t('teacher:createExam.durationRequired')}</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 30)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{t('teacher:createExam.questions')}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {t('teacher:exams.questionsCount', { count: questions.length })}
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                    <PlusCircle className="h-4 w-4 me-2" />
                    {t('teacher:createExam.addQuestion')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {questions.map((q, qIndex) => (
                  <motion.div
                    key={qIndex}
                    layout
                    className="rounded-lg border bg-muted/30 p-4 space-y-3"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-2 text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-muted-foreground">{t('teacher:createExam.questionN', { n: qIndex + 1 })}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(qIndex)}
                            disabled={questions.length <= 1}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 me-1" />
                            {t('teacher:createExam.remove')}
                          </Button>
                        </div>

                        <div className="space-y-1.5">
                          <Label>{t('teacher:createExam.questionTextRequired')}</Label>
                          <Textarea
                            value={q.prompt}
                            onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                            placeholder={t('teacher:createExam.questionTextPlaceholder')}
                            rows={2}
                            className="resize-none"
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label>{t('teacher:createExam.type')}</Label>
                            <SelectRoot
                              value={q.type}
                              onValueChange={(value) =>
                                updateQuestion(qIndex, {
                                  type: value as 'MultipleChoice' | 'TrueFalse' | 'ShortAnswer',
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {QUESTION_TYPES.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </SelectRoot>
                          </div>
                          <div className="space-y-1.5">
                            <Label>{t('teacher:createExam.points')}</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.5}
                              value={q.points}
                              onChange={(e) =>
                                updateQuestion(qIndex, { points: parseFloat(e.target.value) || 1 })
                              }
                            />
                          </div>
                        </div>

                        {q.type === 'MultipleChoice' && (
                          <div className="space-y-2">
                            <Label>{t('teacher:createExam.choices')}</Label>
                            <div className="space-y-2">
                              {q.choices.map((choice, cIndex) => (
                                <div key={cIndex} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`q-${qIndex}-correct`}
                                    checked={q.answerIndex === cIndex}
                                    onChange={() => updateQuestion(qIndex, { answerIndex: cIndex })}
                                    className="rounded-full border-input"
                                  />
                                  <Input
                                    value={choice}
                                    onChange={(e) => setQuestionChoice(qIndex, cIndex, e.target.value)}
                                    placeholder={t('teacher:createExam.choicePlaceholder', { n: cIndex + 1 })}
                                    className="flex-1"
                                  />
                                  {q.choices.length > 2 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeQuestionChoice(qIndex, cIndex)}
                                      className="text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addQuestionChoice(qIndex)}
                              >
                                <PlusCircle className="h-3 w-3 me-1" />
                                {t('teacher:createExam.addChoice')}
                              </Button>
                            </div>
                          </div>
                        )}

                        {q.type === 'TrueFalse' && (
                          <div className="space-y-2">
                            <Label>{t('teacher:createExam.correctAnswer')}</Label>
                            <SelectRoot
                              value={String(q.answerIndex)}
                              onValueChange={(v) => updateQuestion(qIndex, { answerIndex: parseInt(v, 10) })}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">{t('teacher:createExam.trueLabel')}</SelectItem>
                                <SelectItem value="1">{t('teacher:createExam.falseLabel')}</SelectItem>
                              </SelectContent>
                            </SelectRoot>
                          </div>
                        )}

                        {q.type === 'ShortAnswer' && (
                          <p className="text-xs text-muted-foreground rounded-md bg-muted/50 p-2">
                            {t('teacher:createExam.shortAnswerHint')}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">{t('teacher:createAssignment.settings')}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{t('teacher:createExam.attemptsAndRetakes')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowRetake">{t('teacher:createExam.allowRetake')}</Label>
                    <p className="text-xs text-muted-foreground">{t('teacher:createExam.allowRetakeHint')}</p>
                  </div>
                  <Switch
                    id="allowRetake"
                    checked={allowRetake}
                    onCheckedChange={setAllowRetake}
                  />
                </div>
                {allowRetake && (
                  <div className="space-y-1.5">
                    <Label htmlFor="maxAttempts">{t('teacher:createExam.maxAttemptsOptional')}</Label>
                    <Input
                      id="maxAttempts"
                      type="number"
                      min={1}
                      placeholder={t('teacher:discounts.unlimited')}
                      value={maxAttempts ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        setMaxAttempts(v === '' ? undefined : parseInt(v, 10) || undefined)
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <Button
                    type="submit"
                    variant="gradient"
                    className="w-full"
                    disabled={loading || loadingCourses}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        {t('common:creating')}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 me-2" />
                        {t('teacher:exams.createExam')}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => navigate('/teacher/exams')}
                    disabled={loading}
                  >
                    {t('common:cancel')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </motion.div>
  )
}
