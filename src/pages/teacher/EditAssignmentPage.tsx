import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { Save, ArrowLeft, Loader2 } from 'lucide-react'
import { assignmentService, type UpdateAssignmentRequest } from '../../services/assignmentService'
import { teacherService } from '../../services/teacherService'
import type { CourseDto } from '../../services/courseService'

export function EditAssignmentPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [courses, setCourses] = useState<CourseDto[]>([])
  const [courseId, setCourseId] = useState('')
  const [title, setTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [maxScore, setMaxScore] = useState(100)
  const [weight, setWeight] = useState(1)
  const [allowLateSubmission, setAllowLateSubmission] = useState(false)
  const [latePenaltyPercent, setLatePenaltyPercent] = useState(0)

  useEffect(() => {
    if (!assignmentId) {
      toast.error('Missing assignment id')
      navigate('/teacher/assignments')
      return
    }

    const load = async () => {
      try {
        setLoadingData(true)
        const [coursesResult, assignment] = await Promise.all([
          teacherService.getMyCourses({ pageSize: 1000 }),
          assignmentService.getAssignmentById(assignmentId),
        ])
        setCourses(coursesResult.items)
        setCourseId(assignment.courseId)
        setTitle(assignment.title)
        setPrompt(assignment.prompt)
        setDueAt(assignment.dueAt ? new Date(assignment.dueAt).toISOString() : '')
        setMaxScore(Number(assignment.maxScore) || 100)
        setWeight(Number(assignment.weight) || 1)
        setAllowLateSubmission(assignment.allowLateSubmission)
        setLatePenaltyPercent(assignment.latePenaltyPercent ?? 0)
      } catch (error) {
        toast.error('Failed to load assignment', {
          description: error instanceof Error ? error.message : undefined,
        })
        navigate('/teacher/assignments')
      } finally {
        setLoadingData(false)
      }
    }

    load()
  }, [assignmentId, navigate])

  const buildUpdatePayload = (status?: string): UpdateAssignmentRequest => ({
    title,
    prompt,
    dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
    maxScore,
    weight,
    allowLateSubmission,
    latePenaltyPercent,
    ...(status ? { status } : {}),
  })

  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean) => {
    e.preventDefault()
    if (!assignmentId) return

    if (!title.trim()) {
      toast.error('Assignment title is required')
      return
    }
    if (!prompt.trim()) {
      toast.error('Assignment prompt is required')
      return
    }
    if (!dueAt) {
      toast.error('Due date is required')
      return
    }

    setLoading(true)
    try {
      await assignmentService.updateAssignment(
        assignmentId,
        buildUpdatePayload(saveAsDraft ? 'Draft' : 'Published'),
      )
      toast.success(saveAsDraft ? 'Draft saved' : 'Assignment published', {
        description: saveAsDraft
          ? 'Changes saved. Publish when ready for students.'
          : 'Students enrolled in this course can see this assignment.',
      })
      navigate('/teacher/assignments')
    } catch (error) {
      toast.error('Failed to save assignment', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/assignments')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">Edit Assignment</h1>
            <p className="mt-1 text-sm text-muted-foreground">Update details or publish for students</p>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">Assignment Information</CardTitle>
                <CardDescription className="text-xs mt-0.5">Basic details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="course">Course</Label>
                  <SelectRoot value={courseId} onValueChange={setCourseId} disabled>
                    <SelectTrigger id="course">
                      <SelectValue placeholder="Course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                  <p className="text-xs text-muted-foreground">Course cannot be changed after creation.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="title">Assignment Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prompt">Assignment Prompt / Description *</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={8}
                    required
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="dueAt">Due Date *</Label>
                    <Input
                      id="dueAt"
                      type="datetime-local"
                      value={dueAt ? new Date(dueAt).toISOString().slice(0, 16) : ''}
                      onChange={(e) => {
                        const v = e.target.value
                        setDueAt(v ? new Date(v).toISOString() : '')
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="maxScore">Max Score</Label>
                    <Input
                      id="maxScore"
                      type="number"
                      min="1"
                      value={maxScore}
                      onChange={(e) => setMaxScore(parseInt(e.target.value, 10) || 100)}
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="weight">Weight</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(parseFloat(e.target.value) || 1)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowLate">Allow Late Submission</Label>
                  <Switch
                    id="allowLate"
                    checked={allowLateSubmission}
                    onCheckedChange={setAllowLateSubmission}
                  />
                </div>
                {allowLateSubmission && (
                  <div className="space-y-1.5">
                    <Label htmlFor="latePenalty">Late Penalty (%)</Label>
                    <Input
                      id="latePenalty"
                      type="number"
                      min="0"
                      max="100"
                      value={latePenaltyPercent}
                      onChange={(e) => setLatePenaltyPercent(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Publish (visible to students)'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => navigate('/teacher/assignments')}
                    disabled={loading}
                  >
                    Cancel
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
