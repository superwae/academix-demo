import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { localizeLevel } from "../../lib/enumLocalization";
import {
  BookOpen,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  CheckCircle,
  Clock,
  Archive,
  Trash2,
  ChevronDown,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  FileText,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { adminService } from "../../services/adminService";
import type { AdminCourseDto, PagedResult } from "../../services/adminService";
import { ResponsiveTable, type ResponsiveTableColumn } from "../../components/ui/responsive-table";
import { toast } from "sonner";
import {
  courseExtrasService,
  type CourseMaterialDto,
  type LessonRatingSummaryDto,
  type MeetingTimeRatingSummaryDto,
} from "../../services/courseExtrasService";
import { formatMeetingSlot } from "../../lib/meetingTimeFormat";

const STATUS_COLORS = {
  Draft: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  PendingReview: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Published: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Archived: "bg-red-500/10 text-red-600 dark:text-red-400",
};

function StatCard({ title, value, icon: Icon, iconColor, loading }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <div className="mt-1 h-8 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-1 text-2xl font-bold">{value}</p>
          )}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10")}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

export function AdminCoursesPage() {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const navigate = useNavigate();
  const [courses, setCourses] = useState<AdminCourseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Pagination state
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<AdminCourseDto | null>(null);

  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsCourse, setInsightsCourse] = useState<AdminCourseDto | null>(null);
  const [insightsMaterials, setInsightsMaterials] = useState<CourseMaterialDto[]>([]);
  const [insightsLessonR, setInsightsLessonR] = useState<LessonRatingSummaryDto[]>([]);
  const [insightsMeetR, setInsightsMeetR] = useState<MeetingTimeRatingSummaryDto[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const STATUS_LABELS: Record<string, string> = {
    Draft: t('admin:courses.statuses.draft'),
    PendingReview: t('admin:courses.statuses.pendingReview'),
    Published: t('admin:courses.statuses.published'),
    Archived: t('admin:courses.statuses.archived'),
  };

  const openCourseInsights = async (course: AdminCourseDto) => {
    setInsightsCourse(course);
    setInsightsOpen(true);
    setInsightsLoading(true);
    setInsightsMaterials([]);
    setInsightsLessonR([]);
    setInsightsMeetR([]);
    try {
      const [m, lr, mr] = await Promise.all([
        courseExtrasService.getMaterials(course.id).catch(() => [] as CourseMaterialDto[]),
        courseExtrasService.getLessonRatingSummaries(course.id).catch(() => [] as LessonRatingSummaryDto[]),
        courseExtrasService.getMeetingTimeRatingSummaries(course.id).catch(
          () => [] as MeetingTimeRatingSummaryDto[],
        ),
      ]);
      setInsightsMaterials(m);
      setInsightsLessonR(lr);
      setInsightsMeetR(mr);
    } catch {
      toast.error(t('admin:courses.toasts.insightsFailed'));
    } finally {
      setInsightsLoading(false);
    }
  };

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.getCourses({
        pageNumber,
        pageSize,
        searchTerm: searchQuery || undefined,
      });
      setCourses(result.items);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin:courses.errors.loadFailed'));
      toast.error(t('admin:courses.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, searchQuery]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPageNumber(1);
  }, [searchQuery]);

  const filteredCourses = courses.filter((course) => {
    const matchesStatus = statusFilter === "all" || course.status === statusFilter;
    return matchesStatus;
  });

  const totalCourses = totalCount;
  const publishedCourses = courses.filter((c) => c.status === "Published").length;
  const pendingCourses = courses.filter((c) => c.status === "PendingReview").length;
  const draftCourses = courses.filter((c) => c.status === "Draft").length;

  const handlePublish = async (course: AdminCourseDto) => {
    try {
      setActionLoading(course.id);
      await adminService.publishCourse(course.id);
      toast.success(t('admin:courses.toasts.published', { title: course.title }));
      setCourses((prev) =>
        prev.map((c) => c.id === course.id ? { ...c, status: 'Published' } : c)
      );
    } catch (err) {
      toast.error(t('admin:courses.errors.publishFailed'), {
        description: err instanceof Error ? err.message : t('admin:courses.errors.tryAgain'),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (course: AdminCourseDto) => {
    try {
      setActionLoading(course.id);
      await adminService.archiveCourse(course.id);
      toast.success(t('admin:courses.toasts.archived', { title: course.title }));
      setCourses((prev) =>
        prev.map((c) => c.id === course.id ? { ...c, status: 'Archived' } : c)
      );
    } catch (err) {
      toast.error(t('admin:courses.errors.archiveFailed'), {
        description: err instanceof Error ? err.message : t('admin:courses.errors.tryAgain'),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteClick = (course: AdminCourseDto) => {
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!courseToDelete) return;

    try {
      setActionLoading(courseToDelete.id);
      await adminService.deleteCourse(courseToDelete.id);
      toast.success(t('admin:courses.toasts.deleted', { title: courseToDelete.title }));
      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    } catch (err) {
      toast.error(t('admin:courses.errors.deleteFailed'), {
        description: err instanceof Error ? err.message : t('admin:courses.errors.tryAgain'),
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (error && courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">{t('admin:courses.errors.loadFailed')}</h2>
        <p className="text-muted-foreground mt-1">{error}</p>
        <Button onClick={fetchCourses} className="mt-4">
          {t('admin:shared.tryAgain')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('admin:courses.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('admin:courses.subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t('admin:courses.stats.totalCourses')} value={totalCourses} icon={BookOpen} iconColor="text-blue-500" loading={loading} />
        <StatCard title={t('admin:courses.stats.published')} value={publishedCourses} icon={CheckCircle} iconColor="text-emerald-500" loading={loading} />
        <StatCard title={t('admin:courses.stats.pendingReview')} value={pendingCourses} icon={Clock} iconColor="text-amber-500" loading={loading} />
        <StatCard title={t('admin:courses.stats.draft')} value={draftCourses} icon={BookOpen} iconColor="text-gray-500" loading={loading} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin:courses.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {t('admin:courses.filters.statusLabel')} {statusFilter === "all" ? t('admin:courses.filters.all') : STATUS_LABELS[statusFilter]}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>{t('admin:courses.filters.all')}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatusFilter("Published")}>{t('admin:courses.statuses.published')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("PendingReview")}>{t('admin:courses.statuses.pendingReview')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Draft")}>{t('admin:courses.statuses.draft')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Archived")}>{t('admin:courses.statuses.archived')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Courses Table */}
      {(() => {
        const courseColumns: ResponsiveTableColumn<AdminCourseDto>[] = [
          {
            id: 'course',
            header: t('admin:courses.table.course'),
            cell: (course) => (
              <div className="flex items-center gap-3">
                {course.thumbnailUrl ? (
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="h-10 w-16 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-10 w-16 rounded-md bg-muted flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="text-start">
                  <span className="font-medium line-clamp-1">{course.title}</span>
                  <span className="text-xs text-muted-foreground block">{localizeLevel(course.level)}</span>
                </div>
              </div>
            ),
          },
          {
            id: 'instructor',
            header: t('admin:courses.table.instructor'),
            cell: (course) => (
              <span className="text-muted-foreground">{course.instructorName}</span>
            ),
          },
          {
            id: 'category',
            header: t('admin:courses.table.category'),
            hiddenOnMobile: true,
            cell: (course) => (
              <span className="text-muted-foreground">{course.category}</span>
            ),
          },
          {
            id: 'price',
            header: t('admin:courses.table.price'),
            cell: (course) => (
              <span>{course.price != null ? `$${course.price.toFixed(2)}` : t('admin:courses.free')}</span>
            ),
          },
          {
            id: 'rating',
            header: t('admin:courses.table.rating'),
            hiddenOnMobile: true,
            cell: (course) => (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{course.rating.toFixed(1)}</span>
                <span className="text-muted-foreground text-xs">({course.ratingCount})</span>
              </div>
            ),
          },
          {
            id: 'status',
            header: t('admin:courses.table.status'),
            cell: (course) => (
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                STATUS_COLORS[course.status as keyof typeof STATUS_COLORS]
              )}>
                {STATUS_LABELS[course.status]}
              </span>
            ),
          },
          {
            id: 'actions',
            header: t('admin:courses.table.actions'),
            className: 'text-end',
            cell: (course) => (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={actionLoading === course.id}
                    >
                      {actionLoading === course.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/courses/${course.id}`)}>
                      <Eye className="me-2 h-4 w-4" />
                      {t('admin:courses.viewCourse')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openCourseInsights(course)}>
                      <FileText className="me-2 h-4 w-4" />
                      {t('admin:courses.materialsRatings')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {(course.status === "Draft" || course.status === "PendingReview") && (
                      <DropdownMenuItem
                        className="text-emerald-600"
                        onClick={() => handlePublish(course)}
                      >
                        <CheckCircle className="me-2 h-4 w-4" />
                        {t('admin:courses.publish')}
                      </DropdownMenuItem>
                    )}
                    {course.status === "Published" && (
                      <DropdownMenuItem
                        className="text-amber-600"
                        onClick={() => handleArchive(course)}
                      >
                        <Archive className="me-2 h-4 w-4" />
                        {t('admin:courses.archive')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteClick(course)}
                    >
                      <Trash2 className="me-2 h-4 w-4" />
                      {t('admin:courses.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          },
        ];

        return (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="h-10 w-16 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-24 animate-pulse rounded bg-muted ms-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 md:p-0">
                <ResponsiveTable
                  data={filteredCourses}
                  columns={courseColumns}
                  rowKey={(course) => course.id}
                  empty={
                    <div className="py-12 text-center">
                      <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-2 text-sm text-muted-foreground">{t('admin:courses.empty')}</p>
                    </div>
                  }
                />
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  {t('admin:courses.pagination.showing', {
                    from: ((pageNumber - 1) * pageSize) + 1,
                    to: Math.min(pageNumber * pageSize, totalCount),
                    total: totalCount,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    disabled={pageNumber === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {t('admin:courses.pagination.page', { current: pageNumber, total: totalPages })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                    disabled={pageNumber === totalPages || loading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <Dialog open={insightsOpen} onOpenChange={setInsightsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin:courses.materialsRatings')}</DialogTitle>
            <DialogDescription>
              {t('admin:courses.readOnlyOverview', { title: insightsCourse?.title ?? t('admin:courses.fallbackCourse') })}
            </DialogDescription>
          </DialogHeader>
          {insightsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{t('admin:courses.materials')}</p>
                {insightsMaterials.length === 0 ? (
                  <p className="text-muted-foreground">{t('admin:courses.noMaterials')}</p>
                ) : (
                  <ul className="space-y-2">
                    {insightsMaterials.map((m) => (
                      <li key={m.id} className="rounded-md border px-3 py-2">
                        <div className="font-medium">{m.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.kind === 1 ? t('admin:courses.materialKindBook') : t('admin:courses.materialKindFile')}
                          {m.lessonTitle ? ` · ${m.lessonTitle}` : ` · ${t('admin:courses.wholeCourse')}`}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{t('admin:courses.lessonRatings')}</p>
                {insightsLessonR.length === 0 ? (
                  <p className="text-muted-foreground">{t('admin:courses.noLessonRatings')}</p>
                ) : (
                  <ul className="space-y-1">
                    {insightsLessonR.map((r) => (
                      <li key={r.lessonId} className="flex justify-between gap-2">
                        <span className="truncate">{r.lessonTitle}</span>
                        <span className="text-muted-foreground shrink-0">
                          {r.ratingCount > 0 ? `${r.averageRating.toFixed(1)} (${r.ratingCount})` : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{t('admin:courses.sessionRatings')}</p>
                {insightsMeetR.length === 0 ? (
                  <p className="text-muted-foreground">{t('admin:courses.noSessionRatings')}</p>
                ) : (
                  <ul className="space-y-1">
                    {insightsMeetR.map((r) => (
                      <li key={r.sectionMeetingTimeId} className="flex justify-between gap-2">
                        <span className="line-clamp-2">
                          {r.sectionName} — {formatMeetingSlot(r.day, r.startMinutes, r.endMinutes)}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {r.ratingCount > 0 ? `${r.averageRating.toFixed(1)} (${r.ratingCount})` : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin:courses.deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('admin:courses.deleteDialog.description', { title: courseToDelete?.title ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common:cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={actionLoading === courseToDelete?.id}
            >
              {actionLoading === courseToDelete?.id ? (
                <>
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  {t('admin:courses.deleting')}
                </>
              ) : (
                t('admin:courses.deleteCourse')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
