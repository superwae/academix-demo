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
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import { useTranslation } from 'react-i18next'

export function CourseLessonsManagementPage() {
  const { t } = useTranslation(['teacher', 'common', 'errors'])
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
  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null)

  useEffect(() => {
    const loadCourse = async () => {
      if (!id) {
        toast.error(t('teacher:courseStudents.errors.idRequired'))
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
        toast.error(t('teacher:courseLessonsManagement.errors.loadFailed'), {
          description: error instanceof Error ? error.message : t('teacher:shared.tryAgainLater'),
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
      toast.error(t('teacher:courseLessonsManagement.errors.materialTitleAndFile'))
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
      toast.success(t('teacher:courseLessonsManagement.toasts.materialAdded'))
      setMaterialTitle('')
      setMaterialFile(null)
      setMaterialLessonId('')
      await refreshMaterialsAndRatings()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('teacher:courseLessonsManagement.errors.materialAddFailed'))
    } finally {
      setMaterialsBusy(false)
    }
  }

  const handleDeleteMaterial = async (materialId: string) => {
    if (!id) return
    try {
      setMaterialsBusy(true)
      await courseExtrasService.deleteMaterial(id, materialId)
      toast.success(t('teacher:courseLessonsManagement.toasts.materialRemoved'))
      await refreshMaterialsAndRatings()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('teacher:courseLessonsManagement.errors.deleteFailed'))
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
      toast.error(t('teacher:courseLessonsManagement.errors.lessonsLoadFailed'), {
        description: error instanceof Error ? error.message : t('teacher:shared.tryAgainLater'),
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
      toast.error(t('teacher:courseLessonsManagement.errors.selectSectionFirst'))
      return
    }

    try {
      setLoading(true)
      const newLesson = await lessonService.createLesson({
        courseId: id,
        sectionId: selectedSection,
        title: t('teacher:courseLessonsManagement.newLessonDefaultTitle'),
        description: '',
        videoUrl: '',
        durationMinutes: 0,
        order: lessons.length + 1,
        isPreview: false,
      })
      toast.success(t('teacher:courseLessonsManagement.toasts.lessonCreated'))
      await loadLessons(selectedSection)
      setEditingLesson(newLesson)
      setShowAddForm(false)
    } catch (error) {
      toast.error(t('teacher:courseLessonsManagement.errors.createFailed'), {
        description: error instanceof Error ? error.message : t('teacher:shared.tryAgainLater'),
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
      toast.success(t('teacher:courseLessonsManagement.toasts.lessonUpdated'))
      setEditingLesson(null)
      await loadLessons(selectedSection)
    } catch (error) {
      toast.error(t('teacher:courseLessonsManagement.errors.updateFailed'), {
        description: error instanceof Error ? error.message : t('teacher:shared.tryAgainLater'),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      setLoading(true)
      await lessonService.deleteLesson(lessonId)
      toast.success(t('teacher:courseLessonsManagement.toasts.lessonDeleted'))
      await loadLessons(selectedSection)
    } catch (error) {
      toast.error(t('teacher:courseLessonsManagement.errors.deleteLessonFailed'), {
        description: error instanceof Error ? error.message : t('teacher:shared.tryAgainLater'),
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
      toast.success(lesson.isPreview ? t('teacher:courseLessonsManagement.toasts.lessonHidden') : t('teacher:courseLessonsManagement.toasts.lessonMadePreview'))
      await loadLessons(selectedSection)
    } catch (error) {
      toast.error(t('teacher:courseLessonsManagement.errors.updateFailed'), {
        description: error instanceof Error ? error.message : t('teacher:shared.tryAgainLater'),
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
        <p className="text-muted-foreground">{t('teacher:courseStudents.notFound')}</p>
        <Button onClick={() => navigate('/teacher/courses')} className="mt-4">
          {t('teacher:courseStudents.backToCourses')}
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/courses')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight gradient-text">{t('teacher:courseLessonsManagement.pageTitle')}</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">{course.title}</p>
          </div>
        </div>
        <Button className="w-full sm:w-auto" onClick={handleAddLesson} disabled={!selectedSection || loading}>
          <PlusCircle className="h-4 w-4 me-2" />
          {t('teacher:courseLessonsManagement.addLesson')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('teacher:courseLessonsManagement.courseMaterials')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('teacher:courseLessonsManagement.courseMaterialsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">{t('teacher:courseLessonsManagement.titleField')}</label>
              <Input
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                placeholder={t('teacher:courseLessonsManagement.materialTitlePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('teacher:courseLessonsManagement.attachToLesson')}</label>
              <SelectRoot value={materialLessonId || '__course__'} onValueChange={(v) => setMaterialLessonId(v === '__course__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('teacher:courseLessonsManagement.wholeCourse')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__course__">{t('teacher:courseLessonsManagement.wholeCourse')}</SelectItem>
                  {allCourseLessons.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('teacher:courseLessonsManagement.kind')}</label>
              <SelectRoot value={String(materialKind)} onValueChange={(v) => setMaterialKind(Number(v) as 0 | 1)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t('teacher:courseLessonsManagement.kindFile')}</SelectItem>
                  <SelectItem value="1">{t('teacher:courseLessonsManagement.kindBookLink')}</SelectItem>
                </SelectContent>
              </SelectRoot>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium">{t('teacher:courseLessonsManagement.file')}</label>
              <Input
                type="file"
                onChange={(e) => setMaterialFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <Button type="button" onClick={handleAddMaterial} disabled={materialsBusy}>
            {materialsBusy ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Upload className="h-4 w-4 me-2" />}
            {t('teacher:courseLessonsManagement.addMaterial')}
          </Button>
          {materials.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              {materials.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col gap-2 p-2 rounded-md border text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.kind === 1 ? t('teacher:courseLessonsManagement.book') : t('teacher:courseLessonsManagement.fileLabel')}
                      {m.lessonTitle ? ` · ${m.lessonTitle}` : ` · ${t('teacher:courseLessonsManagement.wholeCourse')}`}
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
            {t('teacher:courseLessonsManagement.ratingsOverview')}
          </CardTitle>
          <CardDescription className="text-xs">{t('teacher:courseLessonsManagement.ratingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {lessonRatingSummaries.length === 0 && meetingRatingSummaries.length === 0 ? (
            <p className="text-muted-foreground">{t('teacher:courseLessonsManagement.noRatings')}</p>
          ) : (
            <>
              {lessonRatingSummaries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">{t('teacher:courseLessonsManagement.lessonsLabel')}</p>
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
                  <p className="text-xs font-medium text-muted-foreground uppercase">{t('teacher:courseLessonsManagement.sessionsLabel')}</p>
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
              <label className="text-sm font-medium">{t('teacher:courseLessonsManagement.section')}</label>
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
          <CardTitle className="text-lg">{t('teacher:courseLessonsManagement.lessons')}</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {t('teacher:courseLessonsManagement.lessonCountInSection', { count: filteredLessons.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t('teacher:courseLessonsManagement.loadingLessons')}</div>
          ) : filteredLessons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('teacher:courseLessonsManagement.noLessonsInSection')}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex flex-col gap-3 p-3 border rounded-lg hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3 flex-1">
                    <Video className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{lesson.title}</div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {t('teacher:courseLessonsManagement.minutes', { count: lesson.durationMinutes || 0 })}
                        {lesson.isPreview && (
                          <Badge variant="secondary" className="text-xs">{t('teacher:courseLessonsManagement.preview')}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleVisibility(lesson)}
                      title={lesson.isPreview ? t('teacher:courseLessonsManagement.hideFromPreview') : t('teacher:courseLessonsManagement.makePreview')}
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
                      onClick={() => setDeleteLessonId(lesson.id)}
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
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('teacher:courseLessonsManagement.editLesson')}</DialogTitle>
            <DialogDescription>{t('teacher:courseLessonsManagement.updateLessonDetails')}</DialogDescription>
          </DialogHeader>
          {editingLesson && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('teacher:courseLessonsManagement.titleRequired')}</label>
                <Input
                  value={editingLesson.title}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('teacher:courseLessonsManagement.description')}</label>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editingLesson.description || ''}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('teacher:courseLessonsManagement.videoUrlRequired')}</label>
                <Input
                  value={editingLesson.videoUrl || ''}
                  onChange={(e) =>
                    setEditingLesson({ ...editingLesson, videoUrl: e.target.value })
                  }
                  placeholder={t('teacher:courseLessonsManagement.videoUrlPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">
                  {t('teacher:courseLessonsManagement.videoUrlHint')}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('teacher:courseLessonsManagement.durationRequired')}</label>
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
                  <label className="text-sm font-medium">{t('teacher:courseLessonsManagement.order')}</label>
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
                  <label className="text-sm font-medium">{t('teacher:courseLessonsManagement.previewLesson')}</label>
                  <p className="text-xs text-muted-foreground">
                    {t('teacher:courseLessonsManagement.previewLessonHint')}
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
                  {t('common:cancel')}
                </Button>
                <Button onClick={handleSaveLesson} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      {t('common:saving')}
                    </>
                  ) : (
                    t('teacher:courseLessonsManagement.saveChanges')
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteLessonId !== null}
        onOpenChange={(open) => { if (!open) setDeleteLessonId(null) }}
        title={t('teacher:courseLessonsManagement.deleteLesson')}
        description={t('teacher:courseLessonsManagement.deleteLessonConfirm')}
        confirmLabel={t('common:delete')}
        variant="destructive"
        onConfirm={() => {
          if (deleteLessonId) return handleDeleteLesson(deleteLessonId)
        }}
      />
    </motion.div>
  )
}
