import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { lessonService, type CourseSectionDto, type LessonDto } from '../../services/lessonService';
import {
  courseService,
  type CourseDto,
  type MeetingTimeDto,
  type CourseSectionDto as ScheduledCourseSection,
} from '../../services/courseService';
import { progressService } from '../../services/progressService';
import {
  ArrowLeft,
  Play,
  Lock,
  Clock,
  FileText,
  Download,
  BookOpen,
  CheckCircle2,
  PlayCircle,
  Video,
  Award,
} from 'lucide-react';
import {
  courseExtrasService,
  type CourseMaterialDto,
  type MeetingTimeRatingSummaryDto,
  type CertificateDto,
} from '../../services/courseExtrasService';
import { SessionRatingDialog } from '../../components/course/SessionRatingDialog';
import { formatMeetingSlot, resolvePublicFileUrl } from '../../lib/meetingTimeFormat';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { getLiveSessionBadge, type MeetingMeta } from '../../lib/liveSession';
import {
  apiDayToDayName,
  getLastPastSessionEnd,
  isMeetingDismissedForOccurrence,
  dismissMeetingForOccurrence,
} from '../../lib/sessionRatingPrompt';

function isLiveLectureLessonId(id: string): boolean {
  return id.startsWith('lecture:');
}

function formatBytes(n?: number | null): string {
  if (n == null || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMeetingRow(mt: MeetingTimeDto): string {
  if (mt.startTime && mt.endTime) {
    return `${mt.day} · ${mt.startTime} – ${mt.endTime}`;
  }
  const fmt = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h <= 0) return `${min}m`;
    return min > 0 ? `${h}h ${min}m` : `${h}h`;
  };
  return `${mt.day} · ${fmt(mt.startMinutes)} – ${fmt(mt.endMinutes)}`;
}

function buildLectureLessonsForScheduledSection(
  cs: ScheduledCourseSection,
  lessonSectionId: string,
  joinByLessonId: Record<string, string | undefined>,
  metaByLessonId: Record<string, MeetingMeta>,
): LessonDto[] {
  const lessons: LessonDto[] = [];
  let order = 0;
  for (const mt of cs.meetingTimes || []) {
    order += 1;
    const id = `lecture:${cs.id}:${mt.day}:${mt.startMinutes}`;
    joinByLessonId[id] = cs.joinUrl?.trim();
    metaByLessonId[id] = {
      day: mt.day,
      startMinutes: mt.startMinutes,
      endMinutes: mt.endMinutes,
    };
    lessons.push({
      id,
      sectionId: lessonSectionId,
      title: `${formatMeetingRow(mt)}`,
      description: [cs.locationLabel, cs.joinUrl ? 'Open join link for the live session' : undefined]
        .filter(Boolean)
        .join(' · '),
      order,
      isPreview: false,
      durationMinutes: Math.max(15, mt.endMinutes - mt.startMinutes),
      sectionMeetingTimeId: mt.id,
    });
  }
  return lessons;
}

/** Flat list when there are no lesson-module sections — one card for all meetings. */
function buildLiveScheduleFromCourse(course: CourseDto): {
  section: CourseSectionDto;
  lessons: LessonDto[];
  joinByLessonId: Record<string, string | undefined>;
  metaByLessonId: Record<string, MeetingMeta>;
} | null {
  const joinByLessonId: Record<string, string | undefined> = {};
  const metaByLessonId: Record<string, MeetingMeta> = {};
  const lessons: LessonDto[] = [];
  let order = 0;
  const sectionId = `__live_${course.id}`;

  for (const cs of course.sections.filter((s) => s.isActive)) {
    for (const mt of cs.meetingTimes || []) {
      order += 1;
      const id = `lecture:${cs.id}:${mt.day}:${mt.startMinutes}`;
      joinByLessonId[id] = cs.joinUrl?.trim();
      metaByLessonId[id] = {
        day: mt.day,
        startMinutes: mt.startMinutes,
        endMinutes: mt.endMinutes,
      };
      lessons.push({
        id,
        sectionId,
        title: `${cs.name} — ${formatMeetingRow(mt)}`,
        description: [cs.locationLabel, cs.joinUrl ? 'Open join link for the live session' : undefined]
          .filter(Boolean)
          .join(' · '),
        order,
        isPreview: false,
        durationMinutes: Math.max(15, mt.endMinutes - mt.startMinutes),
        sectionMeetingTimeId: mt.id,
      });
    }
  }

  if (lessons.length === 0) return null;

  return {
    section: {
      id: sectionId,
      courseId: course.id,
      title: 'Live lectures & schedule',
      order: 999,
      description: 'Your class meetings (same schedule the instructor set for this section)',
    },
    lessons,
    joinByLessonId,
    metaByLessonId,
  };
}

