import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import type { Course, CourseSection } from '../types/academix'

export function MyClassesPage() {
  const { courses, enrolled } = useAppStore((s) => s.data)
  const unenroll = useAppStore((s) => s.unenroll)

  const classes = useMemo(() => {
    return enrolled
      .map((e) => {
        const course = courses.find((c) => c.id === e.courseId)
        if (!course) return null
        const section = course.sections.find((s) => s.id === e.sectionId)
        if (!section) return null
        return { course, section }
      })
      .filter((x): x is { course: Course; section: CourseSection } => x !== null)
  }, [courses, enrolled])

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">My Classes</div>
        <div className="text-sm text-muted-foreground">Your enrolled sections and upcoming meetings</div>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-6">
          <div className="text-sm font-medium">No enrolled classes</div>
          <div className="mt-1 text-sm text-muted-foreground">Enroll from the Course Catalog to populate this page.</div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.map(({ course, section }) => (
            <Card key={`${course.id}:${section.id}`}>
              <CardHeader>
                <CardTitle>{course.title}</CardTitle>
                <CardDescription>
                  {course.providerName} • {course.instructor}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="subtle">{course.category}</Badge>
                  <Badge variant="subtle">{course.modality}</Badge>
                  <Badge variant="outline">{section.name}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">{section.locationLabel}</div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => unenroll(course.id)}>
                    Unenroll (demo)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


