import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog'
import type { Course, CourseSection, DayOfWeek, MeetingTime, Modality, ProviderType } from '../types/academix'
import { toast } from 'sonner'

type Filters = {
  category: string | 'All'
  providerType: ProviderType | 'All'
  modality: Modality | 'All'
  day: DayOfWeek | 'All'
}

export function CatalogPage() {
  const { courses, enrolled } = useAppStore((s) => s.data)
  const enroll = useAppStore((s) => s.enroll)

  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>({
    category: 'All',
    providerType: 'All',
    modality: 'All',
    day: 'All',
  })
  const [openCourseId, setOpenCourseId] = useState<string | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [conflict, setConflict] = useState<{ withCourseTitle: string } | null>(null)

  const categories = useMemo(() => uniq(courses.map((c) => c.category)), [courses])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return courses.filter((c) => {
      if (q) {
        const hay = `${c.title} ${c.providerName} ${c.instructor} ${c.category} ${c.description}`.toLowerCase()
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

  const openCourse = useMemo(() => courses.find((c) => c.id === openCourseId) ?? null, [courses, openCourseId])
  const selectedSection = useMemo(() => {
    if (!openCourse || !selectedSectionId) return null
    return openCourse.sections.find((s) => s.id === selectedSectionId) ?? null
  }, [openCourse, selectedSectionId])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Course Catalog</div>
          <div className="text-sm text-muted-foreground">Browse, filter, and enroll in sections</div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search courses, instructors, providers…" />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value as Filters['category'] }))}
        >
          <option value="All">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={filters.modality}
          onChange={(e) => setFilters((f) => ({ ...f, modality: e.target.value as Filters['modality'] }))}
        >
          <option value="All">All modalities</option>
          <option value="Online">Online</option>
          <option value="In-person">In-person</option>
          <option value="Hybrid">Hybrid</option>
        </select>
      </div>

      {results.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-6">
          <div className="text-sm font-medium">No courses match your filters</div>
          <div className="mt-1 text-sm text-muted-foreground">Try broadening your search.</div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((c) => {
            const isEnrolled = enrolled.some((e) => e.courseId === c.id)
            return (
              <Card key={c.id} className="transition-transform hover:-translate-y-0.5">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{c.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {c.providerName} • {c.instructor}
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
                <CardFooter className="justify-between gap-2">
                  <div className="text-xs text-muted-foreground">⭐ {c.rating.toFixed(1)}</div>
                  <Button
                    variant={isEnrolled ? 'secondary' : 'default'}
                    size="sm"
                    onClick={() => {
                      setOpenCourseId(c.id)
                      setSelectedSectionId(c.sections[0]?.id ?? null)
                      setConflict(null)
                    }}
                  >
                    {isEnrolled ? 'View sections' : 'Details & enroll'}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog
        open={!!openCourse}
        onOpenChange={(o) => {
          if (!o) {
            setOpenCourseId(null)
            setSelectedSectionId(null)
            setConflict(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          {openCourse && (
            <>
              <DialogHeader>
                <DialogTitle>{openCourse.title}</DialogTitle>
                <DialogDescription>
                  {openCourse.providerName} • {openCourse.instructor} • ⭐ {openCourse.rating.toFixed(1)}
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
                  <div className="space-y-2">
                    {openCourse.sections.map((sec) => (
                      <label
                        key={sec.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-accent/40"
                      >
                        <input
                          type="radio"
                          name="section"
                          className="mt-1"
                          checked={selectedSectionId === sec.id}
                          onChange={() => setSelectedSectionId(sec.id)}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            {sec.name}{' '}
                            <span className="text-xs font-normal text-muted-foreground">
                              • {sec.seatsRemaining} seats left
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">{formatMeetingTimes(sec.meetingTimes)}</div>
                          <div className="text-xs text-muted-foreground">{sec.locationLabel}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {conflict && (
                <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <div className="font-medium text-destructive">Schedule conflict detected</div>
                  <div className="mt-1 text-muted-foreground">
                    This section overlaps with <span className="font-medium">{conflict.withCourseTitle}</span>. Choose another section.
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenCourseId(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedSection || !openCourse) return
                    const res = checkConflict({ course: openCourse, section: selectedSection }, courses, enrolled)
                    if (res.conflict) {
                      setConflict({ withCourseTitle: res.withCourseTitle ?? 'another class' })
                      toast.error('Conflict detected', { description: 'This section overlaps with an enrolled class.' })
                      return
                    }
                    enroll(openCourse.id, selectedSection.id)
                    toast.success('Enrolled', { description: `${openCourse.title} • ${selectedSection.name}` })
                    setOpenCourseId(null)
                  }}
                >
                  Confirm enroll
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr)).sort()
}

function formatMeetingTimes(times: MeetingTime[]) {
  return times
    .map((t) => `${t.day} ${minToTime(t.startMin)}–${minToTime(t.endMin)}`)
    .join(', ')
}

function minToTime(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  const hh = ((h + 11) % 12) + 1
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`
}

function overlaps(a: CourseSection, b: CourseSection) {
  for (const ta of a.meetingTimes) {
    for (const tb of b.meetingTimes) {
      if (ta.day !== tb.day) continue
      if (ta.startMin < tb.endMin && tb.startMin < ta.endMin) return true
    }
  }
  return false
}

function checkConflict(
  candidate: { course: Course; section: CourseSection },
  allCourses: Course[],
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



