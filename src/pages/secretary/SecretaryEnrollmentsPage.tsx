import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, CalendarDays, CheckCircle2, Mail, RefreshCcw, Search, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { secretaryService } from "../../services/secretaryService";
import type { EnrollmentDto } from "../../services/enrollmentService";

const STATUS_OPTIONS = ["all", "Active", "Completed", "Cancelled", "Dropped", "Suspended"] as const;

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function statusBadgeClass(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "completed":
      return "border-primary/30 bg-primary/10 text-primary";
    case "cancelled":
    case "dropped":
    case "suspended":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "";
  }
}

export function SecretaryEnrollmentsPage() {
  const { t } = useTranslation(["admin", "common", "errors"]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("all");
  const [enrollments, setEnrollments] = useState<EnrollmentDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await secretaryService.getEnrollments({
          pageNumber: 1,
          pageSize: 100,
          searchTerm: searchTerm.trim() || undefined,
          sortBy: "enrolled",
          sortDescending: true,
        });
        if (!cancelled) {
          setEnrollments(result.items);
          setTotalCount(result.totalCount);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("common:somethingWrong"));
          setEnrollments([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [searchTerm, refreshToken, t]);

  const visibleEnrollments = useMemo(() => {
    if (statusFilter === "all") return enrollments;
    return enrollments.filter((enrollment) => enrollment.status === statusFilter);
  }, [enrollments, statusFilter]);

  const stats = useMemo(() => {
    const active = enrollments.filter((enrollment) => enrollment.status === "Active").length;
    const completed = enrollments.filter((enrollment) => enrollment.status === "Completed").length;
    return { active, completed };
  }, [enrollments]);

  const statusLabel = (status: string) =>
    t(`admin:secretary.enrollments.statuses.${status.toLowerCase()}`, { defaultValue: status });

  const statusOptions = STATUS_OPTIONS.map((status) => ({
    value: status,
    label: status === "all" ? t("admin:secretary.enrollments.statuses.all") : statusLabel(status),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("admin:secretary.enrollments.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("admin:secretary.enrollments.subtitle")}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
          <div className="rounded-lg border border-border/60 bg-card/70 p-3">
            <div className="text-xs text-muted-foreground">{t("admin:dashboard.totalEnrollments")}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{totalCount}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/70 p-3">
            <div className="text-xs text-muted-foreground">{statusLabel("Active")}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{stats.active}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/70 p-3">
            <div className="text-xs text-muted-foreground">{statusLabel("Completed")}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{stats.completed}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t("admin:secretary.enrollments.searchPlaceholder")}
            className="h-11 ps-10"
          />
        </div>
        <div className="w-full lg:w-56">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)} options={statusOptions} />
        </div>
        <Button variant="outline" size="sm" onClick={() => setRefreshToken((value) => value + 1)} disabled={loading}>
          <RefreshCcw className="h-4 w-4" />
          {t("common:refresh")}
        </Button>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle>{t("admin:secretary.enrollments.activeQueueTitle")}</CardTitle>
          <CardDescription>{t("admin:secretary.enrollments.activeQueueSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setRefreshToken((value) => value + 1)}>
                {t("common:retry")}
              </Button>
            </div>
          ) : loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("common:loading")}</div>
          ) : visibleEnrollments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <h2 className="mt-4 text-lg font-semibold">{t("admin:secretary.enrollments.noEnrollments")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("admin:secretary.enrollments.noEnrollmentsBody")}</p>
            </div>
          ) : (
            visibleEnrollments.map((enrollment, index) => (
              <motion.div
                key={enrollment.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className="flex flex-col gap-4 rounded-lg border border-border/60 bg-background p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <p className="font-mono text-xs text-muted-foreground">{enrollment.id}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold">{enrollment.userName || enrollment.userEmail}</h2>
                    <Badge className={statusBadgeClass(enrollment.status)} variant="outline">
                      {statusLabel(enrollment.status)}
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <BookOpen className="h-4 w-4 shrink-0" />
                      <span className="truncate">{enrollment.courseTitle}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <UserRound className="h-4 w-4 shrink-0" />
                      <span className="truncate">{enrollment.sectionName}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">{enrollment.userEmail}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      <span>{formatDate(enrollment.enrolledAt)}</span>
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {enrollment.assignedByOrgName && (
                    <Badge variant="secondary">{enrollment.assignedByOrgName}</Badge>
                  )}
                  <Badge variant="outline">
                    {t("admin:secretary.enrollments.progress", { value: Math.round(enrollment.progressPercentage) })}
                  </Badge>
                  <Button asChild size="sm" variant="secondary">
                    <a href={`mailto:${enrollment.userEmail}`}>
                      <Mail className="h-4 w-4" />
                      {t("admin:users.message")}
                    </a>
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
