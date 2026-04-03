import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  Trash2, 
  GripVertical,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  FolderPlus
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
import type { CourseDto } from '../../services/courseService'
import { teacherService } from '../../services/teacherService'
import { lessonService, type LessonDto, type CourseSectionDto } from '../../services/lessonService'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import { cn } from '../../lib/cn'

/** Keeps drag movement vertical so rows cannot be pulled sideways out of the list. */
const restrictDragToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
})

function SortableLessonRow({
  lesson,
  onSelect,
  disabled,
}: {
  lesson: LessonDto
  onSelect: (lesson: LessonDto) => void
  disabled: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex w-full min-w-0 max-w-full items-center gap-2 p-2 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors',
        isDragging && 'shadow-md ring-2 ring-primary/35 bg-muted/50 z-10'
      )}
    >
      <button
        type="button"
        className={cn(
          'shrink-0 touch-none cursor-grab active:cursor-grabbing rounded-md p-0.5 text-muted-foreground hover:bg-muted/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          disabled && 'opacity-40 cursor-not-allowed'
        )}
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        disabled={disabled}
        aria-label="Drag to reorder lesson"
      >
        <GripVertical className="h-4 w-4 pointer-events-none" />
      </button>
      <button
        type="button"
        className="flex-1 min-w-0 text-left rounded-md -m-1 p-1 hover:bg-muted/30 transition-colors disabled:opacity-50"
        onClick={() => !disabled && onSelect(lesson)}
        disabled={disabled}
      >
        <div className="text-sm font-medium truncate">{lesson.title}</div>
        <div className="text-xs text-muted-foreground">
          {lesson.videoUrl ? 'Video' : 'Text'} • {lesson.durationMinutes || 0} min
        </div>
      </button>
      {lesson.isPreview && (
        <Badge variant="outline" className="text-xs shrink-0">
          Preview
        </Badge>
      )}
    </div>
  )
}

