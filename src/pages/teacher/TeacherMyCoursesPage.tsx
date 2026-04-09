import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Progress } from '../../components/ui/progress'
import { courseService, type CourseDto, type CloneCourseRequest } from '../../services/courseService'
import { teacherService } from '../../services/teacherService'
import {
  BookOpen,
  Users,
  Settings,
  Eye,
  Edit,
  MoreVertical,
  PlusCircle,
  TrendingUp,
  Clock,
  GraduationCap,
  Calendar,
  Plus,
  Trash2,
  X,
  MapPin,
  Link as LinkIcon,
  Tag,
  Copy,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import {
  SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { apiClient } from '../../lib/api'
import { enrollmentService } from '../../services/enrollmentService'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import type { CourseSectionDto, MeetingTimeDto } from '../../services/courseService'

/** Active + completed enrollments only — used for class size and average progress. */
const COUNTABLE_ENROLLMENT_STATUSES = new Set(['Active', 'Completed'])

function computeCourseEnrollmentStats(items: { status: string; progressPercentage: number }[]) {
  const relevant = items.filter((e) => COUNTABLE_ENROLLMENT_STATUSES.has(e.status))
  if (relevant.length === 0) {
    return { studentCount: 0, averageProgress: 0 }
  }
  const sum = relevant.reduce((acc, e) => acc + Number(e.progressPercentage ?? 0), 0)
  return {
    studentCount: relevant.length,
    averageProgress: Math.round(sum / relevant.length),
  }
}

interface SectionFormData {
  id?: string
  name: string
  locationLabel: string
  joinUrl: string
  maxSeats: number
  meetingTimes: {
    day: string
    startTime: string
    endTime: string
  }[]
}

export function TeacherMyCoursesPage() {
  const [courses, setCourses] = useState<CourseDto[]>([])
  const [courseStatsById, setCourseStatsById] = useState<
    Record<string, { studentCount: number; averageProgress: number }>
  >({})
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<CourseDto | null>(null)
  const [sections, setSections] = useState<CourseSectionDto[]>([])
  const [showSectionsDialog, setShowSectionsDialog] = useState(false)
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [editingSection, setEditingSection] = useState<SectionFormData | null>(null)
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null)

  // Clone / Start New Batch state
  const navigate = useNavigate()
  const [cloneCourse, setCloneCourse] = useState<CourseDto | null>(null)
  const [showCloneDialog, setShowCloneDialog] = useState(false)
  const [cloneForm, setCloneForm] = useState({
    title: '',
    courseStartDate: '',
    courseEndDate: '',
    copyLessons: true,
    copyAssignments: true,
    copyExams: true,
    copySections: true,
  })
  const [cloneLoading, setCloneLoading] = useState(false)

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true)
        const result = await teacherService.getMyCourses({ pageSize: 100 })
        setCourses(result.items)

        const statsEntries = await Promise.all(
          result.items.map(async (course) => {
            try {
              const enr = await enrollmentService.getCourseEnrollments(course.id, {
                pageSize: 10000,
                pageNumber: 1,
              })
              const stats = computeCourseEnrollmentStats(enr.items)
              return [course.id, stats] as const
            } catch {
              return [course.id, { studentCount: 0, averageProgress: 0 }] as const
            }
          })
        )
        setCourseStatsById(Object.fromEntries(statsEntries))
      } catch (error) {
        toast.error('Failed to load courses', {
          description: error instanceof Error ? error.message : 'Please try again later',
        })
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [])

  const getCourseCardStats = (course: CourseDto) => {
    const s = courseStatsById[course.id] ?? { studentCount: 0, averageProgress: 0 }
    return {
      studentCount: s.studentCount,
      averageProgress: s.averageProgress,
      status: course.status,
    }
  }

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  const openSectionsDialog = async (course: CourseDto) => {
    setSelectedCourse(course)
    setShowSectionsDialog(true)
    await loadSections(course.id)
  }

  const loadSections = async (courseId: string) => {
    try {
      setSectionsLoading(true)
      // Load sections from course
      const course = await courseService.getCourseById(courseId)
      setSections(course.sections || [])
    } catch (error) {
      toast.error('Failed to load sections', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    } finally {
      setSectionsLoading(false)
    }
  }

  const handleAddSection = () => {
    setEditingSection({
      name: '',
      locationLabel: '',
      joinUrl: '',
      maxSeats: 30,
      meetingTimes: [],
    })
  }

  const handleEditSection = (section: CourseSectionDto) => {
    setEditingSection({
      id: section.id,
      name: section.name,
      locationLabel: section.locationLabel,
      joinUrl: section.joinUrl || '',
      maxSeats: section.maxSeats,
      meetingTimes: section.meetingTimes.map((mt) => ({
        day: mt.day,
        startTime: minutesToTime(mt.startMinutes),
        endTime: minutesToTime(mt.endMinutes),
      })),
    })
  }

  const handleSaveSection = async () => {
    if (!selectedCourse || !editingSection) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate required fields
    if (!editingSection.name.trim()) {
      toast.error('Section name is required')
      return
    }

    if (!editingSection.locationLabel.trim()) {
      toast.error('Location/Modality is required')
      return
    }

    if (editingSection.maxSeats < 1) {
      toast.error('Max seats must be at least 1')
      return
    }

    // Validate meeting times
    for (const mt of editingSection.meetingTimes) {
      if (!mt.startTime || !mt.endTime) {
        toast.error('Please fill in all meeting times')
        return
      }
      const start = timeToMinutes(mt.startTime)
      const end = timeToMinutes(mt.endTime)
      if (start >= end) {
        toast.error('End time must be after start time')
        return
      }
    }

    try {
      setSectionsLoading(true)
      const meetingTimes = editingSection.meetingTimes.map((mt) => {
        const startMinutes = timeToMinutes(mt.startTime)
        const endMinutes = timeToMinutes(mt.endTime)
        
        if (isNaN(startMinutes) || isNaN(endMinutes)) {
          throw new Error(`Invalid time format for ${mt.day}`)
        }

        return {
          day: mt.day,
          startMinutes: startMinutes,
          endMinutes: endMinutes,
        }
      })

      const requestBody = {
        name: editingSection.name.trim(),
        locationLabel: editingSection.locationLabel.trim(),
        joinUrl: editingSection.joinUrl?.trim() || undefined,
        maxSeats: editingSection.maxSeats,
        meetingTimes: meetingTimes,
      }

      console.log('Saving section with data:', {
        courseId: selectedCourse.id,
        sectionId: editingSection.id,
        requestBody,
      })

      if (editingSection.id) {
        // Update existing section
        const response = await apiClient.put(`/courses/${selectedCourse.id}/sections/${editingSection.id}`, requestBody)
        console.log('Section updated:', response)
        toast.success('Section updated successfully')
      } else {
        // Create new section
        const response = await apiClient.post(`/courses/${selectedCourse.id}/sections`, requestBody)
        console.log('Section created:', response)
        toast.success('Section created successfully')
      }

      setEditingSection(null)
      await loadSections(selectedCourse.id)
    } catch (error: any) {
      console.error('Failed to save section:', error)
      const errorMessage = error?.error || error?.detail || error?.message || 'Please try again later'
      toast.error('Failed to save section', {
        description: errorMessage,
      })
    } finally {
      setSectionsLoading(false)
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!selectedCourse) return

    try {
      setSectionsLoading(true)
      await apiClient.delete(`/courses/${selectedCourse.id}/sections/${sectionId}`)
      toast.success('Section deleted successfully')
      await loadSections(selectedCourse.id)
    } catch (error) {
      toast.error('Failed to delete section', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    } finally {
      setSectionsLoading(false)
    }
  }

  const addMeetingTime = () => {
    if (!editingSection) return
    setEditingSection({
      ...editingSection,
      meetingTimes: [
        ...editingSection.meetingTimes,
        { day: 'Monday', startTime: '09:00', endTime: '17:00' },
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

  const openCloneDialog = (course: CourseDto) => {
    setCloneCourse(course)
    setCloneForm({
      title: `${course.title} (New Batch)`,
      courseStartDate: '',
      courseEndDate: '',
      copyLessons: true,
      copyAssignments: true,
      copyExams: true,
      copySections: true,
    })
    setShowCloneDialog(true)
  }

  const handleCloneCourse = async () => {
    if (!cloneCourse || cloneLoading) return // Guard against double-fire
    try {
      setCloneLoading(true)
      const request: CloneCourseRequest = {
        title: cloneForm.title || undefined,
        courseStartDate: cloneForm.courseStartDate || undefined,
        courseEndDate: cloneForm.courseEndDate || undefined,
        copyLessons: cloneForm.copyLessons,
        copyAssignments: cloneForm.copyAssignments,
        copyExams: cloneForm.copyExams,
        copySections: cloneForm.copySections,
      }
      const newCourse = await courseService.cloneCourse(cloneCourse.id, request)
      setShowCloneDialog(false)
      // Navigate first, then show toast on the destination page so it isn't unmounted
      navigate(`/teacher/courses/${newCourse.id}/edit`, {
        state: { successMessage: `New batch "${newCourse.title}" created!` },
      })
    } catch (error) {
      toast.error('Failed to create new batch', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    } finally {
      setCloneLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-64">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                  <div className="h-20 w-full bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">My Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your courses and content</p>
        </div>
        <Button asChild variant="gradient">
          <Link to="/teacher/create-course">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Course
          </Link>
        </Button>
      </div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first course to get started
            </p>
            <Button asChild variant="gradient">
              <Link to="/teacher/create-course">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Your First Course
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto scroll-fancy pr-1">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => {
            const stats = getCourseCardStats(course)
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <Card className="h-full flex flex-col border-2 border-border/60 transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
                  {/* Course Image/Banner */}
                  {course.thumbnailUrl ? (
                    <div className="relative h-32 w-full overflow-hidden rounded-t-lg">
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    </div>
                  ) : (
                    <div className="h-32 w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center rounded-t-lg">
                      <BookOpen className="h-12 w-12 text-primary/50" />
                    </div>
                  )}

                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                        <CardDescription className="text-xs mt-0.5 line-clamp-1">
                          {course.category} • {course.level}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/teacher/courses/${course.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Course
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/teacher/courses/${course.id}/lessons`}>
                              <BookOpen className="h-4 w-4 mr-2" />
                              Manage Lessons
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openSectionsDialog(course)}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Manage Sections
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/teacher/courses/${course.id}/students`}>
                              <Users className="h-4 w-4 mr-2" />
                              View Students
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/teacher/courses/${course.id}/discounts`}>
                              <Tag className="h-4 w-4 mr-2" />
                              Discounts
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openCloneDialog(course)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Start New Batch
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2 flex-1 flex flex-col">
                    {/* Course Stats */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{stats.studentCount} students</span>
                        </div>
                        <Badge
                          variant={
                            stats.status === 'Published'
                              ? 'default'
                              : stats.status === 'Draft'
                                ? 'secondary'
                                : 'outline'
                          }
                          className="text-xs"
                        >
                          {stats.status}
                        </Badge>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Avg. student progress</span>
                          <span className="font-medium">{stats.averageProgress}%</span>
                        </div>
                        <Progress value={stats.averageProgress} className="h-1.5" />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-auto pt-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link to={`/teacher/courses/${course.id}`}>
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link to={`/teacher/courses/${course.id}/edit`}>
                          <Settings className="h-3 w-3 mr-1" />
                          Manage
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
        </div>
      )}

      {/* Manage Sections Dialog */}
      <Dialog open={showSectionsDialog} onOpenChange={setShowSectionsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Course Sections</DialogTitle>
            <DialogDescription>
              {selectedCourse?.title ? `Manage enrollment sections for "${selectedCourse.title}"` : 'Add and manage course sections for student enrollment'}
            </DialogDescription>
          </DialogHeader>

          {editingSection ? (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Section Name *</Label>
                  <Input
                    value={editingSection.name}
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, name: e.target.value })
                    }
                    placeholder="e.g., Weekend Intensive, Part-Time Evening"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Location/Modality *</Label>
                    <Input
                      value={editingSection.locationLabel}
                      onChange={(e) =>
                        setEditingSection({ ...editingSection, locationLabel: e.target.value })
                      }
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
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, joinUrl: e.target.value })
                    }
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
                  disabled={sectionsLoading}
                >
                  Cancel
                </Button>
                <Button variant="gradient" onClick={handleSaveSection} disabled={sectionsLoading}>
                  {sectionsLoading ? 'Saving...' : editingSection.id ? 'Update Section' : 'Create Section'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={handleAddSection}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>

              {sectionsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading sections...</div>
              ) : sections.length === 0 ? (
                <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">No sections added yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Add sections so students can choose their preferred schedule
                  </p>
                  <Button onClick={handleAddSection} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Section
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sections.map((section) => (
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
                            disabled={sectionsLoading}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteSectionId(section.id)}
                            disabled={sectionsLoading}
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

      {/* Start New Batch / Clone Course Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Batch</DialogTitle>
            <DialogDescription>
              Create a fresh copy of this course with new dates and zero enrollments. All lessons, assignments, and exams will be copied.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="clone-title">Title</Label>
              <Input
                id="clone-title"
                value={cloneForm.title}
                onChange={(e) => setCloneForm({ ...cloneForm, title: e.target.value })}
                placeholder="New course title"
              />
            </div>

            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="clone-start-date">Start Date</Label>
                <Input
                  id="clone-start-date"
                  type="date"
                  value={cloneForm.courseStartDate}
                  onChange={(e) => setCloneForm({ ...cloneForm, courseStartDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clone-end-date">End Date</Label>
                <Input
                  id="clone-end-date"
                  type="date"
                  value={cloneForm.courseEndDate}
                  onChange={(e) => setCloneForm({ ...cloneForm, courseEndDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Content to Copy</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="clone-lessons" className="font-normal cursor-pointer">Copy Lessons</Label>
                  <Switch
                    id="clone-lessons"
                    checked={cloneForm.copyLessons}
                    onCheckedChange={(checked) => setCloneForm({ ...cloneForm, copyLessons: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="clone-assignments" className="font-normal cursor-pointer">Copy Assignments</Label>
                  <Switch
                    id="clone-assignments"
                    checked={cloneForm.copyAssignments}
                    onCheckedChange={(checked) => setCloneForm({ ...cloneForm, copyAssignments: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="clone-exams" className="font-normal cursor-pointer">Copy Exams</Label>
                  <Switch
                    id="clone-exams"
                    checked={cloneForm.copyExams}
                    onCheckedChange={(checked) => setCloneForm({ ...cloneForm, copyExams: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="clone-sections" className="font-normal cursor-pointer">Copy Sections</Label>
                  <Switch
                    id="clone-sections"
                    checked={cloneForm.copySections}
                    onCheckedChange={(checked) => setCloneForm({ ...cloneForm, copySections: checked })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneDialog(false)} disabled={cloneLoading}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleCloneCourse} disabled={cloneLoading}>
              {cloneLoading ? 'Creating...' : 'Create New Batch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
