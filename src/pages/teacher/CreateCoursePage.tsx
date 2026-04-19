import { useState, useRef } from 'react'
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
import { Save, Eye, Upload, X, Plus, MapPin, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { countWords, MAX_CERTIFICATE_WORDS } from '../../lib/certificateText'

export function CreateCoursePage() {
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
    sections: [] as {
      name: string
      locationLabel: string
      maxSeats: number
      meetingTimes: { day: string; startTime: string; endTime: string }[]
    }[],
  })
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
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

  const addSection = (preset: { name: string; locationLabel: string }) => {
    if (formData.sections.some((s) => s.name === preset.name)) return
    setFormData({
      ...formData,
      sections: [...formData.sections, { ...preset, maxSeats: 999, meetingTimes: [] }],
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
        s.name !== sectionName ? s : { ...s, maxSeats },
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

  const handleSubmit = async (e: React.FormEvent, saveAsDraft: boolean) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { courseService } = await import('../../services/courseService')

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
        sections:
          formData.sections.length > 0
            ? formData.sections.map((s) => ({
                name: s.name,
                locationLabel: s.locationLabel,
                maxSeats: s.maxSeats,
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
            : [{ name: 'Default', locationLabel: 'Online', maxSeats: 999, meetingTimes: [] }],
      })

      // If publishing, update status
      if (!saveAsDraft && formData.publish) {
        await courseService.publishCourse(course.id)
      }
      
      toast.success(saveAsDraft ? 'Course saved as draft' : 'Course published successfully', {
        description: saveAsDraft 
          ? 'You can publish it later from the course management page'
          : 'Your course is now live and available for enrollment',
      })
      
      navigate('/teacher/courses')
    } catch (error) {
      toast.error('Failed to save course', {
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Create Course</h1>
          <p className="mt-1 text-sm text-muted-foreground">Build and publish your course</p>
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
                    placeholder="e.g., Introduction to Web Development"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what students will learn in this course..."
                    rows={5}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Programming, Design"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="level">Level *</Label>
                    <SelectRoot
                      value={formData.level}
                      onValueChange={(value) => setFormData({ ...formData, level: value })}
                    >
                      <SelectTrigger id="level">
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

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="modality">Modality *</Label>
                    <SelectRoot
                      value={formData.modality}
                      onValueChange={(value) => setFormData({ ...formData, modality: value })}
                    >
                      <SelectTrigger id="modality">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="On-campus">On-campus</SelectItem>
                      </SelectContent>
                    </SelectRoot>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="price">Price (USD)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00 (leave empty for free)"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
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
                    <Label htmlFor="courseStart">Course start</Label>
                    <Input
                      id="courseStart"
                      type="date"
                      value={formData.courseStartDate}
                      onChange={(e) => setFormData({ ...formData, courseStartDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="courseEnd">Course end</Label>
                    <Input
                      id="courseEnd"
                      type="date"
                      value={formData.courseEndDate}
                      onChange={(e) => setFormData({ ...formData, courseEndDate: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional: schedule bounds for your calendar. Meeting times repeat weekly between these dates.
                </p>

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
                </div>
              </CardContent>
            </Card>

            {/* Sections - students choose one when enrolling */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-lg">Sections</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Add sections so students can choose when enrolling (e.g. Online, In-site, Hybrid)
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
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      {preset.name}
                    </Button>
                  ))}
                </div>
                {formData.sections.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Added sections ({formData.sections.length}) — click to set seats and meeting times
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
                                className="flex flex-1 items-center gap-2 text-left"
                                onClick={() => setExpandedSection(isExpanded ? null : s.name)}
                              >
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <strong>{s.name}</strong>
                                <span className="text-muted-foreground truncate">— {s.locationLabel}</span>
                                {s.meetingTimes.length > 0 && (
                                  <Badge variant="subtle" className="text-xs ml-auto mr-2">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {s.meetingTimes.length}{' '}
                                    {s.meetingTimes.length === 1 ? 'time' : 'times'}
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
                                aria-label={`Remove ${s.name}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            {isExpanded && (
                              <div className="border-t border-border/60 bg-background/40 p-3 space-y-3">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <Label htmlFor={`max-seats-${s.name}`} className="text-xs">
                                      Max seats
                                    </Label>
                                    <Input
                                      id={`max-seats-${s.name}`}
                                      type="number"
                                      min="1"
                                      value={s.maxSeats}
                                      onChange={(e) =>
                                        updateSectionMaxSeats(
                                          s.name,
                                          Math.max(1, parseInt(e.target.value) || 1),
                                        )
                                      }
                                      className="h-8"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Meeting times (weekly)</Label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addMeetingTime(s.name)}
                                    >
                                      <Plus className="h-3.5 w-3.5 mr-1" />
                                      Add time
                                    </Button>
                                  </div>

                                  {s.meetingTimes.length === 0 ? (
                                    <div className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded">
                                      No meeting times yet — click "Add time" above
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
                                          <span className="text-xs text-muted-foreground">to</span>
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
                                            aria-label="Remove time"
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
                <CardTitle className="text-lg">Settings</CardTitle>
                <CardDescription className="text-xs mt-0.5">Course configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="enrollmentLimit">Enrollment Limit</Label>
                  <Input
                    id="enrollmentLimit"
                    type="number"
                    min="1"
                    value={formData.enrollmentLimit}
                    onChange={(e) => setFormData({ ...formData, enrollmentLimit: e.target.value })}
                    placeholder="No limit"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="certificate">Certificate Enabled</Label>
                    <p className="text-xs text-muted-foreground">
                      Issue certificates upon completion; set text and hours for the certificate layout
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
                      <Label htmlFor="certSummary">Certificate summary</Label>
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
                        id="certSummary"
                        rows={4}
                        value={formData.certificateSummary}
                        onChange={(e) => setFormData({ ...formData, certificateSummary: e.target.value })}
                        placeholder="e.g. Key learning outcomes in one short paragraph…"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="certHours">Hours on certificate (optional)</Label>
                      <p className="text-xs text-muted-foreground">
                        Leave empty to use &quot;Expected hours (total)&quot; above
                      </p>
                      <Input
                        id="certHours"
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
                    <Label htmlFor="publish">Publish Course</Label>
                    <p className="text-xs text-muted-foreground">
                      Make course visible to students
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
                    {loading ? 'Saving...' : formData.publish ? 'Publish Course' : 'Save as Draft'}
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
                    onClick={() => navigate('/teacher/courses')}
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

