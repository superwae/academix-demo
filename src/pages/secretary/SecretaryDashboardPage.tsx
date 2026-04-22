import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarClock,
  Inbox,
  UserPlus,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/cn";

export function SecretaryDashboardPage() {
  const { t } = useTranslation(["admin"]);

  const QUEUE = [
    { title: t("admin:secretary.dashboard.queue.enrollmentRequests"), count: 6, tone: "default" as const },
    { title: t("admin:secretary.dashboard.queue.documentFollowUps"), count: 3, tone: "amber" as const },
    { title: t("admin:secretary.dashboard.queue.messagesAwaitingReply"), count: 2, tone: "default" as const },
  ];

  const TODAY = [
    { time: "09:30", label: t("admin:secretary.dashboard.today.items.registrarSync") },
    { time: "11:00", label: t("admin:secretary.dashboard.today.items.walkIn") },
    { time: "14:15", label: t("admin:secretary.dashboard.today.items.certificateDispatch") },
  ];

  const serviceLevel = [
    {
      label: t("admin:secretary.dashboard.serviceLevel.firstResponse"),
      value: t("admin:secretary.dashboard.serviceLevel.firstResponseValue"),
      ok: true,
    },
    {
      label: t("admin:secretary.dashboard.serviceLevel.slaBreaches"),
      value: t("admin:secretary.dashboard.serviceLevel.slaBreachesValue"),
      ok: true,
    },
    {
      label: t("admin:secretary.dashboard.serviceLevel.openTickets"),
      value: t("admin:secretary.dashboard.serviceLevel.openTicketsValue"),
      ok: false,
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
        {QUEUE.map((q, i) => (
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
                <CardTitle className="text-4xl font-bold tabular-nums">{q.count}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Inbox className="h-3.5 w-3.5" />
                  {t("admin:secretary.dashboard.queue.needsAttention")}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

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
            {TODAY.map((row) => (
              <div
                key={row.time + row.label}
                className="flex gap-4 rounded-xl border border-border/50 bg-muted/20 px-4 py-3"
              >
                <span className="w-14 shrink-0 text-sm font-mono font-semibold text-primary">
                  {row.time}
                </span>
                <p className="text-sm leading-snug">{row.label}</p>
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