export function CourseLessonsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [sections, setSections] = useState<CourseSectionDto[]>([]);
  const [lessonsBySection, setLessonsBySection] = useState<Record<string, LessonDto[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState<Set<string>>(new Set());
  const [courseProgress, setCourseProgress] = useState<{ totalLessons: number; completedLessons: number; progressPercentage: number } | null>(null);
  const [lessonsProgress, setLessonsProgress] = useState<Record<string, { isCompleted: boolean; watchedDuration: number; totalDuration: number }>>({});
  const [continueWatching, setContinueWatching] = useState<{ lessonId: string } | null>(null);
  /** Join URLs for synthetic lecture rows (key = lesson id) */
  const [lectureJoinByLessonId, setLectureJoinByLessonId] = useState<Record<string, string | undefined>>({});
  const [lectureMetaByLessonId, setLectureMetaByLessonId] = useState<Record<string, MeetingMeta>>({});
  /** Re-render session badges every minute */
  const [scheduleTick, setScheduleTick] = useState(0);
  const [materials, setMaterials] = useState<CourseMaterialDto[]>([]);
  const [meetingRatings, setMeetingRatings] = useState<MeetingTimeRatingSummaryDto[]>([]);
  const [pendingLiveRating, setPendingLiveRating] = useState<{
    meetingTimeId: string;
    sessionTitle: string;
    lastEndMs: number;
    myRating: number | null | undefined;
  } | null>(null);
  const [liveRatingSearchKey, setLiveRatingSearchKey] = useState(0);
  const [certificateInfo, setCertificateInfo] = useState<CertificateDto | null>(null);
  useEffect(() => {
    const t = window.setInterval(() => setScheduleTick((n) => n + 1), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!courseId) {
      toast.error('Course ID is required');
      navigate('/my-classes');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load course details
        const courseData = await courseService.getCourseById(courseId);
        setCourse(courseData);

        // Load course sections (lesson modules from API)
        const sectionsData = await lessonService.getCourseSections(courseId);
        let sortedSections = [...sectionsData].sort((a, b) => a.order - b.order);

        // Load lessons for each section
        const lessonsMap: Record<string, LessonDto[]> = {};
        for (const section of sortedSections) {
          try {
            setLoadingLessons((prev) => new Set(prev).add(section.id));
            const lessons = await lessonService.getSectionLessons(section.id);
            // Sort by order
            lessonsMap[section.id] = [...lessons].sort((a, b) => a.order - b.order);
          } catch (error) {
            console.error(`Failed to load lessons for section ${section.id}:`, error);
            // If it's a 405 or 404, lessons endpoint doesn't exist - that's okay
            const apiError = error as { status?: number };
            if (apiError.status === 405 || apiError.status === 404) {
              lessonsMap[section.id] = [];
            } else {
              lessonsMap[section.id] = [];
            }
          } finally {
            setLoadingLessons((prev) => {
              const next = new Set(prev);
              next.delete(section.id);
              return next;
            });
          }
        }

        // Lessons stored on the course without a LessonSection (e.g. seeded YouTube lessons) are only returned by GET /lessons/course/:id
        const recordedSectionId = `__recorded_${courseId}`;
        try {
          const allCourseLessons = await lessonService.getCourseLessons(courseId);
          const idsInMap = new Set(Object.values(lessonsMap).flat().map((l) => l.id));
          const notInAnySection = allCourseLessons.filter((l) => !idsInMap.has(l.id));
          if (notInAnySection.length > 0) {
            lessonsMap[recordedSectionId] = [...notInAnySection].sort((a, b) => a.order - b.order);
            sortedSections = [
              {
                id: recordedSectionId,
                courseId,
                title: 'Recorded lectures',
                order: -1,
                description: 'On-demand video lessons',
              },
              ...sortedSections,
            ].sort((a, b) => a.order - b.order);
          }
        } catch (e) {
          console.warn('Could not load course-level lessons:', e);
        }

        const joinMap: Record<string, string | undefined> = {};
        const metaMap: Record<string, MeetingMeta> = {};

        // Fill empty lesson-module rows with scheduled meetings when section id matches a class section
        for (const section of sortedSections) {
          const existing = lessonsMap[section.id] || [];
          if (existing.length > 0) continue;
          const cs = courseData.sections.find((s) => s.id === section.id);
          if (cs?.meetingTimes?.length) {
            lessonsMap[section.id] = buildLectureLessonsForScheduledSection(cs, section.id, joinMap, metaMap);
          }
        }

        let finalSections = sortedSections;
        const lessonCount = () => Object.values(lessonsMap).reduce((sum, lessons) => sum + lessons.length, 0);

        const live = buildLiveScheduleFromCourse(courseData);

        if (finalSections.length === 0) {
          if (live) {
            finalSections = [live.section];
            lessonsMap[live.section.id] = live.lessons;
            Object.assign(joinMap, live.joinByLessonId);
            Object.assign(metaMap, live.metaByLessonId);
          }
        } else if (lessonCount() === 0) {
          if (live) {
            finalSections = [...finalSections, live.section];
            lessonsMap[live.section.id] = live.lessons;
            Object.assign(joinMap, live.joinByLessonId);
            Object.assign(metaMap, live.metaByLessonId);
          }
        } else if (live && !finalSections.some((s) => s.id === live.section.id)) {
          // Show recorded/module lessons and scheduled class meetings together
          finalSections = [...finalSections, live.section];
          lessonsMap[live.section.id] = live.lessons;
          Object.assign(joinMap, live.joinByLessonId);
          Object.assign(metaMap, live.metaByLessonId);
        }

        setLectureJoinByLessonId(joinMap);
        setLectureMetaByLessonId(metaMap);
        setSections(finalSections);
        setLessonsBySection(lessonsMap);

        // Calculate course progress (exclude synthetic lecture rows)
        const totalLessons = Object.values(lessonsMap)
          .flat()
          .filter((l) => !isLiveLectureLessonId(l.id)).length;
        const [progress, allLessonsProgress, continueWatchingData] = await Promise.all([
          progressService.getCourseProgress(courseId, totalLessons),
          progressService.getCourseLessonsProgress(courseId),
          progressService.getContinueWatching(courseId).catch(() => null),
        ]);
        
        setCourseProgress({
          totalLessons: progress.totalLessons,
          completedLessons: progress.completedLessons,
          progressPercentage: progress.progressPercentage,
        });

        // Map progress by lesson ID
        const progressMap: Record<string, { isCompleted: boolean; watchedDuration: number; totalDuration: number }> = {};
        allLessonsProgress.forEach(p => {
          progressMap[p.lessonId] = {
            isCompleted: p.isCompleted,
            watchedDuration: p.watchedDuration,
            totalDuration: p.totalDuration,
          };
        });
        setLessonsProgress(progressMap);
        
        if (continueWatchingData) {
          setContinueWatching({ lessonId: continueWatchingData.lessonId });
        }

        const [mat, mr, cert] = await Promise.all([
          courseExtrasService.getMaterials(courseId).catch(() => [] as CourseMaterialDto[]),
          courseExtrasService.getMeetingTimeRatingSummaries(courseId).catch(
            () => [] as MeetingTimeRatingSummaryDto[],
          ),
          courseExtrasService.getCertificate(courseId).catch(() => null),
        ]);
        setMaterials(mat);
        setMeetingRatings(mr);
        setCertificateInfo(cert);
      } catch (error) {
        toast.error('Failed to load course lessons', {
          description: error instanceof Error ? error.message : 'Please try again later',
        });
        navigate('/my-classes');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, navigate]);

  useEffect(() => {
    if (!course || !courseId || loading) return;
    const now = new Date();
    for (const row of meetingRatings) {
      if (row.myRating != null && row.myRating > 0) continue;
      const meta: MeetingMeta = {
        day: apiDayToDayName(row.day),
        startMinutes: row.startMinutes,
        endMinutes: row.endMinutes,
      };
      const lastEnd = getLastPastSessionEnd(meta, now);
      if (!lastEnd) continue;
      const lastEndMs = lastEnd.getTime();
      if (isMeetingDismissedForOccurrence(row.sectionMeetingTimeId, lastEndMs)) continue;
      const sessionTitle = `${row.sectionName} — ${formatMeetingSlot(row.day, row.startMinutes, row.endMinutes)}`;
      setPendingLiveRating({
        meetingTimeId: row.sectionMeetingTimeId,
        sessionTitle,
        lastEndMs,
        myRating: row.myRating,
      });
      return;
    }
    setPendingLiveRating(null);
  }, [course, courseId, loading, meetingRatings, liveRatingSearchKey]);

  const refreshMeetingRatings = async () => {
    if (!courseId) return;
    try {
      const mr = await courseExtrasService.getMeetingTimeRatingSummaries(courseId);
      setMeetingRatings(mr);
    } catch {
      /* ignore */
    }
  };

  const handleLessonClick = (lesson: LessonDto) => {
    if (!courseId) return;
    if (isLiveLectureLessonId(lesson.id)) {
      const url = lectureJoinByLessonId[lesson.id];
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        toast.message('Live session', {
          description: 'Your instructor has not added a join link yet. Check the calendar or messages.',
        });
      }
      return;
    }
    navigate(`/student/my-classes/${courseId}/lessons/${lesson.id}`);
  };

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
          <Button variant="ghost" size="icon" asChild>
            <Link to="/student/my-classes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/student/my-classes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Course not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-schedule-tick={scheduleTick}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/student/my-classes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{course.title}</h1>
          <p className="text-sm text-muted-foreground">Lessons & live sessions · local time</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Main Lessons List */}
        <div className="space-y-4">
          {sections.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  No lessons or scheduled meetings are available for this course yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            sections.map((section, sectionIndex) => {
              const lessons = lessonsBySection[section.id] || [];
              const isLoading = loadingLessons.has(section.id);

              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: sectionIndex * 0.1 }}
                >
                  <Card className="overflow-hidden">
                    {/* Section Header */}
                    <div className="bg-muted/50 px-4 py-3 border-b">
                      <h3 className="font-semibold text-sm">
                        {sectionIndex + 1}. {section.title}
                      </h3>
                    </div>

                    {/* Lessons List */}
                    <CardContent className="p-0">
                      {isLoading ? (
                        <div className="space-y-1 p-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-12 bg-muted rounded animate-pulse mx-2" />
                          ))}
                        </div>
                      ) : lessons.length === 0 ? (
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground">
                            No lessons available in this section yet.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {lessons.map((lesson, lessonIndex) => {
                            const meta = isLiveLectureLessonId(lesson.id) ? lectureMetaByLessonId[lesson.id] : undefined;
                            const sessionBadge = meta ? getLiveSessionBadge(meta, new Date()) : null;
                            return (
                            <motion.button
                              key={lesson.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: lessonIndex * 0.05 }}
                              onClick={() => handleLessonClick(lesson)}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors group",
                                lessonIndex === 0 && "rounded-t-none",
                                sessionBadge === 'live' && "bg-primary/5 ring-1 ring-inset ring-primary/25"
                              )}
                            >
                              <div className="flex-shrink-0">
                                {(() => {
                                  if (isLiveLectureLessonId(lesson.id)) {
                                    return (
                                      <Video
                                        className={cn(
                                          'h-4 w-4 group-hover:scale-110 transition-transform',
                                          sessionBadge === 'live' ? 'text-red-600' : 'text-primary',
                                        )}
                                      />
                                    );
                                  }
                                  const progress = lessonsProgress[lesson.id];
                                  if (progress?.isCompleted) {
                                    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
                                  }
                                  if (progress && progress.watchedDuration > 0) {
                                    return <PlayCircle className="h-4 w-4 text-primary" />;
                                  }
                                  if (lesson.videoUrl) {
                                    return <Play className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />;
                                  }
                                  return <Lock className="h-4 w-4 text-muted-foreground" />;
                                })()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">
                                    {lesson.title}
                                  </span>
                                  {isLiveLectureLessonId(lesson.id) &&
                                    (sessionBadge === 'live' ? (
                                      <Badge className="text-[10px] font-semibold px-1.5 py-0 h-5 bg-red-600 hover:bg-red-600">
                                        Live now
                                      </Badge>
                                    ) : sessionBadge === 'soon' ? (
                                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                        Starting soon
                                      </Badge>
                                    ) : sessionBadge === 'today' ? (
                                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-primary/40 text-primary">
                                        Today
                                      </Badge>
                                    ) : (
                                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                        Live
                                      </span>
                                    ))}
                                  {lesson.isPreview && !isLiveLectureLessonId(lesson.id) && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                      Preview
                                    </span>
                                  )}
                                  {(() => {
                                    const progress = lessonsProgress[lesson.id];
                                    if (progress?.isCompleted) {
                                      return (
                                        <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded">
                                          Completed
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                                {lesson.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                    {lesson.description}
                                  </p>
                                )}
                                {(() => {
                                  const progress = lessonsProgress[lesson.id];
                                  if (progress && progress.totalDuration > 0 && !progress.isCompleted) {
                                    const progressPercent = (progress.watchedDuration / progress.totalDuration) * 100;
                                    return (
                                      <div className="mt-1.5">
                                        <Progress value={progressPercent} className="h-1" />
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              {lesson.durationMinutes && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatDuration(lesson.durationMinutes)}</span>
                                </div>
                              )}
                            </motion.button>
                          );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Lesson Materials Sidebar */}
        <div className="space-y-4">
          {/* Course Progress */}
          {courseProgress && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Course Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{courseProgress.progressPercentage}%</span>
                  </div>
                  <Progress value={courseProgress.progressPercentage} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {courseProgress.completedLessons} of {courseProgress.totalLessons} lessons completed
                </div>
                {continueWatching && continueWatching.lessonId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={async () => {
                      try {
                        if (!continueWatching.lessonId) {
                          toast.error('Lesson ID not found');
                          return;
                        }

                        // Validate GUID format
                        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        if (!guidRegex.test(continueWatching.lessonId)) {
                          toast.error('Invalid lesson ID format');
                          return;
                        }

                        // Find the lesson in all sections
                        const allLessons = Object.values(lessonsBySection).flat();
                        const lesson = allLessons.find((l) => l.id === continueWatching.lessonId);
                        
                        if (lesson) {
                          handleLessonClick(lesson);
                        } else {
                          // If lesson not found in loaded lessons, navigate directly using the lesson ID
                          if (courseId) {
                            navigate(`/student/my-classes/${courseId}/lessons/${continueWatching.lessonId}`);
                          } else {
                            toast.error('Course ID not found');
                          }
                        }
                      } catch (error) {
                        console.error('Error navigating to continue watching:', error);
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        toast.error('Failed to navigate to lesson', {
                          description: errorMessage || 'Please try selecting the lesson manually',
                        });
                      }
                    }}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Continue Watching
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certificate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {certificateInfo?.eligible ? (
                <Button className="w-full" variant="default" asChild>
                  <Link to={`/student/my-classes/${courseId}/certificate`}>View & print certificate</Link>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {certificateInfo
                    ? 'Complete the course to unlock your certificate.'
                    : 'Sign in as an enrolled student to see certificate status.'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course materials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {materials.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files or books uploaded for this course yet.</p>
              ) : (
                <div className="space-y-2">
                  {materials.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                      onClick={() => window.open(resolvePublicFileUrl(m.fileUrl), '_blank', 'noopener,noreferrer')}
                    >
                      <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{m.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.kind === 1 ? 'Book' : 'File'}
                          {m.lessonTitle ? ` · ${m.lessonTitle}` : ' · Whole course'}
                          {m.fileSizeBytes ? ` · ${formatBytes(m.fileSizeBytes)}` : ''}
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Materials may be linked to a specific lesson or the whole course.
              </p>
            </CardContent>
          </Card>

          {/* Course Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Course Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground">Instructor</div>
                <div className="font-medium">{course.instructorName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Category</div>
                <div className="font-medium">{course.category}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Level</div>
                <div className="font-medium">{course.level}</div>
              </div>
              {course.rating > 0 && (
                <div>
                  <div className="text-muted-foreground">Rating</div>
                  <div className="font-medium">⭐ {course.rating.toFixed(1)} ({course.ratingCount} reviews)</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <SessionRatingDialog
        open={!!pendingLiveRating}
        onOpenChange={(open) => {
          if (!open) {
            if (pendingLiveRating) {
              dismissMeetingForOccurrence(pendingLiveRating.meetingTimeId, pendingLiveRating.lastEndMs);
              setLiveRatingSearchKey((k) => k + 1);
            }
            setPendingLiveRating(null);
          }
        }}
        kind="live"
        courseTitle={course.title}
        sessionTitle={pendingLiveRating?.sessionTitle ?? ''}
        initialRating={pendingLiveRating?.myRating ?? null}
        onSubmit={async (rating) => {
          if (!courseId || !pendingLiveRating) return;
          const m = pendingLiveRating;
          await courseExtrasService.upsertMeetingTimeRating(courseId, m.meetingTimeId, { rating });
          await refreshMeetingRatings();
          setPendingLiveRating(null);
          toast.success('Thanks for your feedback!');
        }}
      />
    </div>
  );
}

