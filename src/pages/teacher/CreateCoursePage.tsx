import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { RevenueSplitPreview } from '../../components/RevenueSplitPreview'
import { CourseVisibilityToggle } from '../../components/CourseVisibilityToggle'
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
import { Eye, Upload, X, Plus, MapPin, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { countWords, MAX_CERTIFICATE_WORDS } from '../../lib/certificateText'
import { useTranslation } from 'react-i18next'
import { subscriptionService, type CanCreateCourseResponse } from '../../services/subscriptionService'

export function CreateCoursePage() {
  const { t } = useTranslation(['teacher', 'common', 'errors'])
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
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
    organizationId: '' as string, // set when the instructor belongs to an org
    isOrgExclusive: false,
    sections: [] as {
      name: string
      locationLabel: string
      maxSeats: number
      meetingTimes: { day: string; startTime: string; endTime: string }[]
    }[],
  })
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [planStatus, setPlanStatus] = useState<CanCreateCourseResponse | null>(null)
  const [planLoading, setPlanLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadPlanStatus = async () => {
      try {
        setPlanLoading(true)
        const status = await subscriptionService.canCreateCourse({
          organizationId: formData.organizationId || undefined,
          personal: !formData.organizationId,
        })
        if (!cancelled) setPlanStatus(status)
      } catch {
        if (!cancelled) setPlanStatus(null)
      } finally {
        if (!cancelled) setPlanLoading(false)
      }
    }

    void loadPlanStatus()

    return () => {
      cancelled = true
    }
  }, [formData.organizationId])

  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
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

  const formatLimit = (value?: number | null) =>
    value == null ? t('teacher:createCoursePage.unlimited') : value.toLocaleString()

  const clampSeatCount = (value: number) => {
    let next = Math.max(1, Math.floor(value || 1))
    if (planStatus?.maxSeatsPerCourse != null) {
      next = Math.min(next, planStatus.maxSeatsPerCourse)
    }
    if (planStatus?.remainingTotalSeats != null && planStatus.remainingTotalSeats > 0) {
      next = Math.min(next, planStatus.remainingTotalSeats)
    }
    return Math.max(1, next)
  }

  const getDefaultSectionSeats = () => {
    const typed = parseInt(formData.enrollmentLimit, 10)
    return clampSeatCount(Number.isFinite(typed) && typed > 0 ? typed : 30)
  }

  const requestedSeatTotal =
    formData.sections.length > 0
      ? formData.sections.reduce((sum, section) => sum + Math.max(0, section.maxSeats || 0), 0)
      : getDefaultSectionSeats()

  const getPlanCapacityError = (seatTotal: number) => {
    if (!planStatus) return null
    if (!planStatus.hasActiveSubscription) {
      return t('teacher:createCoursePage.errors.noActivePlan')
    }
    if (!planStatus.canCreateCourse) {
      return t('teacher:createCoursePage.errors.coursePlanLimit', {
        plan: planStatus.planName || t('teacher:createCoursePage.currentPlan'),
        max: formatLimit(planStatus.maxCourses),
      })
    }
    if (planStatus.maxSeatsPerCourse != null && seatTotal > planStatus.maxSeatsPerCourse) {
      return t('teacher:createCoursePage.errors.seatsPerCourseLimit', {
        plan: planStatus.planName || t('teacher:createCoursePage.currentPlan'),
        max: formatLimit(planStatus.maxSeatsPerCourse),
      })
    }
    if (planStatus.remainingTotalSeats != null && seatTotal > planStatus.remainingTotalSeats) {
      return t('teacher:createCoursePage.errors.totalSeatLimit', {
        plan: planStatus.planName || t('teacher:createCoursePage.currentPlan'),
        remaining: formatLimit(planStatus.remainingTotalSeats),
      })
    }
    return null
  }

  const addSection = (preset: { name: string; locationLabel: string }) => {
    if (formData.sections.some((s) => s.name === preset.name)) return
    setFormData({
      ...formData,
      sections: [...formData.sections, { ...preset, maxSeats: getDefaultSectionSeats(), meetingTimes: [] }],
    })
    setExpandedSection(preset.name)
  }

  const removeSection = (name: string) => {
    setFormData({
      ...formData,
      sections: formData.sections.filter((s) => s.name !== name),
    })
    if (expandedSection === name) setExpandedSection(null)
  }

  const addMeetingTime = (sectionName: string) => {
    setFormData({
      ...formData,
      sections: formData.sections.map((s) =>
        s.name !== sectionName
          ? s
          : {
              ...s,
              meetingTimes: [
                ...s.meetingTimes,
                { day: 'Monday', startTime: '09:00', endTime: '10:00' },
              ],
            },
      ),
    })
  }

  const updateMeetingTime = (
    sectionName: string,
    index: number,
    updates: Partial<{ day: string; startTime: string; endTime: string }>,
  ) => {
    setFormData({
      ...formData,
      sections: formData.sections.map((s) => {
        if (s.name !== sectionName) return s
        const mts = [...s.meetingTimes]
        mts[index] = { ...mts[index], ...updates }
        return { ...s, meetingTimes: mts }
      }),
    })
  }

  const removeMeetingTime = (sectionName: string, index: number) => {
    setFormData({
      ...formData,
      sections: formData.sections.map((s) =>
        s.name !== sectionName
          ? s
          : { ...s, meetingTimes: s.meetingTimes.filter((_, i) => i !== index) },
      ),
    })
  }

  const updateSectionMaxSeats = (sectionName: string, maxSeats: number) => {
    setFormData({
      ...formData,
      sections: formData.sections.map((s) =>
        s.name !== sectionName ? s : { ...s, maxSeats: clampSeatCount(maxSeats) },
      ),
    })
  }

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

  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { courseService } = await import('../../services/courseService')

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

      const defaultSectionSeats = getDefaultSectionSeats()
      const sectionPayload =
        formData.sections.length > 0
          ? formData.sections.map((s) => ({
              name: s.name,
              locationLabel: s.locationLabel,
              maxSeats: Math.max(1, Math.floor(s.maxSeats || 1)),
              meetingTimes: s.meetingTimes
                .filter(
                  (mt) =>
                    mt.startTime &&
                    mt.endTime &&
                    timeToMinutes(mt.startTime) < timeToMinutes(mt.endTime),
                )
                .map((mt) => ({
                  day: mt.day,
                  startMinutes: timeToMinutes(mt.startTime),
                  endMinutes: timeToMinutes(mt.endTime),
                })),
            }))
          : [{
              name: 'Default',
              locationLabel: t('teacher:createCoursePage.sectionPresets.online'),
              maxSeats: defaultSectionSeats,
              meetingTimes: [],
            }]

      const seatTotal = sectionPayload.reduce((sum, section) => sum + section.maxSeats, 0)
      const planError = getPlanCapacityError(seatTotal)
      if (planError) {
        toast.error(planError)
        setLoading(false)
        return
      }
      
      // Create the course
      const course = await courseService.createCourse({
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
        sections: sectionPayload,
        organizationId: formData.organizationId || undefined,
        isOrgExclusive: formData.isOrgExclusive,
      })

      // Only publish when the publish toggle is on (and not explicitly saving a draft)
      const published = !saveAsDraft && formData.publish
      if (published) {
        await courseService.publishCourse(course.id)
      }

      // Toast must reflect what actually happened (published vs draft saved)
      toast.success(published ? t('teacher:createCoursePage.toasts.published') : t('teacher:createCoursePage.toasts.draftSaved'), {
        description: published
          ? t('teacher:createCoursePage.toasts.publishedDescription')
          : t('teacher:createCoursePage.toasts.draftSavedDescription'),
      })

      navigate('/teacher/courses')
    } catch (error) {
      toast.error(t('teacher:createCoursePage.errors.saveFailed'), {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">{t('teacher:createCoursePage.pageTitle')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('teacher:createCoursePage.pageSubtitle')}</p>
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
                    placeholder={t('teacher:createCoursePage.courseTitlePlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">{t('teacher:courseLessonsManagement.description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('teacher:createCoursePage.descriptionPlaceholder')}
                    rows={5}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="category">{t('teacher:createCoursePage.categoryRequired')}</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder={t('teacher:createCoursePage.categoryPlaceholder')}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="level">{t('teacher:createCoursePage.levelRequired')}</Label>
                    <SelectRoot
                      value={formData.level}
                      onValueChange={(value) => setFormData({ ...formData, level: value })}
                    >
                      <SelectTrigger id="level">
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

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="modality">{t('teacher:createCoursePage.modalityRequired')}</Label>
                    <SelectRoot
                      value={formData.modality}
                      onValueChange={(value) => setFormData({ ...formData, modality: value })}
                    >
                      <SelectTrigger id="modality">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Online">{t('teacher:createCoursePage.modalities.online')}</SelectItem>
                        <SelectItem value="Hybrid">{t('teacher:createCoursePage.modalities.hybrid')}</SelectItem>
                        <SelectItem value="On-campus">{t('teacher:createCoursePage.modalities.onCampus')}</SelectItem>
                      </SelectContent>
                    </SelectRoot>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="price">{t('teacher:createCoursePage.priceUSD')}</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder={t('teacher:createCoursePage.pricePlaceholder')}
                    />
                  </div>
                </div>

                <CourseVisibilityToggle
                  organizationId={formData.organizationId}
                  isExclusive={formData.isOrgExclusive}
                  onChange={(orgId, exclusive) =>
                    setFormData({ ...formData, organizationId: orgId, isOrgExclusive: exclusive })
                  }
                />

                <RevenueSplitPreview
                  price={formData.price ? parseFloat(formData.price) : 0}
                  organizationId={formData.organizationId || null}
                />

                <div className="grid gap-3 md:grid-cols-3">
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
                    <Label htmlFor="courseStart">{t('teacher:createCoursePage.courseStart')}</Label>
                    <Input
                      id="courseStart"
                      type="date"
                      value={formData.courseStartDate}
                      onChange={(e) => setFormData({ ...formData, courseStartDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="courseEnd">{t('teacher:createCoursePage.courseEnd')}</Label>
                    <Input
                      id="courseEnd"
                      type="date"
                      value={formData.courseEndDate}
                      onChange={(e) => setFormData({ ...formData, courseEndDate: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('teacher:createCoursePage.scheduleBoundsHint')}
                </p>

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
                </div>
              </CardContent>
            </Card>

            {/* Sections - students choose one when enrolling */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">{t('teacher:createCourse.sectionsTitle')}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {t('teacher:createCoursePage.sectionsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="flex flex-wrap gap-2">
                  {sectionPresets.map((preset) => (
                    <Button
                      key={preset.name}
                      type="button"
                      variant={formData.sections.some((s) => s.name === preset.name) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => addSection(preset)}
                      disabled={formData.sections.some((s) => s.name === preset.name)}
                    >
                      <Plus className="h-3.5 w-3.5 me-1" />
                      {preset.name}
                    </Button>
                  ))}
                </div>
                {formData.sections.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('teacher:createCoursePage.addedSectionsHint', { count: formData.sections.length })}
                    </p>
                    <ul className="space-y-2">
                      {formData.sections.map((s) => {
                        const isExpanded = expandedSection === s.name
                        return (
                          <li
                            key={s.name}
                            className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden"
                          >
                            <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                              <button
                                type="button"
                                className="flex flex-1 items-center gap-2 text-start"
                                onClick={() => setExpandedSection(isExpanded ? null : s.name)}
                              >
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <strong>{s.name}</strong>
                                <span className="text-muted-foreground truncate">— {s.locationLabel}</span>
                                {s.meetingTimes.length > 0 && (
                                  <Badge variant="subtle" className="text-xs ms-auto me-2">
                                    <Clock className="h-3 w-3 me-1" />
                                    {t('teacher:createCoursePage.timesCount', { count: s.meetingTimes.length })}
                                  </Badge>
                                )}
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => removeSection(s.name)}
                                aria-label={t('teacher:createCoursePage.removeSection', { name: s.name })}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {isExpanded && (
                              <div className="border-t border-border/60 bg-background/40 p-3 space-y-3">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <Label htmlFor={`max-seats-${s.name}`} className="text-xs">
                                      {t('teacher:teacherMyCourses.maxSeats')}
                                    </Label>
                                    <Input
                                      id={`max-seats-${s.name}`}
                                      type="number"
                                      min="1"
                                      max={planStatus?.maxSeatsPerCourse ?? undefined}
                                      value={s.maxSeats}
                                      onChange={(e) =>
                                        updateSectionMaxSeats(
                                          s.name,
                                          Math.max(1, parseInt(e.target.value) || 1),
                                        )
                                      }
                                      className="h-8"
                                    />
                                    {planStatus?.maxSeatsPerCourse != null && (
                                      <p className="text-[11px] text-muted-foreground">
                                        {t('teacher:createCoursePage.sectionSeatLimitHint', {
                                          max: formatLimit(planStatus.maxSeatsPerCourse),
                                        })}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">{t('teacher:createCoursePage.meetingTimesWeekly')}</Label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addMeetingTime(s.name)}
                                    >
                                      <Plus className="h-3.5 w-3.5 me-1" />
                                      {t('teacher:createCourse.addTime')}
                                    </Button>
                                  </div>

                                  {s.meetingTimes.length === 0 ? (
                                    <div className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded">
                                      {t('teacher:createCoursePage.noTimesYet')}
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {s.meetingTimes.map((mt, index) => (
                                        <div
                                          key={index}
                                          className="flex flex-wrap gap-1.5 items-center rounded border bg-background/60 p-1.5"
                                        >
                                          <div className="min-w-[120px] flex-1">
                                            <SelectRoot
                                              value={mt.day}
                                              onValueChange={(value) =>
                                                updateMeetingTime(s.name, index, { day: value })
                                              }
                                            >
                                              <SelectTrigger className="h-8">
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
                                          <Input
                                            type="time"
                                            className="h-8 w-[110px]"
                                            value={mt.startTime}
                                            onChange={(e) =>
                                              updateMeetingTime(s.name, index, {
                                                startTime: e.target.value,
                                              })
                                            }
                                          />
                                          <span className="text-xs text-muted-foreground">{t('teacher:teacherMyCourses.to')}</span>
                                          <Input
                                            type="time"
                                            className="h-8 w-[110px]"
                                            value={mt.endTime}
                                            onChange={(e) =>
                                              updateMeetingTime(s.name, index, {
                                                endTime: e.target.value,
                                              })
                                            }
                                          />
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0"
                                            onClick={() => removeMeetingTime(s.name, index)}
                                            aria-label={t('teacher:createCoursePage.removeTime')}
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Settings Sidebar */}
          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">{t('teacher:createAssignment.settings')}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{t('teacher:createCoursePage.courseConfiguration')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="enrollmentLimit">{t('teacher:createCoursePage.enrollmentLimit')}</Label>
                  <Input
                    id="enrollmentLimit"
                    type="number"
                    min="1"
                    max={planStatus?.maxSeatsPerCourse ?? undefined}
                    value={formData.enrollmentLimit}
                    onChange={(e) => setFormData({ ...formData, enrollmentLimit: e.target.value })}
                    placeholder={t('teacher:createCoursePage.noLimit')}
                  />
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                    {planLoading ? (
                      <span>{t('teacher:createCoursePage.loadingPlan')}</span>
                    ) : planStatus ? (
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">
                          {planStatus.hasActiveSubscription
                            ? planStatus.planName || t('teacher:createCoursePage.currentPlan')
                            : t('teacher:createCoursePage.errors.noActivePlan')}
                        </div>
                        {planStatus.hasActiveSubscription ? (
                          <>
                            <div>
                              {t('teacher:createCoursePage.planSeatsHint', {
                                perCourse: formatLimit(planStatus.maxSeatsPerCourse),
                                totalLeft: formatLimit(planStatus.remainingTotalSeats),
                              })}
                            </div>
                            <div>
                              {t('teacher:createCoursePage.requestedSeatsHint', {
                                count: requestedSeatTotal,
                              })}
                            </div>
                            {planStatus.maxCourses != null && (
                              <div>
                                {t('teacher:createCoursePage.planCoursesHint', {
                                  used: planStatus.currentCourseCount.toLocaleString(),
                                  max: formatLimit(planStatus.maxCourses),
                                  remaining: formatLimit(planStatus.remainingCourses),
                                })}
                              </div>
                            )}
                          </>
                        ) : (
                          <div>
                            {t('teacher:createCoursePage.requestedSeatsHint', {
                              count: requestedSeatTotal,
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span>{t('teacher:createCoursePage.planUnavailable')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="certificate">{t('teacher:createCoursePage.certificateEnabled')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('teacher:createCoursePage.certificateEnabledHint')}
                    </p>
                  </div>
                  <Switch
                    id="certificate"
                    checked={formData.certificateEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, certificateEnabled: checked })
                    }
                  />
                </div>

                {formData.certificateEnabled && (
                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="certSummary">{t('teacher:createCoursePage.certificateSummary')}</Label>
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
                        id="certSummary"
                        rows={4}
                        value={formData.certificateSummary}
                        onChange={(e) => setFormData({ ...formData, certificateSummary: e.target.value })}
                        placeholder={t('teacher:createCoursePage.certificateSummaryPlaceholder')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="certHours">{t('teacher:createCoursePage.hoursOnCertificate')}</Label>
                      <p className="text-xs text-muted-foreground">
                        {t('teacher:createCoursePage.hoursOnCertificateHint')}
                      </p>
                      <Input
                        id="certHours"
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
                    <Label htmlFor="publish">{t('teacher:createCourse.publish')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t('teacher:createCoursePage.publishHint')}
                    </p>
                  </div>
                  <Switch
                    id="publish"
                    checked={formData.publish}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, publish: checked })
                    }
                  />
                </div>
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
                    disabled={loading}
                  >
                    {loading ? t('common:saving') : formData.publish ? t('teacher:createCourse.publish') : t('teacher:createCourse.saveDraft')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => navigate('/teacher/courses')}
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
