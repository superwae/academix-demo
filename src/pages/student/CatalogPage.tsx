import { useMemo, useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { useAuthStore } from '../../store/useAuthStore'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Select } from '../../components/ui/select'
import { courseService, type CourseDto } from '../../services/courseService'
import { enrollmentService } from '../../services/enrollmentService'
import { toast } from 'sonner'
import { X, Search, Filter, Calendar, MapPin, Video, BookOpen, Globe, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/cn'

type Filters = {
  category: string | 'All'
  providerType: string | 'All'
  modality: string | 'All'
  day: string | 'All'
}

export function CatalogPage() {
  const { enrolled } = useAppStore((s) => s.data)
  const { isAuthenticated } = useAuthStore()
  const [myEnrollments, setMyEnrollments] = useState<{ courseId: string; sectionId: string }[]>([])
  const [loadingEnrollments, setLoadingEnrollments] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [courses, setCourses] = useState<CourseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>({
    category: 'All',
    providerType: 'All',
    modality: 'All',
    day: 'All',
  })
  const [openCourseId, setOpenCourseId] = useState<string | null>(null)
  const [openCourseDetails, setOpenCourseDetails] = useState<CourseDto | null>(null)
  const [loadingCourseDetails, setLoadingCourseDetails] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [conflict, setConflict] = useState<{ withCourseTitle: string } | null>(null)
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null)

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true)
        const result = await courseService.getCourses({ pageSize: 100 })
        setCourses(result.items)
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

  // Load current user's enrollments from API (not local store)
  const loadMyEnrollments = async () => {
    if (!isAuthenticated) {
      setMyEnrollments([])
      return
    }

    try {
      setLoadingEnrollments(true)
      const result = await enrollmentService.getMyEnrollments({ pageSize: 100 })
      // Only include Active or Completed enrollments
      const activeEnrollments = result.items
        .filter(e => e.status === 'Active' || e.status === 'Completed')
        .map(e => ({ courseId: e.courseId, sectionId: e.sectionId }))
      setMyEnrollments(activeEnrollments)
    } catch (error) {
      console.error('Failed to load enrollments:', error)
      // Don't show error toast - just use empty array
      setMyEnrollments([])
    } finally {
      setLoadingEnrollments(false)
    }
  }

  useEffect(() => {
    loadMyEnrollments()

    // Listen for enrollment changes to refresh catalog
    const handleEnrollmentChange = () => {
      loadMyEnrollments()
    }
    window.addEventListener('enrollmentChanged', handleEnrollmentChange)
    
    return () => {
      window.removeEventListener('enrollmentChanged', handleEnrollmentChange)
    }
  }, [isAuthenticated])

  const categories = useMemo(() => uniq(courses.map((c) => c.category).filter(Boolean)), [courses])

  // Keyboard shortcut for search (press / to focus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((v) => v !== 'All').length
  }, [filters])

  const clearFilters = () => {
    setFilters({
      category: 'All',
      providerType: 'All',
      modality: 'All',
      day: 'All',
    })
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return courses.filter((c) => {
      if (q) {
        const hay = `${c.title} ${c.providerName} ${c.instructorName} ${c.category} ${c.description}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filters.category !== 'All' && c.category !== filters.category) return false
      if (filters.providerType !== 'All' && c.providerType !== filters.providerType) return false
      if (filters.modality !== 'All' && c.modality !== filters.modality) return false
      if (filters.day !== 'All') {
        const hasDay = c.sections.some((s) => s.meetingTimes.some((mt) => mt.day === filters.day))
        if (!hasDay) return false
      }
      return true
    })
  }, [courses, query, filters])

  // Reload enrollments when dialog opens to ensure fresh data
  useEffect(() => {
    if (!openCourseId || !isAuthenticated) return

    const reloadEnrollments = async () => {
      try {
        const result = await enrollmentService.getMyEnrollments({ pageSize: 100 })
        // Only include Active or Completed enrollments
        const activeEnrollments = result.items
          .filter(e => e.status === 'Active' || e.status === 'Completed')
          .map(e => ({ courseId: e.courseId, sectionId: e.sectionId }))
        setMyEnrollments(activeEnrollments)
      } catch (error) {
        console.error('Failed to reload enrollments:', error)
      }
    }

    reloadEnrollments()
  }, [openCourseId, isAuthenticated])

  // Use course from list if available, otherwise fetch details
  useEffect(() => {
    if (!openCourseId) {
      setOpenCourseDetails(null)
      return
    }

    // First, try to use course from the list (faster, already has sections)
    const courseFromList = courses.find(c => c.id === openCourseId)
    if (courseFromList) {
      setOpenCourseDetails(courseFromList)
      setLoadingCourseDetails(false)
      // Auto-select first section if available
      if (courseFromList.sections && courseFromList.sections.length > 0) {
        setSelectedSectionId(courseFromList.sections[0].id)
      } else {
        setSelectedSectionId(null)
      }
      return
    }

    // If not in list or missing sections, fetch from API
    const loadCourseDetails = async () => {
      try {
        setLoadingCourseDetails(true)
        const courseDetails = await courseService.getCourseById(openCourseId)
        setOpenCourseDetails(courseDetails)
        // Auto-select first section if available
        if (courseDetails.sections && courseDetails.sections.length > 0) {
          setSelectedSectionId(courseDetails.sections[0].id)
        } else {
          setSelectedSectionId(null)
        }
      } catch (error) {
        toast.error('Failed to load course details', {
          description: error instanceof Error ? error.message : 'Please try again later',
        })
        setOpenCourseId(null)
      } finally {
        setLoadingCourseDetails(false)
      }
    }

    loadCourseDetails()
  }, [openCourseId, courses])

  const openCourse = openCourseDetails
  
  // Check if current user is already enrolled in this course (from API, not local store)
  // Only checks for Active or Completed enrollments (myEnrollments is already filtered)
  const isAlreadyEnrolled = useMemo(() => {
    if (!openCourse || !isAuthenticated) return false
    // Use myEnrollments from API, which is already filtered to only Active/Completed enrollments
    return myEnrollments.some((e) => e.courseId === openCourse.id)
  }, [openCourse, myEnrollments, isAuthenticated])
  
  const handleEnroll = async () => {
    if (!openCourse || !selectedSectionId) {
      setEnrollmentError('Please select a section to enroll.')
      return
    }

    if (!isAuthenticated) {
      setEnrollmentError('Please sign in to enroll in courses.')
      return
    }

    const selectedSection = openCourse.sections.find((s) => s.id === selectedSectionId)
    if (!selectedSection) {
      setEnrollmentError('Selected section not found.')
      return
    }

    setEnrollmentError(null)

    // Check for conflicts with actual enrollments from API (only Active/Completed)
    // Use myEnrollments which is already filtered to only Active/Completed enrollments
    const res = checkConflict({ course: openCourse, section: selectedSection }, courses, myEnrollments)
    if (res.conflict) {
      setConflict({ withCourseTitle: res.withCourseTitle ?? 'another class' })
      return
    }

    try {
      await enrollmentService.enroll({
        courseId: openCourse.id,
        sectionId: selectedSectionId,
      })
      
      toast.success('Successfully enrolled!', {
        description: `${openCourse.title} • ${selectedSection.name}`,
      })
      
      // Update local enrolled state (for UI consistency)
      const enroll = useAppStore.getState().enroll
      enroll(openCourse.id, selectedSectionId)
      
      // Update my enrollments from API response
      setMyEnrollments(prev => [...prev, { courseId: openCourse.id, sectionId: selectedSectionId }])
      
      // Reload enrollments from API to ensure consistency
      try {
        const enrollmentsResult = await enrollmentService.getMyEnrollments({ pageSize: 100 })
        const activeEnrollments = enrollmentsResult.items
          .filter(e => e.status === 'Active' || e.status === 'Completed')
          .map(e => ({ courseId: e.courseId, sectionId: e.sectionId }))
        setMyEnrollments(activeEnrollments)
      } catch (error) {
        console.error('Failed to reload enrollments:', error)
      }
      
      // Close dialog
      setOpenCourseId(null)
      setSelectedSectionId(null)
      setConflict(null)
      setEnrollmentError(null)
      
      // Reload courses to update seat counts
      const result = await courseService.getCourses({ pageSize: 100 })
      setCourses(result.items)
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Please try again later.'
      if (raw.includes('Section is full')) setEnrollmentError('This section is full. Please choose another section.')
      else if (raw.includes('already enrolled')) setEnrollmentError('You are already enrolled in this course.')
      else if (raw.includes('overlap') || raw.includes('conflict')) setEnrollmentError('This section conflicts with another class.')
      else setEnrollmentError(raw.replace(/^Cannot enroll:\s*/i, '').trim() || 'Unable to complete enrollment. Please try again.')
    }
  }
  const selectedSection = useMemo(() => {
    if (!openCourse || !selectedSectionId) return null
    return openCourse.sections.find((s) => s.id === selectedSectionId) ?? null
  }, [openCourse, selectedSectionId])

  // Check for conflicts whenever section selection or enrollments change
  useEffect(() => {
    if (!openCourse || !selectedSectionId || !selectedSection) {
      setConflict(null)
      return
    }

    // Check for conflicts with actual enrollments from API (only Active/Completed)
    const res = checkConflict({ course: openCourse, section: selectedSection }, courses, myEnrollments)
    if (res.conflict) {
      setConflict({ withCourseTitle: res.withCourseTitle ?? 'another class' })
    } else {
      setConflict(null)
    }
  }, [openCourse, selectedSectionId, selectedSection, courses, myEnrollments])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Course Catalog</div>
          <div className="text-sm text-muted-foreground">Browse, filter, and enroll in sections</div>
        </div>
      </div>

      {/* Search and filter at the top */}
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses, instructors, providers… (Press / to focus)"
              className="pl-11"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select
            value={filters.category}
            onValueChange={(value) => setFilters((f) => ({ ...f, category: value as Filters['category'] }))}
            placeholder="All categories"
            options={[
              { value: 'All', label: 'All categories' },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
          />
          <Select
            value={filters.modality}
            onValueChange={(value) => setFilters((f) => ({ ...f, modality: value as Filters['modality'] }))}
            placeholder="All modalities"
            options={[
              { value: 'All', label: 'All modalities' },
              { value: 'Online', label: 'Online' },
              { value: 'In-person', label: 'In-person' },
              { value: 'Hybrid', label: 'Hybrid' },
            ]}
          />
        </div>

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {filters.category !== 'All' && (
              <Badge variant="subtle" className="gap-1.5 pr-1.5">
                Category: {filters.category}
                <button
                  onClick={() => setFilters((f) => ({ ...f, category: 'All' }))}
                  className="ml-1 rounded-full hover:bg-background/50 p-0.5 transition-colors"
                  aria-label={`Remove category filter: ${filters.category}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.modality !== 'All' && (
              <Badge variant="subtle" className="gap-1.5 pr-1.5">
                Modality: {filters.modality}
                <button
                  onClick={() => setFilters((f) => ({ ...f, modality: 'All' }))}
                  className="ml-1 rounded-full hover:bg-background/50 p-0.5 transition-colors"
                  aria-label={`Remove modality filter: ${filters.modality}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.providerType !== 'All' && (
              <Badge variant="subtle" className="gap-1.5 pr-1.5">
                Provider: {filters.providerType}
                <button
                  onClick={() => setFilters((f) => ({ ...f, providerType: 'All' }))}
                  className="ml-1 rounded-full hover:bg-background/50 p-0.5 transition-colors"
                  aria-label={`Remove provider filter: ${filters.providerType}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.day !== 'All' && (
              <Badge variant="subtle" className="gap-1.5 pr-1.5">
                Day: {filters.day}
                <button
                  onClick={() => setFilters((f) => ({ ...f, day: 'All' }))}
                  className="ml-1 rounded-full hover:bg-background/50 p-0.5 transition-colors"
                  aria-label={`Remove day filter: ${filters.day}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
              Clear all
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : results.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl mb-2">No courses found</CardTitle>
            <CardDescription className="max-w-md">
              {query || activeFiltersCount > 0
                ? "Try adjusting your search or filters to find more courses."
                : "No courses available at the moment."}
            </CardDescription>
            {(query || activeFiltersCount > 0) && (
              <Button variant="outline" size="sm" onClick={() => { setQuery(''); clearFilters(); }} className="mt-4">
                Clear search and filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {results.map((c, index) => {
            // Check enrollment from API data (user-specific), not local store
            const isEnrolled = isAuthenticated && myEnrollments.some((e) => e.courseId === c.id)
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ 
                  y: -4,
                  transition: { duration: 0.2, ease: "easeOut" }
                }}
                className="group"
              >
                  <Card className="h-full hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 border-2 border-transparent hover:border-primary/20 overflow-hidden relative">
                {/* Course photo */}
                <div className="relative h-40 w-full shrink-0 overflow-hidden bg-muted">
                  {c.thumbnailUrl ? (
                    <img
                      src={c.thumbnailUrl}
                      alt={c.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement
                        el.style.display = 'none'
                        const next = el.nextElementSibling as HTMLElement
                        if (next) next.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5"
                    style={{ display: c.thumbnailUrl ? 'none' : 'flex' }}
                  >
                    <BookOpen className="h-12 w-12 text-primary/40" />
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-1">{c.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {c.providerName} • {c.instructorName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="subtle">{c.category}</Badge>
                    <Badge variant="subtle">{c.level}</Badge>
                    <Badge variant="subtle">{c.modality}</Badge>
                    {c.tags.slice(0, 2).map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-3">{c.description}</div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-xs text-muted-foreground">⭐ {c.rating.toFixed(1)}</div>
                    <div className="text-sm font-semibold">
                      {c.price ? `$${c.price.toFixed(2)}` : <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Free</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <Link to={`/courses/${c.id}`}>View Details</Link>
                    </Button>
                    <Button
                      variant={isEnrolled ? 'secondary' : 'default'}
                      size="sm"
                      onClick={() => {
                        setOpenCourseId(c.id)
                        setConflict(null)
                      }}
                      className="flex-1"
                    >
                      {isEnrolled ? 'View Sections' : 'Enroll'}
                    </Button>
                  </div>
                </CardFooter>
                  </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Dialog
        open={!!openCourseId}
        onOpenChange={(o) => {
          if (!o) {
            setOpenCourseId(null)
            setSelectedSectionId(null)
            setConflict(null)
            setEnrollmentError(null)
            setOpenCourseDetails(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          {loadingCourseDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                <p className="text-sm text-muted-foreground">Loading course details...</p>
              </div>
            </div>
          ) : openCourse ? (
            <>
              <DialogHeader>
                <DialogTitle>{openCourse.title}</DialogTitle>
                <DialogDescription>
                  {openCourse.providerName} • {openCourse.instructorName} • ⭐ {openCourse.rating.toFixed(1)}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">About</div>
                  <div className="text-sm text-muted-foreground">{openCourse.description}</div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Badge variant="subtle">{openCourse.category}</Badge>
                    <Badge variant="subtle">{openCourse.level}</Badge>
                    <Badge variant="subtle">{openCourse.modality}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Choose a section</div>
                  <p className="text-xs text-muted-foreground">
                    Times sync with your Calendar after you enroll.
                  </p>
                  {isAlreadyEnrolled && (
                    <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
                      <div className="font-medium text-primary">Already Enrolled</div>
                      <div className="mt-1 text-muted-foreground">
                        You are already enrolled in this course. You can only enroll in one section per course.
                      </div>
                    </div>
                  )}
                  {openCourse.sections && openCourse.sections.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scroll-fancy">
                      {openCourse.sections.map((sec) => (
                        <label
                          key={sec.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all",
                            selectedSectionId === sec.id
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border hover:border-primary/40 hover:bg-muted/30"
                          )}
                        >
                          <div className="relative mt-0.5 shrink-0">
                            <input
                              type="radio"
                              name="section"
                              className="h-5 w-5 cursor-pointer accent-primary"
                              checked={selectedSectionId === sec.id}
                              onChange={() => setSelectedSectionId(sec.id)}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="text-sm font-semibold">
                                {sec.name}
                              </div>
                              <Badge variant={sec.seatsRemaining > 0 ? "secondary" : "destructive"} className="text-xs shrink-0">
                                {sec.seatsRemaining > 0 ? `${sec.seatsRemaining} seats left` : "Full"}
                              </Badge>
                            </div>
                            {sec.meetingTimes && sec.meetingTimes.length > 0 ? (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                                <Calendar className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                                <span>{formatMeetingTimesForDisplay(sec.meetingTimes)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                                <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                <span>Schedule TBD</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                              <span>{sec.locationLabel}</span>
                            </div>
                            {sec.joinUrl && (
                              <div className="flex items-center gap-2 text-xs text-primary mt-1">
                                <Globe className="h-3.5 w-3.5 shrink-0" />
                                <span>Online meeting available</span>
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border/50 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                      No sections available for this course.
                    </div>
                  )}
                </div>
              </div>

              {(conflict || enrollmentError) && (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">
                      {conflict ? 'Schedule conflict' : 'Enrollment issue'}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {conflict
                        ? `This section overlaps with ${conflict.withCourseTitle}. Choose another section.`
                        : enrollmentError}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setConflict(null); setEnrollmentError(null) }}
                      className="mt-2 text-primary hover:underline text-xs font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenCourseId(null)}>
                  Close
                </Button>
                <Button
                  onClick={handleEnroll}
                  disabled={!selectedSectionId || isAlreadyEnrolled}
                >
                  {isAlreadyEnrolled ? 'Already Enrolled' : 'Confirm enroll'}
                </Button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Failed to load course details</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenCourseId(null)}
                className="mt-4"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr)).sort()
}

const DAY_FULL: Record<string, string> = {
  Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
  Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday',
  Sunday: 'Sunday', Monday: 'Monday', Tuesday: 'Tuesday', Wednesday: 'Wednesday',
  Thursday: 'Thursday', Friday: 'Friday', Saturday: 'Saturday',
}

function formatMeetingTimes(times: any[]) {
  if (!times || times.length === 0) return 'No scheduled meetings'
  return times
    .map((t) => {
      const startMin = t.startMinutes ?? t.startMin ?? 0
      const endMin = t.endMinutes ?? t.endMin ?? 0
      return `${t.day} ${minToTime(startMin)}–${minToTime(endMin)}`
    })
    .join(', ')
}

function formatMeetingTimesForDisplay(times: any[]) {
  if (!times || times.length === 0) return 'No scheduled meetings'
  return times
    .map((t) => {
      const startMin = t.startMinutes ?? t.startMin ?? 0
      const endMin = t.endMinutes ?? t.endMin ?? 0
      const day = (t.day && DAY_FULL[t.day]) ? DAY_FULL[t.day] : t.day
      return `${day} ${minToTime(startMin)}–${minToTime(endMin)}`
    })
    .join(', ')
}

function minToTime(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  const hh = ((h + 11) % 12) + 1
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`
}

function overlaps(a: any, b: any) {
  for (const ta of a.meetingTimes || []) {
    for (const tb of b.meetingTimes || []) {
      if (ta.day !== tb.day) continue
      if (ta.startMinutes < tb.endMinutes && tb.startMinutes < ta.endMinutes) return true
    }
  }
  return false
}

function checkConflict(
  candidate: { course: CourseDto; section: any },
  allCourses: CourseDto[],
  enrolled: { courseId: string; sectionId: string }[],
): { conflict: boolean; withCourseTitle?: string } {
  for (const e of enrolled) {
    if (e.courseId === candidate.course.id) continue
    const course = allCourses.find((c) => c.id === e.courseId)
    if (!course) continue
    const section = course.sections.find((s) => s.id === e.sectionId)
    if (!section) continue
    if (overlaps(section, candidate.section)) return { conflict: true, withCourseTitle: course.title }
  }
  return { conflict: false }
}