export function LessonsContentPage() {
  const [courses, setCourses] = useState<CourseDto[]>([])
  const [sections, setSections] = useState<CourseSectionDto[]>([])
  const [lessons, setLessons] = useState<LessonDto[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [selectedSection, setSelectedSection] = useState<string>('')
  const [editingLesson, setEditingLesson] = useState<LessonDto | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAddSectionDialog, setShowAddSectionDialog] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null)

  const lessonsSorted = useMemo(
    () => [...lessons].sort((a, b) => a.order - b.order),
    [lessons]
  )

  const lessonIds = useMemo(() => lessonsSorted.map(l => l.id), [lessonsSorted])

  /** Natural content height estimate; scroll only when it exceeds the cap. */
  const LESSON_LIST_SCROLL_CAP_PX = 384
  const lessonListIntrinsicPx = useMemo(() => {
    const n = lessonsSorted.length
    if (n === 0) return 0
    const rowApprox = 72
    const gap = 6
    return n * rowApprox + Math.max(0, n - 1) * gap + 4
  }, [lessonsSorted.length])

  const lessonListNeedsInternalScroll = lessonListIntrinsicPx > LESSON_LIST_SCROLL_CAP_PX

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleLessonsDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const prevSorted = [...lessons].sort((a, b) => a.order - b.order)
      const ids = prevSorted.map(l => l.id)
      const oldIndex = ids.indexOf(active.id as string)
      const newIndex = ids.indexOf(over.id as string)
      if (oldIndex === -1 || newIndex === -1) return

      const newIds = arrayMove(ids, oldIndex, newIndex)
      const byId = new Map(prevSorted.map(l => [l.id, l]))
      const reordered = newIds.map(id => byId.get(id)!)
      const reindexed = reordered.map((l, i) => ({ ...l, order: i + 1 }))

      setLessons(reindexed)
      setEditingLesson(ed => {
        if (!ed) return ed
        const next = reindexed.find(l => l.id === ed.id)
        return next ?? ed
      })

      const toUpdate = reindexed.filter(l => {
        const p = prevSorted.find(x => x.id === l.id)
        return p !== undefined && p.order !== l.order
      })
      if (toUpdate.length === 0) return

      try {
        await Promise.all(toUpdate.map(l => lessonService.updateLesson(l.id, { order: l.order })))
      } catch {
        toast.error('Failed to update lesson order', {
          description: 'Refreshing lessons...',
        })
        if (selectedSection) {
          const sectionLessons = await lessonService.getSectionLessons(selectedSection)
          setLessons(sectionLessons)
        }
      }
    },
    [lessons, selectedSection]
  )

  // Load courses on mount
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const result = await teacherService.getMyCourses({ pageSize: 100 })
        setCourses(result.items)
      } catch (error) {
        toast.error('Failed to load courses', {
          description: error instanceof Error ? error.message : 'Please try again later',
        })
      }
    }
    loadCourses()
  }, [])

  // Load sections when course is selected
  useEffect(() => {
    if (selectedCourse) {
      const loadSections = async () => {
        try {
          setLoading(true)
          const courseSections = await lessonService.getCourseSections(selectedCourse)
          setSections(courseSections)
          setSelectedSection('') // Reset section selection
          setLessons([]) // Clear lessons
        } catch (error) {
          toast.error('Failed to load sections', {
            description: error instanceof Error ? error.message : 'Please try again later',
          })
        } finally {
          setLoading(false)
        }
      }
      loadSections()
    } else {
      setSections([])
      setLessons([])
    }
  }, [selectedCourse])

  // Load lessons when section is selected
  useEffect(() => {
    if (selectedSection) {
      const loadLessons = async () => {
        try {
          setLoading(true)
          const sectionLessons = await lessonService.getSectionLessons(selectedSection)
          setLessons(sectionLessons)
        } catch (error) {
          toast.error('Failed to load lessons', {
            description: error instanceof Error ? error.message : 'Please try again later',
          })
        } finally {
          setLoading(false)
        }
      }
      loadLessons()
    } else {
      setLessons([])
    }
  }, [selectedSection])

  const handleAddLesson = async () => {
    if (!selectedCourse || !selectedSection) {
      toast.error('Please select a course and section first')
      return
    }

    try {
      setLoading(true)
      const newLesson = await lessonService.createLesson({
        courseId: selectedCourse,
        sectionId: selectedSection,
        title: 'New Lesson',
        description: '',
        videoUrl: '',
        durationMinutes: 0,
        order: lessons.length + 1,
        isPreview: false,
      })
      setLessons([...lessons, newLesson])
      setEditingLesson(newLesson)
      setShowAddForm(false)
      toast.success('Lesson created successfully')
    } catch (error) {
      toast.error('Failed to create lesson', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLesson = async (id: string) => {
    try {
      setLoading(true)
      await lessonService.deleteLesson(id)
      setLessons(lessons.filter(l => l.id !== id))
      if (editingLesson?.id === id) {
        setEditingLesson(null)
      }
      toast.success('Lesson deleted successfully')
    } catch (error) {
      toast.error('Failed to delete lesson', {
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
      const updated = await lessonService.updateLesson(editingLesson.id, {
        title: editingLesson.title,
        description: editingLesson.description,
        videoUrl: editingLesson.videoUrl,
        durationMinutes: editingLesson.durationMinutes,
        order: editingLesson.order,
        isPreview: editingLesson.isPreview,
      })
      setLessons(lessons.map(l => l.id === updated.id ? updated : l))
      setEditingLesson(null)
      toast.success('Lesson updated successfully')
    } catch (error) {
      toast.error('Failed to update lesson', {
        description: error instanceof Error ? error.message : 'Please try again later',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMoveLesson = async (id: string, direction: 'up' | 'down') => {
    const index = lessonsSorted.findIndex(l => l.id === id)
    if (index === -1) return

    const newLessons = [...lessonsSorted]
    let swapped = false
    if (direction === 'up' && index > 0) {
      [newLessons[index - 1], newLessons[index]] = [newLessons[index], newLessons[index - 1]]
      swapped = true
    } else if (direction === 'down' && index < newLessons.length - 1) {
      [newLessons[index], newLessons[index + 1]] = [newLessons[index + 1], newLessons[index]]
      swapped = true
    }

    if (!swapped) return

    const reindexed = newLessons.map((l, i) => ({ ...l, order: i + 1 }))
    setLessons(reindexed)
    setEditingLesson(ed => {
      if (!ed || ed.id !== id) return ed
      return reindexed.find(l => l.id === id) ?? ed
    })

    const i = direction === 'up' ? index - 1 : index
    const j = direction === 'up' ? index : index + 1

    try {
      await Promise.all([
        lessonService.updateLesson(reindexed[i].id, { order: reindexed[i].order }),
        lessonService.updateLesson(reindexed[j].id, { order: reindexed[j].order }),
      ])
    } catch (error) {
      toast.error('Failed to update lesson order', {
        description: 'Refreshing lessons...',
      })
      if (selectedSection) {
        const sectionLessons = await lessonService.getSectionLessons(selectedSection)
        setLessons(sectionLessons)
      }
    }
  }

  const handleAddSection = () => {
    if (!selectedCourse) {
      toast.error('Please select a course first')
      return
    }
    setNewSectionName('')
    setShowAddSectionDialog(true)
  }

  const handleCreateSection = async () => {
    if (!selectedCourse) {
      return
    }

    if (!newSectionName || !newSectionName.trim()) {
      toast.error('Please enter a section name')
      return
    }

    try {
      setLoading(true)
      const newSection = await lessonService.createSection({
        courseId: selectedCourse,
        title: newSectionName.trim(),
        order: sections.length + 1,
      })
      
      // Reload sections
      const courseSections = await lessonService.getCourseSections(selectedCourse)
      setSections(courseSections)
      
      // Select the newly created section
      setSelectedSection(newSection.id)
      
      setShowAddSectionDialog(false)
      setNewSectionName('')
      toast.success('Section created successfully')
    } catch (error) {
      toast.error('Failed to create section', {
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
      className="space-y-3 overflow-x-clip"
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Lessons & Content</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage course lessons and content</p>
        </div>
        <Button 
          onClick={handleAddLesson} 
          variant="gradient"
          disabled={!selectedCourse || !selectedSection || loading}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Lesson
        </Button>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[300px_1fr]">
        {/* Lesson List — h-fit + items-start so this column does not stretch to editor height */}
        <Card className="h-fit w-full min-w-0 max-w-full hover:!translate-y-0 hover:shadow-lg">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-lg">Lessons</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              <span className="block">Select course and section</span>
              {selectedSection && lessonsSorted.length > 1 && (
                <span className="block mt-1 text-muted-foreground">
                  اسحب المقبض (النقاط الست) لإعادة ترتيب الدروس.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Course</label>
              <SelectRoot value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                  {courses.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No courses available</div>
                  )}
                </SelectContent>
              </SelectRoot>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Section</label>
                {selectedCourse && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddSection}
                    disabled={loading}
                    className="h-6 px-2 text-xs"
                  >
                    <FolderPlus className="h-3 w-3 mr-1" />
                    Add Section
                  </Button>
                )}
              </div>
              <SelectRoot 
                value={selectedSection} 
                onValueChange={setSelectedSection}
                disabled={!selectedCourse}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.title}
                    </SelectItem>
                  ))}
                  {sections.length === 0 && selectedCourse && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No sections available</div>
                  )}
                </SelectContent>
              </SelectRoot>
            </div>

            {selectedSection && (
              <div className="pt-2 border-t">
                {loading ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">Loading lessons...</div>
                ) : lessons.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">No lessons in this section</div>
                ) : (
                  <div className="h-fit min-h-0 w-full max-w-full overflow-hidden rounded-md">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictDragToVerticalAxis]}
                      onDragEnd={handleLessonsDragEnd}
                    >
                      <SortableContext items={lessonIds} strategy={verticalListSortingStrategy}>
                        <div
                          className={cn(
                            'h-fit min-h-0 w-full max-w-full overflow-x-hidden touch-pan-y space-y-1.5 pr-1',
                            'overscroll-y-contain [overscroll-behavior-x:none]',
                            lessonListNeedsInternalScroll
                              ? 'overflow-y-auto scroll-fancy [scrollbar-gutter:stable]'
                              : 'overflow-y-visible'
                          )}
                          style={
                            lessonListNeedsInternalScroll
                              ? {
                                  maxHeight: LESSON_LIST_SCROLL_CAP_PX,
                                  overscrollBehavior: 'contain',
                                }
                              : { overscrollBehavior: 'contain' }
                          }
                        >
                          {lessonsSorted.map(lesson => (
                            <SortableLessonRow
                              key={lesson.id}
                              lesson={lesson}
                              disabled={loading}
                              onSelect={l => setEditingLesson(l)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lesson Editor */}
        <Card className="hover:!translate-y-0 hover:shadow-lg">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-lg">
              {editingLesson ? 'Edit Lesson' : 'Lesson Details'}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {editingLesson ? 'Update lesson information' : 'Select a lesson to edit'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {editingLesson ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Lesson Title</label>
                  <Input
                    value={editingLesson.title}
                    onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                    placeholder="Enter lesson title"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Description</label>
                  <Input
                    value={editingLesson.description || ''}
                    onChange={(e) => setEditingLesson({ ...editingLesson, description: e.target.value })}
                    placeholder="Enter lesson description"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Video URL</label>
                    <Input
                      value={editingLesson.videoUrl || ''}
                      onChange={(e) => setEditingLesson({ ...editingLesson, videoUrl: e.target.value })}
                      placeholder="YouTube, Vimeo, Zoom, Google Drive, or direct video URL"
                    />
                    <p className="text-xs text-muted-foreground">
                      Supports: YouTube, Vimeo, Zoom recordings, Google Drive, Loom, Wistia, or direct MP4/WebM links
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Duration (minutes)</label>
                    <Input
                      type="number"
                      min="0"
                      value={editingLesson.durationMinutes || 0}
                      onChange={(e) =>
                        setEditingLesson({ ...editingLesson, durationMinutes: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                  <div>
                    <div className="text-sm font-medium">Preview Lesson</div>
                    <div className="text-xs text-muted-foreground">
                      {editingLesson.isPreview ? 'Students can preview this lesson' : 'Regular lesson'}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingLesson({ ...editingLesson, isPreview: !editingLesson.isPreview })}
                  >
                    {editingLesson.isPreview ? (
                      <>
                        <EyeOff className="h-3 w-3 mr-1" />
                        Remove Preview
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Make Preview
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMoveLesson(editingLesson.id, 'up')}
                    disabled={lessonsSorted.findIndex(l => l.id === editingLesson.id) === 0 || loading}
                  >
                    <ArrowUp className="h-3 w-3 mr-1" />
                    Move Up
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMoveLesson(editingLesson.id, 'down')}
                    disabled={lessonsSorted.findIndex(l => l.id === editingLesson.id) === lessonsSorted.length - 1 || loading}
                  >
                    <ArrowDown className="h-3 w-3 mr-1" />
                    Move Down
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteLessonId(editingLesson.id)}
                    disabled={loading}
                    className="ml-auto"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="gradient"
                    className="flex-1"
                    onClick={handleSaveLesson}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingLesson(null)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Select a lesson from the list to edit</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteLessonId !== null}
        onOpenChange={(open) => { if (!open) setDeleteLessonId(null) }}
        title="Delete Lesson"
        description="Delete this lesson? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (deleteLessonId) {
            await handleDeleteLesson(deleteLessonId)
            setEditingLesson(null)
          }
        }}
      />

      {/* Add Section Dialog */}
      <Dialog open={showAddSectionDialog} onOpenChange={setShowAddSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>
              Create a new section for organizing lessons in this course.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Section Name</label>
              <Input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Enter section name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleCreateSection()
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddSectionDialog(false)
                  setNewSectionName('')
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="gradient"
                onClick={handleCreateSection}
                disabled={loading || !newSectionName.trim()}
              >
                {loading ? 'Creating...' : 'Create Section'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

