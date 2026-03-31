import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { assignmentService, type CreateAssignmentRequest } from '../../services/assignmentService'
import { teacherService } from '../../services/teacherService'
import type { CourseDto } from '../../services/courseService'

export function CreateAssignmentPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [courses, setCourses] = useState<CourseDto[]>([])
  const [formData, setFormData] = useState<CreateAssignmentRequest>({
    courseId: '',
    title: '',
    prompt: '',
    dueAt: '',
    maxScore: 100,
    weight: 1,
    allowLateSubmission: false,
    latePenaltyPercent: 0,
    status: 'Draft',
  })

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoadingCourses(true)
        const result = await teacherService.getMyCourses({ pageSize: 1000 })
        setCourses(result.items)
        if (result.items.length > 0) {
          setFormData(prev => ({ ...prev, courseId: result.items[0].id }))
        }
      } catch (error) {
        toast.error('Failed to load courses', {
          description: error instanceof Error ? error.message : 'Please try again later',
        })
      } finally {
        setLoadingCourses(false)
      }
    }

    loadCourses()
  }, [])

  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean) => {
    e.preventDefault()
    
    if (!formData.courseId) {
      toast.error('Please select a course')
      return
    }

    if (!formData.title.trim()) {
      toast.error('Assignment title is required')
      return
    }

    if (!formData.prompt.trim()) {
      toast.error('Assignment prompt/description is required')
      return
    }

    if (!formData.dueAt) {
      toast.error('Due date is required')
      return
    }

    setLoading(true)

    try {
      const request: CreateAssignmentRequest = {
        ...formData,
        status: saveAsDraft ? 'Draft' : 'Published',
      }

      await assignmentService.createAssignment(request)
      
      toast.success(saveAsDraft ? 'Assignment saved as draft' : 'Assignment published successfully', {
        description: saveAsDraft
          ? 'Use Edit or Publish on the assignments list when you are ready.'
          : 'Your assignment is now visible to students',
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/assignments')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">Create Assignment</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create a new assignment for your course</p>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-3">
            {/* Assignment Info */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">Assignment Information</CardTitle>
                <CardDescription className="text-xs mt-0.5">Basic details about your assignment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="course">Course *</Label>
                  <SelectRoot
                    value={formData.courseId}
                    onValueChange={(value) => setFormData({ ...formData, courseId: value })}
                    disabled={loadingCourses}
                  >
                    <SelectTrigger id="course">
                      <SelectValue placeholder={loadingCourses ? "Loading courses..." : "Select a course"} />
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
                  <Label htmlFor="title">Assignment Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., S3 Bucket Creation and Management"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prompt">Assignment Prompt / Description *</Label>
                  <Textarea
                    id="prompt"
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    placeholder="Describe what students need to do for this assignment..."
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
                      value={formData.dueAt ? new Date(formData.dueAt).toISOString().slice(0, 16) : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value).toISOString() : ''
                        setFormData({ ...formData, dueAt: date })
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
                      value={formData.maxScore}
                      onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) || 100 })}
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
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">Settings</CardTitle>
                <CardDescription className="text-xs mt-0.5">Assignment configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowLate">Allow Late Submission</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow students to submit after due date
                    </p>
                  </div>
                  <Switch
                    id="allowLate"
                    checked={formData.allowLateSubmission}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, allowLateSubmission: checked })
                    }
                  />
                </div>

                {formData.allowLateSubmission && (
                  <div className="space-y-1.5">
                    <Label htmlFor="latePenalty">Late Penalty (%)</Label>
                    <Input
                      id="latePenalty"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.latePenaltyPercent || 0}
                      onChange={(e) => setFormData({ ...formData, latePenaltyPercent: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
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
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      'Publish Assignment'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={loading || loadingCourses}
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
