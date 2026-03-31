import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { 
  Video, 
  PlusCircle, 
  Edit, 
  Trash2, 
  Eye,
  EyeOff,
  Clock,
  ArrowLeft,
  Loader2,
  FileText,
  Upload,
  Star,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { courseService, type CourseDto, type CourseSectionDto } from '../../services/courseService'
import { lessonService, type LessonDto } from '../../services/lessonService'
import { courseExtrasService, type CourseMaterialDto, type LessonRatingSummaryDto, type MeetingTimeRatingSummaryDto } from '../../services/courseExtrasService'
import { fileService } from '../../services/fileService'
import { formatMeetingSlot } from '../../lib/meetingTimeFormat'

export function CourseLessonsManagementPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<CourseDto | null>(null)
  const [sections, setSections] = useState<CourseSectionDto[]>([])
  const [lessons, setLessons] = useState<LessonDto[]>([])
  const [selectedSection, setSelectedSection] = useState<string>('')
  const [editingLesson, setEditingLesson] = useState<LessonDto | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [materials, setMaterials] = useState<CourseMaterialDto[]>([])
  const [lessonRatingSummaries, setLessonRatingSummaries] = useState<LessonRatingSummaryDto[]>([])
  const [meetingRatingSummaries, setMeetingRatingSummaries] = useState<MeetingTimeRatingSummaryDto[]>([])
  const [allCourseLessons, setAllCourseLessons] = useState<LessonDto[]>([])
  const [materialTitle, setMaterialTitle] = useState('')
  const [materialLessonId, setMaterialLessonId] = useState<string>('')
  const [materialKind, setMaterialKind] = useState<0 | 1>(0)
  const [materialFile, setMaterialFile] = useState<File | null>(null)
  const [materialsBusy, setMaterialsBusy] = useState(false)

  useEffect(() => {
    const loadCourse = async () => {
      if (!id) {
        toast.error('Course ID is required')
        navigate('/teacher/courses')
        return
      }

      try {
        setLoadingCourse(true)
        const courseData = await courseService.getCourseById(id)
        setCourse(courseData)
        setSections(courseData.sections || [])

        const [courseLessonsFlat, mats, lr, mr] = await Promise.all([
          lessonService.getCourseLessons(id).catch(() => [] as LessonDto[]),
          courseExtrasService.getMaterials(id).catch(() => [] as CourseMaterialDto[]),
          courseExtrasService.getLessonRatingSummaries(id).catch(() => [] as LessonRatingSummaryDto[]),
          courseExtrasService.getMeetingTimeRatingSummaries(id).catch(() => [] as MeetingTimeRatingSummaryDto[]),
        ])
        setAllCourseLessons([...courseLessonsFlat].sort((a, b) => a.order - b.order))
        setMaterials(mats)
        setLessonRatingSummaries(lr)
        setMeetingRatingSummaries(mr)
        
        // Load lessons for all sections
        if (courseData.sections && courseData.sections.length > 0) {
          const allLessons: LessonDto[] = []
          for (const section of courseData.sections) {
            try {
              const sectionLessons = await lessonService.getSectionLessons(section.id)
              allLessons.push(...sectionLessons)
            } catch (error) {
              console.error(`Failed to load lessons for section ${section.id}:`, error)
            }
          }
          setLessons(allLessons)
          if (courseData.sections.length > 0) {
            setSelectedSection(courseData.sections[0].id)
          }
        }
      } catch (error) {
        toast.error('Failed to load course', {
          description: error instanceof Error ? error.message : 'Please try again later',
        })
        navigate('/teacher/courses')
      } finally {
        setLoadingCourse(false)
      }
    }

    loadCourse()
  }, [id, navigate])

  const refreshMaterialsAndRatings = async () => {
    if (!id) return
    try {
      const [mats, lr, mr] = await Promise.all([
        courseExtrasService.getMaterials(id),
        courseExtrasService.getLessonRatingSummaries(id),
        courseExtrasService.getMeetingTimeRatingSummaries(id),
      ])
      setMaterials(mats)
      setLessonRatingSummaries(lr)
      setMeetingRatingSummaries(mr)
    } catch {
      /* ignore */
    }
  }

  const handleAddMaterial = async () => {
    if (!id || !materialTitle.trim() || !materialFile) {
      toast.error('Add a title and choose a file')
      return
    }
    try {
      setMaterialsBusy(true)
      const up = await fileService.uploadFile(materialFile, 'course-materials')
      await courseExtrasService.createMaterial(id, {
        title: materialTitle.trim(),
        fileUrl: up.fileUrl,
        fileName: up.fileName,
        fileSizeBytes: up.fileSize,
        sortOrder: materials.length,
        kind: materialKind,
        lessonId: materialLessonId || null,
      })
      toast.success('Material added')
      setMaterialTitle('')
      setMaterialFile(null)
      setMaterialLessonId('')
      await refreshMaterialsAndRatings()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add material')
    } finally {
      setMaterialsBusy(false)
    }
  }

  const handleDeleteMaterial = async (materialId: string) => {
    if (!id) return
    try {
      setMaterialsBusy(true)
      await courseExtrasService.deleteMaterial(id, materialId)
      toast.success('Material removed')
      await refreshMaterialsAndRatings()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setMaterialsBusy(false)
    }
  }

  const loadLessons = async (sectionId: string) => {
    try {
      setLoading(true)
      const sectionLessons = await lessonService.getSectionLessons(sectionId)
      setLessons(sectionLessons)
    } catch (error) {
      toast.error('Failed to load lessons', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedSection) {
      loadLessons(selectedSection)
    }
  }, [selectedSection])

  const handleAddLesson = async () => {
    if (!selectedSection || !id) {
      toast.error('Please select a section first')
      return
    }

    try {
      setLoading(true)
      const newLesson = await lessonService.createLesson({
        courseId: id,
        sectionId: selectedSection,
        title: 'New Lesson',
        description: '',
        videoUrl: '',
        durationMinutes: 0,
        order: lessons.length + 1,
        isPreview: false,
      })
      toast.success('Lesson created')
      await loadLessons(selectedSection)
      setEditingLesson(newLesson)
      setShowAddForm(false)
    } catch (error) {
      toast.error('Failed to create lesson', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveLesson = async () => {
    if (!editingLesson) return

    try {
      setLoading(true)
      await lessonService.updateLesson(editingLesson.id, {
        title: editingLesson.title,
        description: editingLesson.description,
        videoUrl: editingLesson.videoUrl,
        durationMinutes: editingLesson.durationMinutes || 0,
        order: editingLesson.order,
        isPreview: editingLesson.isPreview,
      })
      toast.success('Lesson updated')
      setEditingLesson(null)
      await loadLessons(selectedSection)
    } catch (error) {
      toast.error('Failed to update lesson', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return

    try {
      setLoading(true)
      await lessonService.deleteLesson(lessonId)
      toast.success('Lesson deleted')
      await loadLessons(selectedSection)
    } catch (error) {
      toast.error('Failed to delete lesson', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleVisibility = async (lesson: LessonDto) => {
    try {
      setLoading(true)
      await lessonService.updateLesson(lesson.id, {
        title: lesson.title,
        description: lesson.description,
        videoUrl: lesson.videoUrl,
        durationMinutes: lesson.durationMinutes ?? 0,
        order: lesson.order,
        isPreview: !lesson.isPreview,
        sectionId: lesson.sectionId ?? undefined,
      })
      toast.success(`Lesson ${lesson.isPreview ? 'hidden' : 'made preview'}`)
      await loadLessons(selectedSection)
    } catch (error) {
      toast.error('Failed to update lesson', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loadingCourse) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Course not found</p>
        <Button onClick={() => navigate('/teacher/courses')} className="mt-4">
          Back to Courses
        </Button>
      </div>
    )
  }

  const filteredLessons = lessons.filter(l => l.sectionId === selectedSection)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/courses')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">Manage Lessons</h1>
            <p className="mt-1 text-sm text-muted-foreground">{course.title}</p>
          </div>
        </div>
        <Button onClick={handleAddLesson} disabled={!selectedSection || loading}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Lesson
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Course materials
          </CardTitle>
          <CardDescription className="text-xs">
            Upload files or add book links for the whole course or a specific lesson.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                placeholder="e.g. Week 3 slides"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Attach to lesson (optional)</label>
              <SelectRoot value={materialLessonId || '__course__'} onValueChange={(v) => setMaterialLessonId(v === '__course__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Whole course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__course__">Whole course</SelectItem>
                  {allCourseLessons.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Kind</label>
              <SelectRoot value={String(materialKind)} onValueChange={(v) => setMaterialKind(Number(v) as 0 | 1)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">File</SelectItem>
                  <SelectItem value="1">Book / link</SelectItem>
                </SelectContent>
              </SelectRoot>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">File</label>
              <Input
                type="file"
                onChange={(e) => setMaterialFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <Button type="button" onClick={handleAddMaterial} disabled={materialsBusy}>
            {materialsBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Add material
          </Button>
          {materials.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              {materials.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.kind === 1 ? 'Book' : 'File'}
                      {m.lessonTitle ? ` · ${m.lessonTitle}` : ' · Whole course'}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteMaterial(m.id)}
                    disabled={materialsBusy}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5" />
            Ratings overview
          </CardTitle>
          <CardDescription className="text-xs">Averages from student feedback (read-only).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {lessonRatingSummaries.length === 0 && meetingRatingSummaries.length === 0 ? (
            <p className="text-muted-foreground">No ratings yet.</p>
          ) : (
            <>
              {lessonRatingSummaries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Lessons</p>
                  <ul className="space-y-1">
                    {lessonRatingSummaries.map((r) => (
                      <li key={r.lessonId} className="flex justify-between gap-2">
                        <span className="truncate">{r.lessonTitle}</span>
                        <span className="text-muted-foreground shrink-0">
                          {r.ratingCount > 0 ? `${r.averageRating.toFixed(1)} (${r.ratingCount})` : '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {meetingRatingSummaries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Sessions</p>
                  <ul className="space-y-1">
                    {meetingRatingSummaries.map((r) => (
                      <li key={r.sectionMeetingTimeId} className="flex justify-between gap-2">
                        <span className="line-clamp-2">
                          {r.sectionName} — {formatMeetingSlot(r.day, r.startMinutes, r.endMinutes)}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {r.ratingCount > 0 ? `${r.averageRating.toFixed(1)} (${r.ratingCount})` : '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Section Selector */}
      {sections.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Section</label>
              <SelectRoot value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lessons List */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Lessons</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {filteredLessons.length} lesson{filteredLessons.length !== 1 ? 's' : ''} in this section
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading lessons...</div>
          ) : filteredLessons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No lessons in this section. Click "Add Lesson" to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Video className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="font-medium">{lesson.title}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {lesson.durationMinutes || 0} min
                        {lesson.isPreview && (
                          <Badge variant="secondary" className="text-xs">Preview</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleVisibility(lesson)}
                      title={lesson.isPreview ? 'Hide from preview' : 'Make preview'}
                    >
                      {lesson.isPreview ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingLesson(lesson)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteLesson(lesson.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Lesson Dialog */}
      <Dialog open={!!editingLesson} onOpenChange={(open) => !open && setEditingLesson(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
            <DialogDescription>Update lesson details</DialogDescription>
          </DialogHeader>
          {editingLesson && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={editingLesson.title}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editingLesson.description || ''}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Video URL *</label>
                <Input
                  value={editingLesson.videoUrl || ''}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, videoUrl: e.target.value })
                  }
                  placeholder="YouTube, Vimeo, Zoom, or direct video URL"
                />
                <p className="text-xs text-muted-foreground">
                  Supports: YouTube, Vimeo, Zoom recordings, Google Drive, Loom, Wistia, or direct MP4/WebM links
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Duration (minutes) *</label>
                  <Input
                    type="number"
                    min="0"
                    value={editingLesson.durationMinutes || 0}
                    onChange={(e) =>
                      setEditingLesson({
                        ...editingLesson,
                        durationMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Order</label>
                  <Input
                    type="number"
                    min="0"
                    value={editingLesson.order}
                    onChange={(e) =>
                      setEditingLesson({
                        ...editingLesson,
                        order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <label className="text-sm font-medium">Preview Lesson</label>
                  <p className="text-xs text-muted-foreground">
                    Make this lesson available for free preview
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={editingLesson.isPreview}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, isPreview: e.target.checked })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingLesson(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveLesson} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
