import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { courseService, type CourseDto } from '../services/courseService';
import { enrollmentService, type EnrollmentDto } from '../services/enrollmentService';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { toast } from 'sonner';
import { Star, ArrowLeft, User, BookOpen, Clock, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';


export function CourseDetailsPage() {
  const { t } = useTranslation(['public', 'common']);

  /** Format enrollment error for clean display (inline so it can access t) */
  const formatEnrollmentError = (msg: string): string => {
    if (msg.includes('Section is full')) return t('public:courseDetails.errors.sectionFull');
    if (msg.includes('already enrolled')) return t('public:courseDetails.errors.alreadyEnrolled');
    if (msg.includes('overlap') || msg.includes('conflict')) return t('public:courseDetails.errors.sectionConflict');
    if (msg.includes('not active')) return t('public:courseDetails.errors.sectionNotActive');
    if (msg.includes('not published')) return t('public:courseDetails.errors.courseNotPublished');
    return msg.replace(/^Cannot enroll:\s*/i, '').trim() || t('public:courseDetails.errors.unableEnroll');
  };

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollingSectionId, setEnrollingSectionId] = useState<string | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [existingEnrollment, setExistingEnrollment] = useState<EnrollmentDto | null>(null);
  const [reEnrollConfirm, setReEnrollConfirm] = useState<{ sectionId: string; sectionName: string } | null>(null);

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
        // Check if user has an existing enrollment in this course
        if (isAuthenticated) {
          try {
            const myEnrollments = await enrollmentService.getMyEnrollments({ pageSize: 100 });
            const existing = myEnrollments.items?.find((e: EnrollmentDto) => e.courseId === id);
            if (existing) setExistingEnrollment(existing);
          } catch { /* not enrolled, fine */ }
        }
      } catch (error) {
        toast.error(t('public:courseDetails.loadErrorTitle'), {
          description: error instanceof Error ? error.message : t('public:courseDetails.errors.tryLater'),
        });
        navigate('/courses');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  const handleEnroll = async (sectionId: string, sectionName: string) => {
    if (!course || !id) return;

    if (enrollingSectionId === sectionId) {
      return; // Prevent double-click
    }

    // Block re-enrollment if student is currently active in this course
    if (existingEnrollment && existingEnrollment.status === 'Active') {
      toast.error(t('public:courseDetails.alreadyEnrolledTitle'), {
        description: t('public:courseDetails.alreadyEnrolledBody', {
          section: existingEnrollment.sectionName || t('public:courseDetails.alreadyEnrolledFallbackSection'),
        }),
      });
      return;
    }

    // If student already completed this course, ask for confirmation before re-enrolling
    if (existingEnrollment && existingEnrollment.status === 'Completed') {
      setReEnrollConfirm({ sectionId, sectionName });
      return;
    }

    await doEnroll(sectionId, sectionName, false);
  };

  const doEnroll = async (sectionId: string, sectionName: string, isReEnrollment: boolean) => {
    if (!course || !id) return;
    setEnrollmentError(null);
    try {
      setEnrollingSectionId(sectionId);

      // Only unenroll if explicitly re-enrolling after completion (confirmed via dialog)
      if (isReEnrollment && existingEnrollment) {
        try {
          await enrollmentService.unenroll(existingEnrollment.id);
        } catch { /* may already be unenrolled */ }
      }

      await enrollmentService.enroll({
        courseId: id,
        sectionId: sectionId,
      });

      toast.success(t('public:courseDetails.enrolledSuccessTitle'), {
        description: t('public:courseDetails.enrolledSuccessBody', { course: course.title, section: sectionName }),
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
      setExistingEnrollment(null); // Reset so we don't show re-enroll dialog again
    } catch (error) {
      const raw = error instanceof Error ? error.message : t('public:courseDetails.errors.tryLater');
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
        <p className="text-muted-foreground">{t('public:courseDetails.notFoundTitle')}</p>
        <Button asChild>
          <Link to="/courses">{t('public:courseDetails.backToCourses')}</Link>
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
        <ArrowLeft className="me-2 h-4 w-4" />
        {t('public:courseDetails.back')}
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
                  <Badge variant="default">{t('public:courseDetails.featured')}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{formatRating(course.rating)}</span>
                  <span className="text-sm text-muted-foreground">
                    {t('public:courseDetails.reviewsCount', { count: course.ratingCount })}
                  </span>
                </div>
                <Badge variant="secondary">{course.level}</Badge>
                <Badge variant="outline">{course.modality}</Badge>
                <Badge variant="default" className={course.price ? "text-lg" : "text-lg bg-emerald-500/15 text-emerald-600 border-emerald-500/30"}>
                  {course.price ? `$${course.price.toFixed(2)}` : t('public:courseDetails.free')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>{t('public:courseDetails.description')}</CardTitle>
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
                {t('public:courseDetails.courseSectionsTitle')}
              </CardTitle>
              <CardDescription>
                {t('public:courseDetails.courseSectionsSubtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollmentError && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">{t('public:courseDetails.enrollmentIssue')}</p>
                    <p className="mt-1 text-muted-foreground">{enrollmentError}</p>
                    <button
                      type="button"
                      onClick={() => setEnrollmentError(null)}
                      className="mt-2 text-primary hover:underline text-xs font-medium"
                    >
                      {t('public:courseDetails.dismiss')}
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
                            {t('public:courseDetails.seatsRemainingShort', { count: section.seatsRemaining })}
                          </div>
                        </div>
                      </div>
                      {!section.isActive && (
                        <Badge variant="destructive">{t('public:courseDetails.inactive')}</Badge>
                      )}
                    </div>
                    {section.meetingTimes.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t('public:courseDetails.meetingTimes')}</div>
                        {section.meetingTimes.map((mt, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">{mt.day}</span>
                            <Clock className="h-4 w-4 ms-2" />
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
                          ? t('public:courseDetails.enrollingDots')
                          : section.seatsRemaining <= 0
                          ? t('public:courseDetails.sectionFull')
                          : t('public:courseDetails.enrollInSection', { name: section.name })}
                      </Button>
                    )}
                    {!isAuthenticated && (
                      <Button asChild className="w-full sm:w-auto">
                        <Link to="/login">{t('public:courseDetails.signInToEnrollCta')}</Link>
                      </Button>
                    )}
                  </motion.div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {t('public:courseDetails.noSectionsForCourse')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {course.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('public:courseDetails.tags')}</CardTitle>
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
              <CardTitle>{t('public:courseDetails.courseInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">{t('public:courseDetails.provider')}</div>
                <div>{course.providerName}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">{t('public:courseDetails.category')}</div>
                <div>{course.category}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">{t('public:courseDetails.level')}</div>
                <Badge>{course.level}</Badge>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">{t('public:courseDetails.modality')}</div>
                <Badge variant="outline">{course.modality}</Badge>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">{t('public:courseDetails.price')}</div>
                <div className="text-2xl font-bold">{course.price ? `$${course.price.toFixed(2)}` : <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-base">{t('public:courseDetails.free')}</Badge>}</div>
              </div>
            </CardContent>
          </Card>

          {/* Instructor Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('public:courseDetails.instructor')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-semibold">{course.instructorName}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!reEnrollConfirm}
        onOpenChange={(open) => { if (!open) setReEnrollConfirm(null); }}
        title={t('public:courseDetails.reEnrollDialogTitle')}
        description={t('public:courseDetails.reEnrollDialogDescription', {
          course: course?.title ?? '',
          section: reEnrollConfirm?.sectionName ?? '',
        })}
        confirmLabel={t('public:courseDetails.reEnrollConfirmLabel')}
        variant="default"
        onConfirm={async () => {
          if (reEnrollConfirm) {
            await doEnroll(reEnrollConfirm.sectionId, reEnrollConfirm.sectionName, true);
            setReEnrollConfirm(null);
          }
        }}
      />
    </div>
  );
}

