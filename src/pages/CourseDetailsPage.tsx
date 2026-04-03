import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { courseService, type CourseDto } from '../services/courseService';
import { enrollmentService } from '../services/enrollmentService';
import { toast } from 'sonner';
import { Star, ArrowLeft, User, BookOpen, Clock, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';

/** Format enrollment error for clean display */
function formatEnrollmentError(msg: string): string {
  if (msg.includes('Section is full')) return 'This section is full. Please choose another section.';
  if (msg.includes('already enrolled')) return 'You are already enrolled in this course.';
  if (msg.includes('overlap') || msg.includes('conflict')) return 'This section conflicts with another class.';
  if (msg.includes('not active')) return 'This section is not available for enrollment.';
  if (msg.includes('not published')) return 'This course is not yet available for enrollment.';
  return msg.replace(/^Cannot enroll:\s*/i, '').trim() || 'Unable to complete enrollment. Please try again.';
}

export function CourseDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollingSectionId, setEnrollingSectionId] = useState<string | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  useEffect(() => {
    const loadCourse = async () => {
      if (!id) {
        navigate('/courses');
        return;
      }

      try {
        setLoading(true);
        const data = await courseService.getCourseById(id);
        setCourse(data);
      } catch (error) {
        toast.error('Failed to load course', {
          description: error instanceof Error ? error.message : 'Please try again later',
        });
        navigate('/courses');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [id, navigate]);

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const handleEnroll = async (sectionId: string, sectionName: string) => {
    if (!course || !id) return;
    
    if (enrollingSectionId === sectionId) {
      return; // Prevent double-click
    }

    setEnrollmentError(null);
    try {
      setEnrollingSectionId(sectionId);
      
      await enrollmentService.enroll({
        courseId: id,
        sectionId: sectionId,
      });

      toast.success('Successfully enrolled!', {
        description: `${course.title} • ${sectionName}`,
      });

      // Update app store
      const enroll = useAppStore.getState().enroll;
      if (enroll) {
        enroll(id, sectionId);
      }

      // Dispatch event to refresh other pages
      window.dispatchEvent(new CustomEvent('enrollmentChanged', {
        detail: { action: 'enrolled', courseId: id, sectionId }
      }));

      // Reload course to update seat counts
      const updatedCourse = await courseService.getCourseById(id);
      setCourse(updatedCourse);
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Please try again later';
      setEnrollmentError(formatEnrollmentError(raw));
    } finally {
      setEnrollingSectionId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-6 py-8 text-center">
        <p className="text-muted-foreground">Course not found</p>
        <Button asChild>
          <Link to="/courses">Back to Courses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{course.title}</CardTitle>
                  <CardDescription className="text-base">
                    {course.instructorName} • {course.category}
                  </CardDescription>
                </div>
                {course.isFeatured && (
                  <Badge variant="default">Featured</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{formatRating(course.rating)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({course.ratingCount} reviews)
                  </span>
                </div>
                <Badge variant="secondary">{course.level}</Badge>
                <Badge variant="outline">{course.modality}</Badge>
                <Badge variant="default" className={course.price ? "text-lg" : "text-lg bg-emerald-500/15 text-emerald-600 border-emerald-500/30"}>
                  {course.price ? `$${course.price.toFixed(2)}` : 'Free'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line">
                {course.description}
              </p>
            </CardContent>
          </Card>

          {/* Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Sections
              </CardTitle>
              <CardDescription>
                Choose a section that fits your schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollmentError && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Enrollment issue</p>
                    <p className="mt-1 text-muted-foreground">{enrollmentError}</p>
                    <button
                      type="button"
                      onClick={() => setEnrollmentError(null)}
                      className="mt-2 text-primary hover:underline text-xs font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              {course.sections.length > 0 ? (
                course.sections.map((section) => (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{section.name}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {section.locationLabel}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {section.seatsRemaining} seats remaining
                          </div>
                        </div>
                      </div>
                      {!section.isActive && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>
                    {section.meetingTimes.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Meeting Times:</div>
                        {section.meetingTimes.map((mt, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">{mt.day}</span>
                            <Clock className="h-4 w-4 ml-2" />
                            <span>
                              {mt.startTime} - {mt.endTime}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {isAuthenticated && section.isActive && (
                      <Button 
                        className="w-full sm:w-auto"
                        onClick={() => handleEnroll(section.id, section.name)}
                        disabled={enrollingSectionId === section.id || section.seatsRemaining <= 0}
                      >
                        {enrollingSectionId === section.id 
                          ? 'Enrolling...' 
                          : section.seatsRemaining <= 0
                          ? 'Section Full'
                          : `Enroll in ${section.name}`}
                      </Button>
                    )}
                    {!isAuthenticated && (
                      <Button asChild className="w-full sm:w-auto">
                        <Link to="/login">Sign in to Enroll</Link>
                      </Button>
                    )}
                  </motion.div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No sections available for this course.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {course.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {course.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Provider</div>
                <div>{course.providerName}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Category</div>
                <div>{course.category}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Level</div>
                <Badge>{course.level}</Badge>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Modality</div>
                <Badge variant="outline">{course.modality}</Badge>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Price</div>
                <div className="text-2xl font-bold">{course.price ? `$${course.price.toFixed(2)}` : <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-base">Free</Badge>}</div>
              </div>
            </CardContent>
          </Card>

          {/* Instructor Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Instructor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-semibold">{course.instructorName}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

