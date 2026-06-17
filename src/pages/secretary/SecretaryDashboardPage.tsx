import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarClock,
  Inbox,
  UserPlus,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/cn";
import { secretaryService } from "../../services/secretaryService";
import { conversationService } from "../../services/conversationService";
import type { EnrollmentDto } from "../../services/enrollmentService";

type DashboardData = {
  enrollments: EnrollmentDto[];
  totalEnrollments: number;
  directoryCount: number;
  unreadMessages: number;
};

export function SecretaryDashboardPage() {
  const { t } = useTranslation(["admin"]);
  const [data, setData] = useState<DashboardData>({
    enrollments: [],
    totalEnrollments: 0,
    directoryCount: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const [enrollments, directory, conversations] = await Promise.all([
          secretaryService.getEnrollments({ pageSize: 100, sortBy: "enrolledAt", sortDescending: true }),
          secretaryService.getDirectory({ pageSize: 1 }),
          conversationService.getConversations().catch(() => []),
        ]);
        if (cancelled) return;
        setData({
          enrollments: enrollments.items || [],
          totalEnrollments: enrollments.totalCount ?? enrollments.items?.length ?? 0,
          directoryCount: directory.totalCount ?? directory.items?.length ?? 0,
          unreadMessages: conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("admin:secretary.dashboard.errors.loadFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const activeEnrollments = useMemo(
    () => data.enrollments.filter((e) => e.status === "Active").length,
    [data.enrollments]
  );
  const completedEnrollments = useMemo(
    () => data.enrollments.filter((e) => e.status === "Completed").length,
    [data.enrollments]
  );
  const latestActivity = useMemo(
    () =>
      [...data.enrollments]
        .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime())
        .slice(0, 5),
    [data.enrollments]
  );

  const queue = [
    { title: t("admin:secretary.dashboard.queue.enrollmentRequests"), count: data.totalEnrollments, tone: "default" as const },
    { title: t("admin:secretary.dashboard.queue.directoryRecords"), count: data.directoryCount, tone: "amber" as const },
    { title: t("admin:secretary.dashboard.queue.messagesAwaitingReply"), count: data.unreadMessages, tone: "default" as const },
  ];

  const serviceLevel = [
    {
      label: t("admin:secretary.dashboard.serviceLevel.totalEnrollments"),
      value: data.totalEnrollments.toLocaleString(),
      ok: true,
    },
    {
      label: t("admin:secretary.dashboard.serviceLevel.activeEnrollments"),
      value: activeEnrollments.toLocaleString(),
      ok: true,
    },
    {
      label: t("admin:secretary.dashboard.serviceLevel.completedEnrollments"),
      value: completedEnrollments.toLocaleString(),
      ok: completedEnrollments > 0,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold tracking-tight md:text-3xl"
        >
          {t("admin:secretary.dashboard.title")}
        </motion.h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          {t("admin:secretary.dashboard.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {queue.map((q, i) => (
          <motion.div
            key={q.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className={cn(
                "border-border/60 overflow-hidden",
                q.tone === "amber" && "border-amber-500/30 bg-amber-500/[0.04]"
              )}
            >
              <CardHeader className="pb-2">
                <CardDescription>{q.title}</CardDescription>
                <CardTitle className="text-4xl font-bold tabular-nums">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : q.count.toLocaleString()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Inbox className="h-3.5 w-3.5" />
                  {t("admin:secretary.dashboard.queue.liveData")}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5 text-primary" />
              {t("admin:secretary.dashboard.today.title")}
            </CardTitle>
            <CardDescription>{t("admin:secretary.dashboard.today.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestActivity.length === 0 && !loading ? (
              <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                {t("admin:secretary.dashboard.today.empty")}
              </div>
            ) : latestActivity.map((row) => (
              <div
                key={row.id}
                className="flex gap-4 rounded-xl border border-border/50 bg-muted/20 px-4 py-3"
              >
                <span className="w-14 shrink-0 text-sm font-mono font-semibold text-primary">
                  {formatShortDate(row.enrolledAt)}
                </span>
                <p className="text-sm leading-snug">
                  {t("admin:secretary.dashboard.today.enrollmentLine", {
                    learner: row.userName,
                    course: row.courseTitle,
                    section: row.sectionName,
                  })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">{t("admin:secretary.dashboard.serviceLevel.title")}</CardTitle>
            <CardDescription>{t("admin:secretary.dashboard.serviceLevel.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceLevel.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2"
              >
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className="flex items-center gap-2 font-semibold">
                  {row.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  {row.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5" />
              {t("admin:secretary.dashboard.quickEnrollment.title")}
            </CardTitle>
            <CardDescription>{t("admin:secretary.dashboard.quickEnrollment.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/secretary/enrollments"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("admin:secretary.dashboard.quickEnrollment.action")}
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-gradient-to-br from-cyan-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              {t("admin:secretary.dashboard.directoryCard.title")}
            </CardTitle>
            <CardDescription>{t("admin:secretary.dashboard.directoryCard.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/secretary/directory"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("admin:secretary.dashboard.directoryCard.action")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
