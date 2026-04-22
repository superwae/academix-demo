import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
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
import { Save, ArrowLeft, Loader2, Upload, X, Trash2, Plus, MapPin, Edit, Calendar, Link as LinkIcon } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { courseService, type CourseDto, type CourseSectionDto } from '../../services/courseService'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { countWords, MAX_CERTIFICATE_WORDS } from '../../lib/certificateText'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import { useTranslation } from 'react-i18next'

export function EditCoursePage() {
  const { t } = useTranslation(['teacher', 'common', 'errors'])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Show success toast passed via navigation state (e.g. from Start New Batch)
  useEffect(() => {
    const state = location.state as { successMessage?: string } | null
    if (state?.successMessage) {
      toast.success(state.successMessage)
      // Clear the state so the toast doesn't reappear on refresh/back nav
      window.history.replaceState({}, '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [loading, setLoading] = useState(false)
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSectionsDialog, setShowSectionsDialog] = useState(false)
  const [addingSection, setAddingSection] = useState(false)
  const [editingSection, setEditingSection] = useState<{
    id?: string
    name: string
    locationLabel: string
    joinUrl: string
    maxSeats: number
    meetingTimes: { day: string; startTime: string; endTime: string }[]
  } | null>(null)
  const [sectionsSaving, setSectionsSaving] = useState(false)
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null)
  const [course, setCourse] = useState<CourseDto | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'Beginner',
    modality: 'Online',
    price: '',
    tags: [] as string[],
    tagInput: '',
    thumbnailUrl: '',
    enrollmentLimit: '',
    certificateEnabled: false,
    certificateSummary: '',
    certificateDisplayHours: '',
    publish: false,
    expectedDurationHours: '',
    courseStartDate: '',
    courseEndDate: '',
  })

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
        setFormData({
          title: courseData.title,
          description: courseData.description || '',
          category: courseData.category || '',
          level: courseData.level || 'Beginner',
          modality: courseData.modality || 'Online',
          price: courseData.price?.toString() || '',
          tags: courseData.tags || [],
          tagInput: '',
          thumbnailUrl: courseData.thumbnailUrl || '',
          enrollmentLimit: courseData.enrollmentLimit?.toString() || '',
          certificateEnabled: courseData.issueCertificates ?? courseData.certificateEnabled ?? false,
          certificateSummary: courseData.certificateSummary ?? '',
          certificateDisplayHours:
            courseData.certificateDisplayHours != null ? String(courseData.certificateDisplayHours) : '',
          publish: courseData.status === 'Published',
          expectedDurationHours:
            courseData.expectedDurationHours != null ? String(courseData.expectedDurationHours) : '',
          courseStartDate: courseData.courseStartDate ? courseData.courseStartDate.slice(0, 10) : '',
          courseEndDate: courseData.courseEndDate ? courseData.courseEndDate.slice(0, 10) : '',
        })
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

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('teacher:createCoursePage.errors.selectImage'))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('teacher:createCoursePage.errors.imageTooLarge'))
      return
    }

    try {
      setUploadingImage(true)
      
      // Convert to base64 for preview and storage
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setFormData({ ...formData, thumbnailUrl: base64String })
        toast.success(t('teacher:createCoursePage.toasts.imageUploaded'))
        setUploadingImage(false)
      }
      reader.onerror = () => {
        toast.error(t('teacher:createCoursePage.errors.readImage'))
        setUploadingImage(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error(t('teacher:createCoursePage.errors.processImage'), {
        description: error instanceof Error ? error.message : t('teacher:shared.pleaseTryAgain'),
      })
      setUploadingImage(false)
    }
  }

  const sectionPresets = [
    { name: 'Online', locationLabel: t('teacher:createCoursePage.sectionPresets.online') },
    { name: 'In-site', locationLabel: t('teacher:createCoursePage.sectionPresets.inSite') },
    { name: 'Hybrid', locationLabel: t('teacher:createCoursePage.sectionPresets.hybrid') },
    { name: 'Section 1', locationLabel: t('teacher:createCoursePage.sectionPresets.section1') },
    { name: 'Section 2', locationLabel: t('teacher:createCoursePage.sectionPresets.section2') },
    { name: 'Section 3', locationLabel: t('teacher:createCoursePage.sectionPresets.section3') },
    { name: 'Section 4', locationLabel: t('teacher:createCoursePage.sectionPresets.section4') },
  ]

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return (hours || 0) * 60 + (minutes || 0)
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  const openSectionsDialog = () => {
    setShowSectionsDialog(true)
    setEditingSection(null)
  }

  const handleAddSectionForm = () => {
    setEditingSection({
      name: '',
      locationLabel: '',
      joinUrl: '',
      maxSeats: 30,
      meetingTimes: [],
    })
  }

  const handleAddSectionPreset = async (preset: { name: string; locationLabel: string }) => {
    if (!id || !course) return
    if (course.sections?.some((s) => s.name === preset.name)) return
    setAddingSection(true)
    try {
      await courseService.addSection(id, {
        name: preset.name,
        locationLabel: preset.locationLabel,
        maxSeats: 999,
      })
      const updated = await courseService.getCourseById(id)
      setCourse(updated)
      toast.success(t('teacher:editCoursePage.toasts.sectionAdded', { name: preset.name }))
    } catch (error) {
      toast.error(t('teacher:editCoursePage.errors.addSectionFailed'), {
        description: error instanceof Error ? error.message : t('teacher:shared.pleaseTryAgain'),
      })
    } finally {
      setAddingSection(false)
    }
  }

  const handleEditSection = (section: CourseSectionDto) => {
    setEditingSection({
      id: section.id,
      name: section.name,
      locationLabel: section.locationLabel,
      joinUrl: section.joinUrl || '',
      maxSeats: section.maxSeats,
      meetingTimes:
        section.meetingTimes?.length > 0
          ? section.meetingTimes.map((mt) => ({
              day: mt.day,
              startTime: minutesToTime(mt.startMinutes),
              endTime: minutesToTime(mt.endMinutes),
            }))
          : [],
    })
  }

  const addMeetingTime = () => {
    if (!editingSection) return
    setEditingSection({
      ...editingSection,
      meetingTimes: [
        ...editingSection.meetingTimes,
        { day: 'Monday', startTime: '09:00', endTime: '10:00' },
      ],
    })
  }

  const removeMeetingTime = (index: number) => {
    if (!editingSection) return
    setEditingSection({
      ...editingSection,
      meetingTimes: editingSection.meetingTimes.filter((_, i) => i !== index),
    })
  }

  const updateMeetingTime = (
    index: number,
    updates: Partial<{ day: string; startTime: string; endTime: string }>
  ) => {
    if (!editingSection) return
    const newMeetingTimes = [...editingSection.meetingTimes]
    newMeetingTimes[index] = { ...newMeetingTimes[index], ...updates }
    setEditingSection({ ...editingSection, meetingTimes: newMeetingTimes })
  }

  const handleSaveSection = async () => {
    if (!id || !course || !editingSection) return
    if (!editingSection.name.trim() || !editingSection.locationLabel.trim()) {
      toast.error(t('teacher:editCoursePage.errors.sectionNameLocationRequired'))
      return
    }
    if (editingSection.maxSeats < 1) {
      toast.error(t('teacher:teacherMyCourses.errors.maxSeatsAtLeastOne'))
      return
    }
    setSectionsSaving(true)
    try {
      const meetingTimes = editingSection.meetingTimes
        .filter((mt) => mt.startTime && mt.endTime && timeToMinutes(mt.startTime) < timeToMinutes(mt.endTime))
        .map((mt) => ({
          day: mt.day,
          startMinutes: timeToMinutes(mt.startTime),
          endMinutes: timeToMinutes(mt.endTime),
        }))

      const request = {
        name: editingSection.name.trim(),
        locationLabel: editingSection.locationLabel.trim(),
        joinUrl: editingSection.joinUrl?.trim() || undefined,
        maxSeats: editingSection.maxSeats,
        meetingTimes,
      }

      if (editingSection.id) {
        await courseService.updateSection(id, editingSection.id, request)
        toast.success(t('teacher:teacherMyCourses.toasts.sectionUpdated'))
      } else {
        await courseService.addSection(id, request)
        toast.success(t('teacher:teacherMyCourses.toasts.sectionCreated'))
      }
      const updated = await courseService.getCourseById(id)
      setCourse(updated)
      setEditingSection(null)
    } catch (error) {
      toast.error(t('teacher:teacherMyCourses.errors.saveSectionFailed'), {
        description: error instanceof Error ? error.message : t('teacher:shared.pleaseTryAgain'),
      })
    } finally {
      setSectionsSaving(false)
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!id) return
    setSectionsSaving(true)
    try {
      await courseService.deleteSection(id, sectionId)
      const updated = await courseService.getCourseById(id)
      setCourse(updated)
      setEditingSection(null)
      toast.success(t('teacher:teacherMyCourses.toasts.sectionDeleted'))
    } catch (error) {
      toast.error(t('teacher:teacherMyCourses.errors.deleteSectionFailed'), {
        description: error instanceof Error ? error.message : t('teacher:shared.pleaseTryAgain'),
      })
    } finally {
      setSectionsSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean) => {
    e.preventDefault()
    if (!id || !course) return

    setLoading(true)

    try {
      const start = formData.courseStartDate
      const end = formData.courseEndDate
      if (start && end && end < start) {
        toast.error(t('teacher:createCoursePage.errors.endBeforeStart'))
        setLoading(false)
        return
      }

      if (formData.certificateEnabled && countWords(formData.certificateSummary) > MAX_CERTIFICATE_WORDS) {
        toast.error(t('teacher:createCoursePage.errors.certificateWordLimit', { max: MAX_CERTIFICATE_WORDS }))
        setLoading(false)
        return
      }

      const certDisplayHoursParsed =
        formData.certificateDisplayHours.trim() === ''
          ? null
          : parseFloat(formData.certificateDisplayHours)
      if (
        certDisplayHoursParsed !== null &&
        (Number.isNaN(certDisplayHoursParsed) || certDisplayHoursParsed < 0)
      ) {
        toast.error(t('teacher:createCoursePage.errors.certificateHoursInvalid'))
        setLoading(false)
        return
      }

      const dateInputToUtcIso = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number)
        return new Date(Date.UTC(y, m - 1, d)).toISOString()
      }

      await courseService.updateCourse(id, {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        level: formData.level,
        modality: formData.modality,
        price: formData.price ? parseFloat(formData.price) : undefined,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        tags: formData.tags,
        expectedDurationHours: formData.expectedDurationHours
          ? parseFloat(formData.expectedDurationHours)
          : undefined,
        courseStartDate: start ? dateInputToUtcIso(start) : undefined,
        courseEndDate: end ? dateInputToUtcIso(end) : undefined,
        certificate: {
          issueCertificates: formData.certificateEnabled,
          summary: formData.certificateSummary.trim() || null,
          displayHours: certDisplayHoursParsed,
        },
      })

      // If publishing, update status
      if (!saveAsDraft && formData.publish) {
        await courseService.publishCourse(id)
      }
      
      toast.success(saveAsDraft ? t('teacher:editCoursePage.toasts.updated') : t('teacher:createCoursePage.toasts.published'), {
        description: saveAsDraft
          ? t('teacher:editCoursePage.toasts.updatedDescription')
          : t('teacher:createCoursePage.toasts.publishedDescription'),
      })

      navigate('/teacher/courses')
    } catch (error) {
      toast.error(t('teacher:editCoursePage.errors.updateFailed'), {
        description: error instanceof Error ? error.message : t('teacher:shared.tryAgainLater'),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return

    setDeleting(true)

    try {
      await courseService.deleteCourse(id)
      toast.success(t('teacher:editCoursePage.toasts.deleted'), {
        description: t('teacher:editCoursePage.toasts.deletedDescription'),
      })
      navigate('/teacher/courses')
    } catch (error) {
      console.error('Delete course error:', error)
      const errorMessage = error instanceof Error ? error.message : t('teacher:shared.tryAgainLater')
      console.error('Error message:', errorMessage)

      // Show error in toast and also alert for detailed debug info
      toast.error(t('teacher:editCoursePage.errors.deleteFailed'), {
        description: errorMessage,
        duration: 10000, // Show for 10 seconds to read debug info
      })
      
      // Also log to console with full details
      if (errorMessage.includes('Debug Info:')) {
        console.error('=== DELETE COURSE DEBUG INFO ===')
        console.error(errorMessage)
        console.error('=== END DEBUG INFO ===')
      }
      
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
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
            <h1 className="text-3xl font-bold tracking-tight gradient-text">{t('teacher:editCoursePage.pageTitle')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('teacher:editCoursePage.pageSubtitle')}</p>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-3">
            {/* Course Info */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">{t('teacher:createCoursePage.courseInfo')}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{t('teacher:createCoursePage.courseInfoDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="title">{t('teacher:createCoursePage.courseTitleRequired')}</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t('teacher:editCoursePage.courseTitlePlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">{t('teacher:courseLessonsManagement.description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('teacher:editCoursePage.descriptionPlaceholder')}
                    rows={6}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="category">{t('teacher:createCoursePage.categoryRequired')}</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder={t('teacher:editCoursePage.categoryPlaceholder')}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="level">{t('teacher:createCoursePage.levelRequired')}</Label>
                    <SelectRoot value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">{t('teacher:createCoursePage.levels.beginner')}</SelectItem>
                        <SelectItem value="Intermediate">{t('teacher:createCoursePage.levels.intermediate')}</SelectItem>
                        <SelectItem value="Advanced">{t('teacher:createCoursePage.levels.advanced')}</SelectItem>
                      </SelectContent>
                    </SelectRoot>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modality">{t('teacher:createCoursePage.modalityRequired')}</Label>
                  <SelectRoot value={formData.modality} onValueChange={(value) => setFormData({ ...formData, modality: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Online">{t('teacher:createCoursePage.modalities.online')}</SelectItem>
                      <SelectItem value="In-Person">{t('teacher:editCoursePage.inPerson')}</SelectItem>
                      <SelectItem value="Hybrid">{t('teacher:createCoursePage.modalities.hybrid')}</SelectItem>
                    </SelectContent>
                  </SelectRoot>
                </div>

                <div className="space-y-1.5">
                  <Label>{t('teacher:createCoursePage.tagsMax5')}</Label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) })}
                          className="hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {formData.tags.length < 5 && (
                      <div className="flex gap-1">
                        <Input
                          value={formData.tagInput}
                          onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
                          placeholder={t('teacher:createCoursePage.addTagPlaceholder')}
                          className="w-32"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const tag = formData.tagInput.trim()
                              if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
                                setFormData({ ...formData, tags: [...formData.tags, tag], tagInput: '' })
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const tag = formData.tagInput.trim()
                            if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
                              setFormData({ ...formData, tags: [...formData.tags, tag], tagInput: '' })
                            } else if (formData.tags.length >= 5) {
                              toast.error(t('teacher:createCoursePage.errors.maxTags'))
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('teacher:createCoursePage.tagsCount', { count: formData.tags.length })}</p>
                </div>
              </CardContent>
            </Card>

            {/* Media */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">{t('teacher:createCoursePage.courseMedia')}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{t('teacher:createCoursePage.uploadCover')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-2">
                  {formData.thumbnailUrl ? (
                    <div className="relative">
                      <img
                        src={formData.thumbnailUrl}
                        alt={t('teacher:createCoursePage.thumbnailAlt')}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 end-2"
                        onClick={() => setFormData({ ...formData, thumbnailUrl: '' })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('teacher:createCoursePage.uploadCover')}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleFileSelect}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? t('teacher:createCoursePage.uploading') : t('teacher:createCoursePage.chooseFile')}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('teacher:createCoursePage.imageFormatHint')}
                      </p>
                    </div>
                  )}
                  {formData.thumbnailUrl && (
                    <div className="space-y-1.5">
                      <Label htmlFor="thumbnailUrl">{t('teacher:editCoursePage.orEnterUrl')}</Label>
                      <Input
                        id="thumbnailUrl"
                        value={formData.thumbnailUrl}
                        onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sections - same system as Manage Course Sections */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">{t('teacher:createCourse.sectionsTitle')}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {t('teacher:editCoursePage.sectionsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="flex flex-wrap gap-2">
                  {sectionPresets.map((preset) => {
                    const exists = course.sections?.some((s) => s.name === preset.name)
                    return (
                      <Button
                        key={preset.name}
                        type="button"
                        variant={exists ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleAddSectionPreset(preset)}
                        disabled={exists || addingSection}
                      >
                        <Plus className="h-3.5 w-3.5 me-1" />
                        {preset.name}
                      </Button>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('teacher:editCoursePage.currentSections', { count: course.sections?.length ?? 0 })}
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={openSectionsDialog}>
                    <Calendar className="h-3.5 w-3.5 me-1" />
                    {t('teacher:teacherMyCourses.manageSections')}
                  </Button>
                </div>
                {course.sections && course.sections.length > 0 && (
                  <ul className="space-y-2">
                    {course.sections.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                      >
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <strong>{s.name}</strong>
                        <span className="text-muted-foreground">— {s.locationLabel}</span>
                        {s.seatsRemaining != null && (
                          <span className="text-xs text-muted-foreground ms-auto">
                            {t('teacher:editCoursePage.seatsLeftShort', { count: s.seatsRemaining })}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">{t('teacher:editCoursePage.scheduleAndWorkload')}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {t('teacher:editCoursePage.scheduleAndWorkloadHint')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="expectedHours">{t('teacher:createCoursePage.expectedHoursTotal')}</Label>
                  <Input
                    id="expectedHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.expectedDurationHours}
                    onChange={(e) => setFormData({ ...formData, expectedDurationHours: e.target.value })}
                    placeholder={t('teacher:createCoursePage.expectedHoursPlaceholder')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="courseStartEdit">{t('teacher:createCoursePage.courseStart')}</Label>
                  <Input
                    id="courseStartEdit"
                    type="date"
                    value={formData.courseStartDate}
                    onChange={(e) => setFormData({ ...formData, courseStartDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="courseEndEdit">{t('teacher:createCoursePage.courseEnd')}</Label>
                  <Input
                    id="courseEndEdit"
                    type="date"
                    value={formData.courseEndDate}
                    onChange={(e) => setFormData({ ...formData, courseEndDate: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">{t('teacher:editCoursePage.pricing')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="price">{t('teacher:createCourse.priceLabel')}</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">{t('teacher:createAssignment.settings')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('teacher:createCoursePage.certificateEnabled')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('teacher:editCoursePage.certificateEnabledHint')}
                    </p>
                  </div>
                  <Switch
                    checked={formData.certificateEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, certificateEnabled: checked })}
                  />
                </div>

                {formData.certificateEnabled && (
                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="certSummaryEdit">{t('teacher:createCoursePage.certificateSummary')}</Label>
                      <div className="flex justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          {t('teacher:createCoursePage.certificateSummaryHint')}
                        </p>
                        <span
                          className={
                            countWords(formData.certificateSummary) > MAX_CERTIFICATE_WORDS
                              ? 'text-xs font-medium text-destructive'
                              : 'text-xs text-muted-foreground'
                          }
                        >
                          {t('teacher:createCoursePage.wordsCount', { count: countWords(formData.certificateSummary), max: MAX_CERTIFICATE_WORDS })}
                        </span>
                      </div>
                      <Textarea
                        id="certSummaryEdit"
                        rows={4}
                        value={formData.certificateSummary}
                        onChange={(e) => setFormData({ ...formData, certificateSummary: e.target.value })}
                        placeholder={t('teacher:createCoursePage.certificateSummaryPlaceholder')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="certHoursEdit">{t('teacher:createCoursePage.hoursOnCertificate')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('teacher:createCoursePage.hoursOnCertificateHint')}
                      </p>
                      <Input
                        id="certHoursEdit"
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.certificateDisplayHours}
                        onChange={(e) => setFormData({ ...formData, certificateDisplayHours: e.target.value })}
                        placeholder={t('teacher:createCoursePage.hoursExample')}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{t('teacher:createCourse.publish')}</Label>
                    <p className="text-xs text-muted-foreground">{t('teacher:editCoursePage.publishHint')}</p>
                  </div>
                  <Switch
                    checked={formData.publish}
                    onCheckedChange={(checked) => setFormData({ ...formData, publish: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {t('common:saving')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 me-2" />
                    {t('teacher:courseLessonsManagement.saveChanges')}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={(e) => handleSubmit(e, true)}
                disabled={loading}
              >
                {t('teacher:createCourse.saveDraft')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading || deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {t('common:deleting')}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 me-2" />
                    {t('teacher:editCoursePage.deleteCourse')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Manage Course Sections - same as TeacherMyCoursesPage */}
      <Dialog open={showSectionsDialog} onOpenChange={(open) => { setShowSectionsDialog(open); if (!open) setEditingSection(null) }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('teacher:teacherMyCourses.manageSectionsTitle')}</DialogTitle>
            <DialogDescription>
              {course?.title ? t('teacher:teacherMyCourses.manageSectionsDescription', { title: course.title }) : t('teacher:teacherMyCourses.manageSectionsGenericDescription')}
            </DialogDescription>
          </DialogHeader>

          {editingSection ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t('teacher:teacherMyCourses.sectionNameRequired')}</Label>
                  <Input
                    value={editingSection.name}
                    onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                    placeholder={t('teacher:teacherMyCourses.sectionNamePlaceholder')}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t('teacher:teacherMyCourses.locationModality')}</Label>
                    <Input
                      value={editingSection.locationLabel}
                      onChange={(e) => setEditingSection({ ...editingSection, locationLabel: e.target.value })}
                      placeholder={t('teacher:teacherMyCourses.locationPlaceholder')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>{t('teacher:teacherMyCourses.maxSeats')}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editingSection.maxSeats}
                      onChange={(e) =>
                        setEditingSection({
                          ...editingSection,
                          maxSeats: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>{t('teacher:teacherMyCourses.joinUrlOptional')}</Label>
                  <Input
                    value={editingSection.joinUrl}
                    onChange={(e) => setEditingSection({ ...editingSection, joinUrl: e.target.value })}
                    placeholder="https://zoom.us/j/..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t('teacher:teacherMyCourses.meetingTimes')}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addMeetingTime}>
                      <Plus className="h-4 w-4 me-1" />
                      {t('teacher:teacherMyCourses.addTime')}
                    </Button>
                  </div>

                  {editingSection.meetingTimes.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">
                      {t('teacher:teacherMyCourses.noMeetingTimesAdded')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {editingSection.meetingTimes.map((mt, index) => (
                        <div
                          key={index}
                          className="flex gap-2 items-end p-2 border rounded bg-muted/20"
                        >
                          <div className="flex-1">
                            <SelectRoot
                              value={mt.day}
                              onValueChange={(value) => updateMeetingTime(index, { day: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Monday">{t('teacher:teacherMyCourses.days.monday')}</SelectItem>
                                <SelectItem value="Tuesday">{t('teacher:teacherMyCourses.days.tuesday')}</SelectItem>
                                <SelectItem value="Wednesday">{t('teacher:teacherMyCourses.days.wednesday')}</SelectItem>
                                <SelectItem value="Thursday">{t('teacher:teacherMyCourses.days.thursday')}</SelectItem>
                                <SelectItem value="Friday">{t('teacher:teacherMyCourses.days.friday')}</SelectItem>
                                <SelectItem value="Saturday">{t('teacher:teacherMyCourses.days.saturday')}</SelectItem>
                                <SelectItem value="Sunday">{t('teacher:teacherMyCourses.days.sunday')}</SelectItem>
                              </SelectContent>
                            </SelectRoot>
                          </div>
                          <div className="flex-1">
                            <Input
                              type="time"
                              value={mt.startTime}
                              onChange={(e) => updateMeetingTime(index, { startTime: e.target.value })}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">{t('teacher:teacherMyCourses.to')}</span>
                          <div className="flex-1">
                            <Input
                              type="time"
                              value={mt.endTime}
                              onChange={(e) => updateMeetingTime(index, { endTime: e.target.value })}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMeetingTime(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => setEditingSection(null)}
                  disabled={sectionsSaving}
                >
                  {t('common:cancel')}
                </Button>
                <Button variant="gradient" onClick={handleSaveSection} disabled={sectionsSaving}>
                  {sectionsSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      {t('common:saving')}
                    </>
                  ) : (
                    editingSection.id ? t('teacher:teacherMyCourses.updateSection') : t('teacher:teacherMyCourses.createSection')
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleAddSectionForm}>
                  <Plus className="h-4 w-4 me-2" />
                  {t('teacher:teacherMyCourses.addSection')}
                </Button>
              </div>

              {!course?.sections?.length ? (
                <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">{t('teacher:teacherMyCourses.noSectionsYet')}</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t('teacher:teacherMyCourses.addSectionsHint')}
                  </p>
                  <Button onClick={handleAddSectionForm} variant="outline">
                    <Plus className="h-4 w-4 me-2" />
                    {t('teacher:teacherMyCourses.addFirstSection')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {course.sections.map((section) => (
                    <div
                      key={section.id}
                      className="border border-border/50 rounded-lg p-4 space-y-2 bg-muted/20"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{section.name}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {section.locationLabel}
                            </div>
                            {section.joinUrl && (
                              <div className="flex items-center gap-1">
                                <LinkIcon className="h-3 w-3" />
                                {t('teacher:teacherMyCourses.onlineMeetingAvailable')}
                              </div>
                            )}
                            <div>
                              {t('teacher:teacherMyCourses.seatsLeft', { remaining: section.seatsRemaining, max: section.maxSeats })}
                            </div>
                          </div>
                          {section.meetingTimes && section.meetingTimes.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {section.meetingTimes.map((mt, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {mt.day} {minutesToTime(mt.startMinutes)} - {minutesToTime(mt.endMinutes)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSection(section)}
                            disabled={sectionsSaving}
                          >
                            <Edit className="h-3 w-3 me-1" />
                            {t('common:edit')}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteSectionId(section.id)}
                            disabled={sectionsSaving}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('teacher:editCoursePage.deleteCourse')}</DialogTitle>
            <DialogDescription>
              {t('teacher:editCoursePage.deleteConfirm', { title: course?.title ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              {t('common:cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {t('common:deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 me-2" />
                  {t('teacher:editCoursePage.deleteCourse')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteSectionId !== null}
        onOpenChange={(open) => { if (!open) setDeleteSectionId(null) }}
        title={t('teacher:teacherMyCourses.deleteSection')}
        description={t('teacher:teacherMyCourses.deleteSectionConfirm')}
        confirmLabel={t('common:delete')}
        variant="destructive"
        onConfirm={() => {
          if (deleteSectionId) return handleDeleteSection(deleteSectionId)
        }}
      />
    </motion.div>
  )
}
