import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

export function EditCoursePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
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
        toast.error('Course ID is required')
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

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    try {
      setUploadingImage(true)
      
      // Convert to base64 for preview and storage
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setFormData({ ...formData, thumbnailUrl: base64String })
        toast.success('Image uploaded successfully')
        setUploadingImage(false)
      }
      reader.onerror = () => {
        toast.error('Failed to read image file')
        setUploadingImage(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error('Failed to process image', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
      setUploadingImage(false)
    }
  }

  const sectionPresets = [
    { name: 'Online', locationLabel: 'Online' },
    { name: 'In-site', locationLabel: 'On campus' },
    { name: 'Hybrid', locationLabel: 'Hybrid (online + in-person)' },
    { name: 'Section 1', locationLabel: 'Section 1' },
    { name: 'Section 2', locationLabel: 'Section 2' },
    { name: 'Section 3', locationLabel: 'Section 3' },
    { name: 'Section 4', locationLabel: 'Section 4' },
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
      toast.success(`Section "${preset.name}" added`)
    } catch (error) {
      toast.error('Failed to add section', {
        description: error instanceof Error ? error.message : 'Please try again',
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
      toast.error('Section name and location are required')
      return
    }
    if (editingSection.maxSeats < 1) {
      toast.error('Max seats must be at least 1')
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
        toast.success('Section updated')
      } else {
        await courseService.addSection(id, request)
        toast.success('Section created')
      }
      const updated = await courseService.getCourseById(id)
      setCourse(updated)
      setEditingSection(null)
    } catch (error) {
      toast.error('Failed to save section', {
        description: error instanceof Error ? error.message : 'Please try again',
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
      toast.success('Section deleted')
    } catch (error) {
      toast.error('Failed to delete section', {
        description: error instanceof Error ? error.message : 'Please try again',
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
        toast.error('Course end date must be on or after start date')
        setLoading(false)
        return
      }

      if (formData.certificateEnabled && countWords(formData.certificateSummary) > MAX_CERTIFICATE_WORDS) {
        toast.error(`Certificate summary must be at most ${MAX_CERTIFICATE_WORDS} words`)
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
        toast.error('Certificate hours must be a valid non-negative number')
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
      
      toast.success(saveAsDraft ? 'Course updated' : 'Course published successfully', {
        description: saveAsDraft 
          ? 'Your changes have been saved'
          : 'Your course is now live and available for enrollment',
      })
      
      navigate('/teacher/courses')
    } catch (error) {
      toast.error('Failed to update course', {
        description: error instanceof Error ? error.message : 'Please try again later',
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
      toast.success('Course deleted successfully', {
        description: 'The course has been permanently removed',
      })
      navigate('/teacher/courses')
    } catch (error) {
      console.error('Delete course error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Please try again later'
      console.error('Error message:', errorMessage)
      
      // Show error in toast and also alert for detailed debug info
      toast.error('Failed to delete course', {
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
        <p className="text-muted-foreground">Course not found</p>
        <Button onClick={() => navigate('/teacher/courses')} className="mt-4">
          Back to Courses
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
            <h1 className="text-3xl font-bold tracking-tight gradient-text">Edit Course</h1>
            <p className="mt-1 text-sm text-muted-foreground">Update course information</p>
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
                <CardTitle className="text-lg">Course Information</CardTitle>
                <CardDescription className="text-xs mt-0.5">Basic details about your course</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Introduction to React"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what students will learn..."
                    rows={6}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Web Development"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="level">Level *</Label>
                    <SelectRoot value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </SelectRoot>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="modality">Modality *</Label>
                  <SelectRoot value={formData.modality} onValueChange={(value) => setFormData({ ...formData, modality: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="In-Person">In-Person</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </SelectRoot>
                </div>

                <div className="space-y-1.5">
                  <Label>Tags (max 5)</Label>
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
                          placeholder="Add tag..."
                          className="w-32"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const t = formData.tagInput.trim()
                              if (t && !formData.tags.includes(t) && formData.tags.length < 5) {
                                setFormData({ ...formData, tags: [...formData.tags, t], tagInput: '' })
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const t = formData.tagInput.trim()
                            if (t && !formData.tags.includes(t) && formData.tags.length < 5) {
                              setFormData({ ...formData, tags: [...formData.tags, t], tagInput: '' })
                            } else if (formData.tags.length >= 5) {
                              toast.error('Maximum 5 tags allowed')
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{formData.tags.length}/5 tags</p>
                </div>
              </CardContent>
            </Card>

            {/* Media */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">Course Media</CardTitle>
                <CardDescription className="text-xs mt-0.5">Upload course cover image</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-2">
                  {formData.thumbnailUrl ? (
                    <div className="relative">
                      <img
                        src={formData.thumbnailUrl}
                        alt="Course thumbnail"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
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
                        Upload course cover image
                      </p>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={handleFileSelect}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? 'Uploading...' : 'Choose File'}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        PNG, JPG or GIF (max 5MB)
                      </p>
                    </div>
                  )}
                  {formData.thumbnailUrl && (
                    <div className="space-y-1.5">
                      <Label htmlFor="thumbnailUrl">Or enter URL</Label>
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
                <CardTitle className="text-lg">Sections</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Students choose a section when enrolling. Add Online, In-site, Hybrid, or Section 1–4.
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
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {preset.name}
                      </Button>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <p className="text-xs font-medium text-muted-foreground">
                    Current sections ({course.sections?.length ?? 0})
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={openSectionsDialog}>
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    Manage Sections
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
                          <span className="text-xs text-muted-foreground ml-auto">
                            {s.seatsRemaining} seats left
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
                <CardTitle className="text-lg">Schedule & workload</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Expected hours and course dates (used for calendar bounds)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="expectedHours">Expected hours (total)</Label>
                  <Input
                    id="expectedHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.expectedDurationHours}
                    onChange={(e) => setFormData({ ...formData, expectedDurationHours: e.target.value })}
                    placeholder="e.g., 40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="courseStartEdit">Course start</Label>
                  <Input
                    id="courseStartEdit"
                    type="date"
                    value={formData.courseStartDate}
                    onChange={(e) => setFormData({ ...formData, courseStartDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="courseEndEdit">Course end</Label>
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
                <CardTitle className="text-lg">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="price">Price</Label>
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
                <CardTitle className="text-lg">Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Certificate Enabled</Label>
                    <p className="text-xs text-muted-foreground">
                      Issue certificates on completion; set text and hours for the certificate layout
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
                      <Label htmlFor="certSummaryEdit">Certificate summary</Label>
                      <div className="flex justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          Short text for the certificate (not the full course description)
                        </p>
                        <span
                          className={
                            countWords(formData.certificateSummary) > MAX_CERTIFICATE_WORDS
                              ? 'text-xs font-medium text-destructive'
                              : 'text-xs text-muted-foreground'
                          }
                        >
                          {countWords(formData.certificateSummary)} / {MAX_CERTIFICATE_WORDS} words
                        </span>
                      </div>
                      <Textarea
                        id="certSummaryEdit"
                        rows={4}
                        value={formData.certificateSummary}
                        onChange={(e) => setFormData({ ...formData, certificateSummary: e.target.value })}
                        placeholder="e.g. Key learning outcomes in one short paragraph…"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="certHoursEdit">Hours on certificate (optional)</Label>
                      <p className="text-xs text-muted-foreground">
                        Leave empty to use &quot;Expected hours (total)&quot; above
                      </p>
                      <Input
                        id="certHoursEdit"
                        type="number"
                        min="0"
                        step="0.5"
                        value={formData.certificateDisplayHours}
                        onChange={(e) => setFormData({ ...formData, certificateDisplayHours: e.target.value })}
                        placeholder="e.g. 40"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Publish Course</Label>
                    <p className="text-xs text-muted-foreground">Make course available for enrollment</p>
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
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
                Save as Draft
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Course
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
            <DialogTitle>Manage Course Sections</DialogTitle>
            <DialogDescription>
              {course?.title ? `Manage enrollment sections for "${course.title}"` : 'Add and manage course sections for student enrollment'}
            </DialogDescription>
          </DialogHeader>

          {editingSection ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Section Name *</Label>
                  <Input
                    value={editingSection.name}
                    onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                    placeholder="e.g., Weekend Intensive, Part-Time Evening"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Location/Modality *</Label>
                    <Input
                      value={editingSection.locationLabel}
                      onChange={(e) => setEditingSection({ ...editingSection, locationLabel: e.target.value })}
                      placeholder="e.g., Online - Live Coding, Room 201"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Max Seats</Label>
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
                  <Label>Join URL (Optional)</Label>
                  <Input
                    value={editingSection.joinUrl}
                    onChange={(e) => setEditingSection({ ...editingSection, joinUrl: e.target.value })}
                    placeholder="https://zoom.us/j/..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Meeting Times</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addMeetingTime}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Time
                    </Button>
                  </div>

                  {editingSection.meetingTimes.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded">
                      No meeting times added
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
                                <SelectItem value="Monday">Monday</SelectItem>
                                <SelectItem value="Tuesday">Tuesday</SelectItem>
                                <SelectItem value="Wednesday">Wednesday</SelectItem>
                                <SelectItem value="Thursday">Thursday</SelectItem>
                                <SelectItem value="Friday">Friday</SelectItem>
                                <SelectItem value="Saturday">Saturday</SelectItem>
                                <SelectItem value="Sunday">Sunday</SelectItem>
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
                          <span className="text-sm text-muted-foreground">to</span>
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
                  Cancel
                </Button>
                <Button variant="gradient" onClick={handleSaveSection} disabled={sectionsSaving}>
                  {sectionsSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingSection.id ? 'Update Section' : 'Create Section'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleAddSectionForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>

              {!course?.sections?.length ? (
                <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">No sections added yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Add sections so students can choose their preferred schedule
                  </p>
                  <Button onClick={handleAddSectionForm} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Section
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
                                Online meeting available
                              </div>
                            )}
                            <div>
                              {section.seatsRemaining} / {section.maxSeats} seats left
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
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
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
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{course?.title}"? This action cannot be undone and will permanently remove the course and all its data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Course
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteSectionId !== null}
        onOpenChange={(open) => { if (!open) setDeleteSectionId(null) }}
        title="Delete Section"
        description="Are you sure you want to delete this section?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteSectionId) return handleDeleteSection(deleteSectionId)
        }}
      />
    </motion.div>
  )
}
