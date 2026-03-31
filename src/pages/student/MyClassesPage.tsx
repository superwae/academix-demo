import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { enrollmentService, type EnrollmentDto } from '../../services/enrollmentService'
import { courseService, type CourseDto } from '../../services/courseService'
import { GraduationCap, BookOpen, Clock, MapPin, Calendar, TrendingUp, Award, BookMarked } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface EnrollmentWithCourse extends EnrollmentDto {
  course?: CourseDto
}

function isEnrollmentCompleted(enrollment: EnrollmentWithCourse): boolean {
  return enrollment.status === 'Completed' || enrollment.progressPercentage >= 100
}

function EnrollmentCard({ enrollment }: { enrollment: EnrollmentWithCourse }) {
  const course = enrollment.course
  const section = course?.sections.find((s) => s.id === enrollment.sectionId)
  const completed = isEnrollmentCompleted(enrollment)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
      className="group"
    >
      <Card className="relative h-full overflow-hidden border-2 border-transparent transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/20">
        {course?.thumbnailUrl && (
          <motion.div
            className="relative h-32 w-full overflow-hidden rounded-t-lg"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </motion.div>
        )}
        <CardHeader>
          <CardTitle className="line-clamp-2">
            {course ? (
              <Link to={`/courses/${course.id}`} className="transition-colors hover:text-primary">
                {enrollment.courseTitle}
              </Link>
            ) : (
              enrollment.courseTitle
            )}
          </CardTitle>
          <CardDescription>
            {course?.providerName || 'Course'} • {course?.instructorName || 'Instructor'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {course && (
              <>
                <Badge variant="subtle">{course.category}</Badge>
                <Badge variant="subtle">{course.modality}</Badge>
              </>
            )}
            <Badge variant="outline">{enrollment.sectionName}</Badge>
            <Badge variant={enrollment.status === 'Active' ? 'default' : 'secondary'}>{enrollment.status}</Badge>
          </div>

          {section && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {section.locationLabel}
              </div>
              {section.meetingTimes && section.meetingTimes.length > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {section.meetingTimes.length} meeting{section.meetingTimes.length !== 1 ? 's' : ''} per week
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Enrolled {format(new Date(enrollment.enrolledAt), 'MMM d, yyyy')}</span>
            </div>
            {enrollment.progressPercentage > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium">{enrollment.progressPercentage.toFixed(0)}%</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {course && (
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link to={`/courses/${course.id}`}>View Course</Link>
              </Button>
            )}
            {course && completed && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full border-2 border-[#c9a962] bg-gradient-to-b from-[#fffbeb] to-[#fef3c7] font-medium text-[#78350f] shadow-sm transition-colors hover:from-[#fefce8] hover:to-[#fde68a] hover:text-[#451a03] dark:border-[#b8974a] dark:from-[#422006]/90 dark:to-[#451a03]/90 dark:text-[#fde68a] dark:hover:from-[#57320d] dark:hover:to-[#451a03]"
              >
                <Link to={`/student/my-classes/${course.id}/certificate`}>
                  <Award className="mr-2 h-4 w-4 text-[#b45309] dark:text-amber-300" />
                  View Certificate
                </Link>
              </Button>
            )}
            {course && enrollment.status === 'Active' && (
              <Button variant="default" size="sm" asChild className="w-full bg-primary hover:bg-primary/90">
                <Link to={`/student/my-classes/${course.id}/lessons`}>Lessons</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function MyClassesPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([])
  const [loading, setLoading] = useState(true)

  const { completed, inProgress } = useMemo(() => {
    const completedList: EnrollmentWithCourse[] = []
    const inProgressList: EnrollmentWithCourse[] = []
    for (const e of enrollments) {
      if (isEnrollmentCompleted(e)) completedList.push(e)
      else inProgressList.push(e)
    }
    return { completed: completedList, inProgress: inProgressList }
  }, [enrollments])

  useEffect(() => {
    const loadEnrollments = async () => {
      try {
        setLoading(true)
        const result = await enrollmentService.getMyEnrollments({ pageSize: 100 })

        const enrollmentsWithCourses = await Promise.all(
          result.items.map(async (enrollment) => {
            try {
              const course = await courseService.getCourseById(enrollment.courseId)
              return { ...enrollment, course }
            } catch (error) {
              console.error(`Failed to load course ${enrollment.courseId}:`, error)
              return enrollment
            }
          }),
        )

        setEnrollments(enrollmentsWithCourses)
      } catch (error) {
        toast.error('Failed to load enrollments', {
          description: error instanceof Error ? error.message : 'Please try again later',
        })
      } finally {
        setLoading(false)
      }
    }

    loadEnrollments()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="text-2xl font-semibold">My Classes</div>
          <div className="text-sm text-muted-foreground">Your enrolled sections and upcoming meetings</div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-3/4 rounded bg-muted" />
                <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div>
        <div className="text-2xl font-semibold">My Classes</div>
        <div className="text-sm text-muted-foreground">Your enrolled sections and upcoming meetings</div>
      </div>

      {enrollments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-4 rounded-full bg-muted p-4"
            >
              <GraduationCap className="h-8 w-8 text-muted-foreground" />
            </motion.div>
            <CardTitle className="mb-2 text-xl">No enrolled classes</CardTitle>
            <CardDescription className="mb-4 max-w-md">
              Enroll from the Course Catalog to see your classes appear here.
            </CardDescription>
            <Button variant="default" asChild>
              <Link to="/student/catalog">
                <BookOpen className="mr-2 h-4 w-4" />
                Browse Catalog
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {inProgress.length > 0 && (
            <section className="space-y-4" aria-labelledby="in-progress-heading">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <BookMarked className="h-5 w-5 text-primary" aria-hidden />
                <div>
                  <h2 id="in-progress-heading" className="text-lg font-semibold tracking-tight">
                    In progress
                  </h2>
                  <p className="text-sm text-muted-foreground">Courses you are currently taking</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inProgress.map((enrollment) => (
                  <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="space-y-4" aria-labelledby="completed-heading">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Award className="h-5 w-5 text-[#b45309] dark:text-amber-400" aria-hidden />
                <div>
                  <h2 id="completed-heading" className="text-lg font-semibold tracking-tight">
                    Completed
                  </h2>
                  <p className="text-sm text-muted-foreground">Courses you have finished — view your certificate below</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completed.map((enrollment) => (
                  <EnrollmentCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
