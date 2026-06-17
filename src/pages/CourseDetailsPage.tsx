import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { courseService, type CourseDto, type CourseSectionDto } from '../services/courseService';
import { enrollmentService, type EnrollmentDto } from '../services/enrollmentService';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { toast } from 'sonner';
import {
  Star, ArrowLeft, User, BookOpen, Clock, MapPin, Calendar, AlertCircle,
  Share2, Check, Pencil, GraduationCap, Award, Layers, BadgeCheck, Users, Video,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { hasElevatedRole } from '../lib/userRoles';
import { formatMoney } from '../lib/money';
import { localizeLevel, localizeModality, localizeWeekday } from '../lib/enumLocalization';
import { cn } from '../lib/cn';

export function CourseDetailsPage() {
  const { t } = useTranslation(['public', 'common']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [course, setCourse] = useState<CourseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busySectionId, setBusySectionId] = useState<string | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [existingEnrollment, setExistingEnrollment] = useState<EnrollmentDto | null>(null);
  const [reEnrollConfirm, setReEnrollConfirm] = useState<{ sectionId: string; sectionName: string } | null>(null);
  const [switchConfirm, setSwitchConfirm] = useState<{ sectionId: string; sectionName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const isOwner =
    !!course && !!user && (course.instructorId === user.id || hasElevatedRole(user.roles));
  const activeEnrollment =
    existingEnrollment && existingEnrollment.status === 'Active' ? existingEnrollment : null;

  const formatEnrollmentError = (msg: string): string => {
    if (msg.includes('Section is full') || msg.includes('SectionFull')) return t('public:courseDetails.errors.sectionFull');
    if (msg.includes('already enrolled')) return t('public:courseDetails.errors.alreadyEnrolled');
    if (msg.includes('overlap') || msg.includes('conflict')) return t('public:courseDetails.errors.sectionConflict');
    if (msg.includes('not active')) return t('public:courseDetails.errors.sectionNotActive');
    if (msg.includes('not published')) return t('public:courseDetails.errors.courseNotPublished');
    return msg.replace(/^Cannot enroll:\s*/i, '').trim() || t('public:courseDetails.errors.unableEnroll');
  };

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
        if (isAuthenticated) {
          try {
            const myEnrollments = await enrollmentService.getMyEnrollments({ pageSize: 100 });
            const existing = myEnrollments.items?.find((e: EnrollmentDto) => e.courseId === id);
            setExistingEnrollment(existing ?? null);
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

  const reloadCourse = async () => {
    if (!id) return;
    const updated = await courseService.getCourseById(id);
    setCourse(updated);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/courses/${id}`;
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ title: course?.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('public:courseDetails.linkCopied', { defaultValue: 'Course link copied' }), {
        description: t('public:courseDetails.linkCopiedBody', { defaultValue: 'Anyone with this link can view and enroll.' }),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('public:courseDetails.linkCopyFailed', { defaultValue: 'Could not copy the link' }), { description: url });
    }
  };

  // ── Enroll / switch ────────────────────────────────────────────────────────
  const handlePrimaryAction = (section: CourseSectionDto) => {
    if (!course || !id) return;
    if (!isAuthenticated) {
      navigate(`/login?returnTo=${encodeURIComponent(`/courses/${id}`)}`);
      return;
    }
    // Already enrolled here → going to classes is handled elsewhere; switching handled below.
    if (activeEnrollment) return;

    // Paid course → checkout (carries the chosen section).
    if (typeof course.price === 'number' && course.price > 0 && !hasElevatedRole(user?.roles)) {
      navigate(`/student/checkout/${id}?sectionId=${section.id}`);
      return;
    }
    if (existingEnrollment && existingEnrollment.status === 'Completed') {
      setReEnrollConfirm({ sectionId: section.id, sectionName: section.name });
      return;
    }
    void doEnroll(section.id, section.name, false);
  };

  const doEnroll = async (sectionId: string, sectionName: string, isReEnrollment: boolean) => {
    if (!course || !id) return;
    setEnrollmentError(null);
    try {
      setBusySectionId(sectionId);
      if (isReEnrollment && existingEnrollment) {
        try { await enrollmentService.unenroll(existingEnrollment.id); } catch { /* may already be gone */ }
      }
      await enrollmentService.enroll({ courseId: id, sectionId });
      toast.success(t('public:courseDetails.enrolledSuccessTitle'), {
        description: t('public:courseDetails.enrolledSuccessBody', { course: course.title, section: sectionName }),
      });
      window.dispatchEvent(new CustomEvent('enrollmentChanged', { detail: { action: 'enrolled', courseId: id, sectionId } }));
      await reloadCourse();
      const mine = await enrollmentService.getMyEnrollments({ pageSize: 100 });
      setExistingEnrollment(mine.items?.find((e) => e.courseId === id) ?? null);
    } catch (error) {
      setEnrollmentError(formatEnrollmentError(error instanceof Error ? error.message : t('public:courseDetails.errors.tryLater')));
    } finally {
      setBusySectionId(null);
    }
  };

  const doSwitch = async (sectionId: string, sectionName: string) => {
    if (!activeEnrollment || !id) return;
    setEnrollmentError(null);
    try {
      setBusySectionId(sectionId);
      const updated = await enrollmentService.switchSection(activeEnrollment.id, sectionId);
      setExistingEnrollment(updated);
      toast.success(t('public:courseDetails.switchedTitle', { defaultValue: 'Section changed' }), {
        description: t('public:courseDetails.switchedBody', { defaultValue: 'You moved to {{section}}.', section: sectionName }),
      });
      window.dispatchEvent(new CustomEvent('enrollmentChanged', { detail: { action: 'switched', courseId: id, sectionId } }));
      await reloadCourse();
    } catch (error) {
      setEnrollmentError(formatEnrollmentError(error instanceof Error ? error.message : t('public:courseDetails.errors.tryLater')));
    } finally {
      setBusySectionId(null);
    }
  };

  // ── Loading / not found ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-40 rounded bg-muted" />
          <div className="h-40 rounded-2xl bg-muted" />
          <div className="h-64 rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }
  if (!course) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-muted-foreground">{t('public:courseDetails.notFoundTitle')}</p>
        <Button asChild className="mt-4"><Link to="/courses">{t('public:courseDetails.backToCourses')}</Link></Button>
      </div>
    );
  }

  const totalSeats = course.sections.reduce((s, x) => s + (x.maxSeats || 0), 0);
  const openSeats = course.sections.reduce((s, x) => s + Math.max(0, x.seatsRemaining || 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-20 pt-6">
      <style>{`
        .cd-in { animation: cd-rise .5s cubic-bezier(.2,.7,.3,1) both; }
        @keyframes cd-rise { from { opacity:0; transform: translateY(16px);} to {opacity:1; transform:none;} }
        @media (prefers-reduced-motion: reduce){ .cd-in{ animation:none !important; } }
      `}</style>

      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        {t('public:courseDetails.back')}
      </button>

      {/* Hero */}
      <div className="cd-in mt-4 overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{course.category}</span>
            <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium">{localizeLevel(course.level)}</span>
            <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium">{localizeModality(course.modality)}</span>
            {course.isFeatured && (
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-600">{t('public:courseDetails.featured')}</span>
            )}
          </div>

          <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-[1.1]">{course.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                {(course.instructorName || '?').split(' ').slice(0, 2).map((p) => p[0]).join('')}
              </span>
              {course.instructorName}
            </span>
            {course.ratingCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-foreground">{course.rating.toFixed(1)}</span>
                {t('public:courseDetails.reviewsCount', { count: course.ratingCount })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <BadgeCheck className="h-4 w-4" />
                {t('public:courseDetails.newCourse', { defaultValue: 'New course' })}
              </span>
            )}
            <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{t('public:courseDetails.seatsOpen', { defaultValue: '{{open}} of {{total}} seats open', open: openSeats, total: totalSeats })}</span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="text-3xl font-black">
              {course.price && course.price > 0 ? formatMoney(course.price) : (
                <span className="rounded-full bg-emerald-500/15 px-4 py-1.5 text-xl font-bold text-emerald-600">{t('public:courseDetails.free')}</span>
              )}
            </div>
            <div className="flex-1" />
            <Button variant="outline" onClick={handleShare} className="gap-2">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
              {t('public:courseDetails.share', { defaultValue: 'Share' })}
            </Button>
            {isOwner && (
              <Button variant="outline" asChild className="gap-2">
                <Link to={`/teacher/courses/${course.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  {t('public:courseDetails.manageCourse', { defaultValue: 'Manage' })}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <section className="cd-in rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="text-lg font-bold">{t('public:courseDetails.description')}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{course.description}</p>
            {course.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {course.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">{tag}</span>
                ))}
              </div>
            )}
          </section>

          {/* Enrolled banner */}
          {activeEnrollment && (
            <div className="cd-in flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4">
              <div className="flex items-start gap-3">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-primary">{t('public:courseDetails.youreEnrolled', { defaultValue: "You're enrolled" })}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('public:courseDetails.currentSectionLine', {
                      defaultValue: 'Current section: {{section}}. Pick another below to switch.',
                      section: activeEnrollment.sectionName || t('public:courseDetails.alreadyEnrolledFallbackSection'),
                    })}
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="shrink-0">
                <Link to="/student/my-classes">{t('public:courseDetails.goToMyClasses')}</Link>
              </Button>
            </div>
          )}

          {/* Error */}
          {enrollmentError && (
            <div className="cd-in flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">{t('public:courseDetails.enrollmentIssue')}</p>
                <p className="mt-1 text-muted-foreground">{enrollmentError}</p>
                <button onClick={() => setEnrollmentError(null)} className="mt-2 text-xs font-medium text-primary hover:underline">
                  {t('public:courseDetails.dismiss')}
                </button>
              </div>
            </div>
          )}

          {/* Sections */}
          <section className="cd-in rounded-2xl border border-border/70 bg-card p-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{t('public:courseDetails.courseSectionsTitle')}</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeEnrollment
                ? t('public:courseDetails.sectionsSwitchHint', { defaultValue: 'Switch to a section that fits your schedule.' })
                : t('public:courseDetails.courseSectionsSubtitle')}
            </p>

            {course.sections.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">{t('public:courseDetails.noSectionsForCourse')}</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {course.sections.map((section) => {
                  const isCurrent = activeEnrollment?.sectionId === section.id;
                  const full = section.seatsRemaining <= 0;
                  const busy = busySectionId === section.id;
                  return (
                    <div
                      key={section.id}
                      className={cn(
                        'flex flex-col rounded-xl border p-4 transition-colors',
                        isCurrent ? 'border-primary bg-primary/5' : 'border-border bg-background/40 hover:border-primary/40'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{section.name}</h3>
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                            <Check className="h-3 w-3" />
                            {t('public:courseDetails.yourSection', { defaultValue: 'Your section' })}
                          </span>
                        ) : !section.isActive ? (
                          <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">{t('public:courseDetails.inactive')}</span>
                        ) : full ? (
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{t('public:courseDetails.sectionFull')}</span>
                        ) : null}
                      </div>

                      <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{section.locationLabel}</span></div>
                        <div className="flex items-center gap-1.5"><Users className="h-4 w-4 shrink-0" />{t('public:courseDetails.seatsRemainingShort', { count: section.seatsRemaining })}</div>
                        {section.meetingTimes.map((mt, idx) => (
                          <div key={idx} className="flex flex-wrap items-center gap-1.5">
                            <Calendar className="h-4 w-4 shrink-0" />
                            <span className="font-medium text-foreground">{localizeWeekday(mt.day)}</span>
                            <Clock className="h-4 w-4 shrink-0" />
                            <span>{mt.startTime} – {mt.endTime}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-1">
                        {!isAuthenticated ? (
                          <Button className="w-full" onClick={() => navigate(`/login?returnTo=${encodeURIComponent(`/courses/${id}`)}`)}>
                            {t('public:courseDetails.signInToEnrollCta')}
                          </Button>
                        ) : isCurrent ? (
                          section.joinUrl ? (
                            <a
                              href={section.joinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                            >
                              <Video className="h-4 w-4" />
                              {t('public:courseDetails.joinSession', { defaultValue: 'Join online session' })}
                            </a>
                          ) : (
                            <Button variant="outline" className="w-full" disabled>
                              <Check className="me-2 h-4 w-4" />
                              {t('public:courseDetails.enrolledHere', { defaultValue: 'Enrolled here' })}
                            </Button>
                          )
                        ) : activeEnrollment ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            disabled={busy || full || !section.isActive}
                            onClick={() => setSwitchConfirm({ sectionId: section.id, sectionName: section.name })}
                          >
                            {busy ? t('public:courseDetails.switchingDots', { defaultValue: 'Switching…' })
                              : full ? t('public:courseDetails.sectionFull')
                              : t('public:courseDetails.switchToSection', { defaultValue: 'Switch to this section' })}
                          </Button>
                        ) : (
                          <Button
                            className="w-full"
                            disabled={busy || full || !section.isActive}
                            onClick={() => handlePrimaryAction(section)}
                          >
                            {busy ? t('public:courseDetails.enrollingDots')
                              : full ? t('public:courseDetails.sectionFull')
                              : course.price && course.price > 0 && !hasElevatedRole(user?.roles)
                              ? t('public:courseDetails.enrollForPrice', { defaultValue: 'Enroll · {{price}}', price: formatMoney(course.price) })
                              : t('public:courseDetails.enrollFree', { defaultValue: 'Enroll for free' })}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="cd-in rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="text-lg font-bold">{t('public:courseDetails.courseInformation')}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <InfoRow icon={<GraduationCap className="h-4 w-4" />} label={t('public:courseDetails.provider')} value={course.providerName} />
              <InfoRow icon={<Layers className="h-4 w-4" />} label={t('public:courseDetails.category')} value={course.category} />
              <InfoRow icon={<BookOpen className="h-4 w-4" />} label={t('public:courseDetails.level')} value={localizeLevel(course.level)} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label={t('public:courseDetails.modality')} value={localizeModality(course.modality)} />
              {course.expectedDurationHours ? (
                <InfoRow icon={<Clock className="h-4 w-4" />} label={t('public:courseDetails.duration', { defaultValue: 'Duration' })} value={t('public:courseDetails.hoursValue', { defaultValue: '{{count}} hours', count: course.expectedDurationHours })} />
              ) : null}
              {(course.issueCertificates ?? course.certificateEnabled) ? (
                <InfoRow icon={<Award className="h-4 w-4" />} label={t('public:courseDetails.certificate', { defaultValue: 'Certificate' })} value={t('public:courseDetails.certificateIncluded', { defaultValue: 'On completion' })} />
              ) : null}
            </dl>
          </div>

          <div className="cd-in rounded-2xl border border-border/70 bg-card p-6">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">{t('public:courseDetails.instructor')}</h2>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {(course.instructorName || '?').split(' ').slice(0, 2).map((p) => p[0]).join('')}
              </span>
              <div>
                <p className="font-semibold">{course.instructorName}</p>
                <p className="text-xs text-muted-foreground">{course.providerName}</p>
              </div>
            </div>
          </div>

          {isOwner && (
            <div className="cd-in rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6">
              <p className="text-sm font-semibold text-primary">{t('public:courseDetails.ownerShareTitle', { defaultValue: 'Share this course' })}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('public:courseDetails.ownerShareBody', { defaultValue: 'Send this link to students — it opens straight to enrollment.' })}</p>
              <Button variant="outline" size="sm" className="mt-3 w-full gap-2" onClick={handleShare}>
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
                {copied ? t('public:courseDetails.linkCopied', { defaultValue: 'Course link copied' }) : t('public:courseDetails.copyShareLink', { defaultValue: 'Copy share link' })}
              </Button>
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={!!reEnrollConfirm}
        onOpenChange={(open) => { if (!open) setReEnrollConfirm(null); }}
        title={t('public:courseDetails.reEnrollDialogTitle')}
        description={t('public:courseDetails.reEnrollDialogDescription', { course: course.title, section: reEnrollConfirm?.sectionName ?? '' })}
        confirmLabel={t('public:courseDetails.reEnrollConfirmLabel')}
        variant="default"
        onConfirm={async () => {
          if (reEnrollConfirm) { await doEnroll(reEnrollConfirm.sectionId, reEnrollConfirm.sectionName, true); setReEnrollConfirm(null); }
        }}
      />

      <ConfirmDialog
        open={!!switchConfirm}
        onOpenChange={(open) => { if (!open) setSwitchConfirm(null); }}
        title={t('public:courseDetails.switchDialogTitle', { defaultValue: 'Switch section?' })}
        description={t('public:courseDetails.switchDialogDescription', {
          defaultValue: 'Move from {{from}} to {{to}}? Your progress stays with you.',
          from: activeEnrollment?.sectionName ?? '',
          to: switchConfirm?.sectionName ?? '',
        })}
        confirmLabel={t('public:courseDetails.switchConfirmLabel', { defaultValue: 'Switch section' })}
        variant="default"
        onConfirm={async () => {
          if (switchConfirm) { await doSwitch(switchConfirm.sectionId, switchConfirm.sectionName); setSwitchConfirm(null); }
        }}
      />
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="inline-flex items-center gap-2 text-muted-foreground">{icon}{label}</dt>
      <dd className="text-end font-medium">{value}</dd>
    </div>
  );
}
