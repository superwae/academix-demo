import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { lessonService, type LessonDto } from '../../services/lessonService';
import { courseService, type CourseDto } from '../../services/courseService';
import {
  EnhancedVideoPlayer,
  type CompletionReason,
  type VideoPlayerHandle,
} from '../../components/EnhancedVideoPlayer';
import { LessonNotesPanel } from '../../components/LessonNotesPanel';
import { CourseDiscussion } from '../../components/CourseDiscussion';
import { progressService } from '../../services/progressService';
import { ArrowLeft, Clock, CheckCircle2, BookOpen, FileText, Download } from 'lucide-react';
import {
  courseExtrasService,
  type CourseMaterialDto,
  type LessonRatingSummaryDto,
} from '../../services/courseExtrasService';
import { SessionRatingDialog } from '../../components/course/SessionRatingDialog';
import { resolvePublicFileUrl } from '../../lib/meetingTimeFormat';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export function LessonViewerPage() {
  const { t } = useTranslation(['student', 'common', 'errors']);
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [lesson, setLesson] = useState<LessonDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const videoPlayerRef = useRef<VideoPlayerHandle | null>(null);
  const [lessonMaterials, setLessonMaterials] = useState<CourseMaterialDto[]>([]);
  const [lessonRatingRow, setLessonRatingRow] = useState<LessonRatingSummaryDto | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const completionRatingGateRef = useRef(false);

  const formatBytes = (n?: number | null) => {
    if (n == null || n <= 0) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  };

  useEffect(() => {
    if (!courseId || !lessonId) {
      toast.error(t('student:lessonViewer.errors.courseIdRequired'));
      navigate('/my-classes');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        // Validate lessonId format (should be a GUID)
        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!guidRegex.test(lessonId)) {
          throw new Error(t('student:lessonViewer.errors.invalidLessonId', { id: lessonId }));
        }

        // Load course and lesson in parallel
        const [courseData, lessonData] = await Promise.all([
          courseService.getCourseById(courseId),
          lessonService.getLessonById(lessonId),
        ]);

        setCourse(courseData);
        setLesson(lessonData);

        const [allMat, summaries] = await Promise.all([
          courseExtrasService.getMaterials(courseId).catch(() => [] as CourseMaterialDto[]),
          courseExtrasService.getLessonRatingSummaries(courseId).catch(() => [] as LessonRatingSummaryDto[]),
        ]);
        const mats = allMat.filter((m) => !m.lessonId || m.lessonId === lessonId);
        setLessonMaterials(mats);
        setLessonRatingRow(summaries.find((s) => s.lessonId === lessonId) ?? null);

        // Check if lesson is completed
        const progress = await progressService.getLessonProgress(lessonId);
        if (progress) {
          setIsCompleted(progress.isCompleted);
        }
      } catch (error) {
        console.error('Error loading lesson:', error);
        const errorMessage = error instanceof Error ? error.message : t('student:lessonViewer.errors.tryLater');
        toast.error(t('student:lessonViewer.errors.loadFailed'), {
          description: errorMessage,
        });
        navigate(`/student/my-classes/${courseId}/lessons`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, lessonId, navigate, t]);

  useEffect(() => {
    completionRatingGateRef.current = false;
  }, [lessonId]);

  const shouldPromptForRating = useCallback(() => {
    const durationSeconds = lesson?.durationMinutes ? lesson.durationMinutes * 60 : 0;
    const minimumWatchSeconds = durationSeconds > 0
      ? Math.min(60, Math.max(15, durationSeconds * 0.25))
      : 30;

    return currentTime >= minimumWatchSeconds;
  }, [currentTime, lesson?.durationMinutes]);

  const handleProgressUpdate = useCallback((time: number) => {
    const nextSecond = Math.max(0, Math.floor(time));
    if (Math.abs(nextSecond - currentTimeRef.current) < 1) return;

    currentTimeRef.current = nextSecond;
    setCurrentTime(nextSecond);
  }, []);

  const handleLessonComplete = useCallback((reason: CompletionReason) => {
    setIsCompleted(true);
    toast.success(t('student:lessonViewer.completedToast'));
    const canRateNow = reason === 'watched' || shouldPromptForRating();
    if (canRateNow && !completionRatingGateRef.current) {
      completionRatingGateRef.current = true;
      setRatingDialogOpen(true);
    }
  }, [shouldPromptForRating, t]);

  const handleManualMarkComplete = useCallback(async () => {
    if (!courseId || !lessonId || !lesson || isCompleted) return;

    const durationSeconds = Math.max(
      1,
      Math.floor((lesson.durationMinutes || 0) * 60) || currentTimeRef.current || 1,
    );

    try {
      await progressService.markLessonCompleted(lessonId, courseId, durationSeconds);
      handleLessonComplete('manual');
    } catch (error) {
      console.error('Failed to mark lesson as completed:', error);
      toast.error(t('student:lessonViewer.errors.tryLater'));
    }
  }, [courseId, lessonId, lesson, isCompleted, handleLessonComplete, t]);

  const formatDuration = (minutes?: number): string => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="aspect-video bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!course || !lesson || !courseId || !lessonId) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to={courseId ? `/student/my-classes/${courseId}/lessons` : '/student/my-classes'}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{t('student:shared.lessonNotFound')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/student/my-classes/${courseId}/lessons`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold truncate">{lesson.title}</h1>
          <p className="text-sm text-muted-foreground truncate">{course.title}</p>
        </div>
        {lesson.durationMinutes && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(lesson.durationMinutes)}</span>
          </div>
        )}
      </div>

      {/* Video Player or Content */}
      <Card>
        <CardContent className="p-0">
          {lesson.videoUrl ? (
            <EnhancedVideoPlayer
              ref={videoPlayerRef}
              src={lesson.videoUrl}
              lessonId={lessonId}
              courseId={courseId}
              totalDuration={lesson.durationMinutes ? lesson.durationMinutes * 60 : undefined}
              onProgressUpdate={handleProgressUpdate}
              onComplete={handleLessonComplete}
              className="aspect-video"
            />
          ) : (
            <div className="aspect-video bg-muted flex items-center justify-center rounded-t-lg">
              <div className="text-center space-y-2">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">{t('student:lessonViewer.contentComingSoon')}</p>
              </div>
            </div>
          )}
        </CardContent>
        <div className="flex justify-end border-t p-3 sm:p-4">
          <Button
            variant={isCompleted ? 'secondary' : 'outline'}
            onClick={handleManualMarkComplete}
            disabled={isCompleted}
            className="w-full sm:w-auto"
          >
            <CheckCircle2 className="h-4 w-4 me-2" />
            {isCompleted
              ? t('student:lessonViewer.completed')
              : t('student:components.videoPlayer.markAsCompleted')}
          </Button>
        </div>
      </Card>

      {/* Lesson Details and Sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {/* Lesson Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('student:lessonViewer.lessonDetails')}</CardTitle>
                {isCompleted && (
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">{t('student:lessonViewer.completed')}</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{lesson.title}</h3>
                {lesson.description && (
                  <p className="text-muted-foreground whitespace-pre-wrap">{lesson.description}</p>
                )}
              </div>
              {lesson.isPreview && (
                <div className="inline-block">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {t('student:lessonViewer.preview')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {lessonMaterials.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('student:lessonViewer.materials')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {lessonMaterials.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 text-start"
                      onClick={() =>
                        window.open(resolvePublicFileUrl(m.fileUrl), '_blank', 'noopener,noreferrer')
                      }
                    >
                      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{m.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.kind === 1 ? t('student:lessonViewer.book') : t('student:lessonViewer.file')}
                          {m.fileSizeBytes ? ` · ${formatBytes(m.fileSizeBytes)}` : ''}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discussion Section - Now more prominent */}
          <CourseDiscussion
            courseId={courseId}
            lessonId={lessonId}
            title={t('student:lessonViewer.lessonQA')}
          />
        </div>

        {/* Notes Panel - Sidebar */}
        {lesson.videoUrl && (
          <LessonNotesPanel
            lessonId={lessonId}
            courseId={courseId}
            currentTime={currentTime}
            onSeekToTimestamp={(timestamp) => {
              videoPlayerRef.current?.seekTo(timestamp);
            }}
          />
        )}
      </div>

      <SessionRatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        kind="lesson"
        courseTitle={course.title}
        sessionTitle={lesson.title}
        initialRating={lessonRatingRow?.myRating ?? null}
        onSubmit={async (rating) => {
          if (!courseId || !lessonId) return;
          await courseExtrasService.upsertLessonRating(courseId, lessonId, { rating });
          const next = await courseExtrasService.getLessonRatingSummaries(courseId);
          setLessonRatingRow(next.find((s) => s.lessonId === lessonId) ?? null);
          toast.success(t('student:lessonViewer.thanksFeedback'));
        }}
      />
    </div>
  );
}

