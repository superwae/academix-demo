import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { toast } from "sonner";
import {
  courseExtrasService,
  type CourseMaterialDto,
  type LessonRatingSummaryDto,
  type MeetingTimeRatingSummaryDto,
} from "../../services/courseExtrasService";
import { formatMeetingSlot } from "../../lib/meetingTimeFormat";

const STATUS_CONFIG = {
  Draft: { label: "Draft", color: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
  PendingReview: { label: "Pending Review", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  Published: { label: "Published", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  Archived: { label: "Archived", color: "bg-red-500/10 text-red-600 dark:text-red-400" },
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
      toast.error("Could not load course insights");
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
      setError(err instanceof Error ? err.message : 'Failed to load courses');
      toast.error('Failed to load courses');
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
      toast.success(`"${course.title}" has been published`);
      setCourses((prev) =>
        prev.map((c) => c.id === course.id ? { ...c, status: 'Published' } : c)
      );
    } catch (err) {
      toast.error('Failed to publish course', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (course: AdminCourseDto) => {
    try {
      setActionLoading(course.id);
      await adminService.archiveCourse(course.id);
      toast.success(`"${course.title}" has been archived`);
      setCourses((prev) =>
        prev.map((c) => c.id === course.id ? { ...c, status: 'Archived' } : c)
      );
    } catch (err) {
      toast.error('Failed to archive course', {
        description: err instanceof Error ? err.message : 'Please try again',
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
      toast.success(`"${courseToDelete.title}" has been deleted`);
      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    } catch (err) {
      toast.error('Failed to delete course', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (error && courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">Failed to load courses</h2>
        <p className="text-muted-foreground mt-1">{error}</p>
        <Button onClick={fetchCourses} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
        <p className="text-sm text-muted-foreground">
          Manage and review all courses on the platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Courses" value={totalCourses} icon={BookOpen} iconColor="text-blue-500" loading={loading} />
        <StatCard title="Published" value={publishedCourses} icon={CheckCircle} iconColor="text-emerald-500" loading={loading} />
        <StatCard title="Pending Review" value={pendingCourses} icon={Clock} iconColor="text-amber-500" loading={loading} />
        <StatCard title="Draft" value={draftCourses} icon={BookOpen} iconColor="text-gray-500" loading={loading} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses or instructors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Status: {statusFilter === "all" ? "All" : STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG]?.label}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatusFilter("Published")}>Published</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("PendingReview")}>Pending Review</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Draft")}>Draft</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Archived")}>Archived</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Courses Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Course</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Instructor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rating</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-16 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      </div>
                    </td>
                    <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-6 w-20 animate-pulse rounded-full bg-muted" /></td>
                    <td className="px-4 py-3"><div className="h-8 w-8 animate-pulse rounded bg-muted ml-auto" /></td>
                  </tr>
                ))
              ) : (
                filteredCourses.map((course) => (
                  <tr key={course.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
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
                        <div>
                          <span className="font-medium line-clamp-1">{course.title}</span>
                          <span className="text-xs text-muted-foreground block">{course.level}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{course.instructorName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{course.category}</td>
                    <td className="px-4 py-3">{course.price != null ? `$${course.price.toFixed(2)}` : 'Free'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span>{course.rating.toFixed(1)}</span>
                        <span className="text-muted-foreground text-xs">({course.ratingCount})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        STATUS_CONFIG[course.status as keyof typeof STATUS_CONFIG]?.color
                      )}>
                        {STATUS_CONFIG[course.status as keyof typeof STATUS_CONFIG]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
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
                            <Eye className="mr-2 h-4 w-4" />
                            View Course
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openCourseInsights(course)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Materials & ratings
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {(course.status === "Draft" || course.status === "PendingReview") && (
                            <DropdownMenuItem
                              className="text-emerald-600"
                              onClick={() => handlePublish(course)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {course.status === "Published" && (
                            <DropdownMenuItem
                              className="text-amber-600"
                              onClick={() => handleArchive(course)}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteClick(course)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredCourses.length === 0 && (
          <div className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No courses found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Showing {((pageNumber - 1) * pageSize) + 1} to {Math.min(pageNumber * pageSize, totalCount)} of {totalCount} courses
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
                Page {pageNumber} of {totalPages}
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

      <Dialog open={insightsOpen} onOpenChange={setInsightsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Materials & ratings</DialogTitle>
            <DialogDescription>
              {insightsCourse?.title ?? "Course"} — read-only overview
            </DialogDescription>
          </DialogHeader>
          {insightsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Materials</p>
                {insightsMaterials.length === 0 ? (
                  <p className="text-muted-foreground">No materials uploaded.</p>
                ) : (
                  <ul className="space-y-2">
                    {insightsMaterials.map((m) => (
                      <li key={m.id} className="rounded-md border px-3 py-2">
                        <div className="font-medium">{m.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.kind === 1 ? "Book" : "File"}
                          {m.lessonTitle ? ` · ${m.lessonTitle}` : " · Whole course"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Lesson ratings</p>
                {insightsLessonR.length === 0 ? (
                  <p className="text-muted-foreground">No lesson ratings yet.</p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Session ratings</p>
                {insightsMeetR.length === 0 ? (
                  <p className="text-muted-foreground">No session ratings yet.</p>
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
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{courseToDelete?.title}"? This action cannot be undone.
              All enrollments and student progress will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={actionLoading === courseToDelete?.id}
            >
              {actionLoading === courseToDelete?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Course'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
