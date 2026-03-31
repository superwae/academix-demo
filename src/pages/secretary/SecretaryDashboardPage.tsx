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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/cn";

const QUEUE = [
  { title: "Enrollment requests", count: 6, tone: "default" as const },
  { title: "Document follow-ups", count: 3, tone: "amber" as const },
  { title: "Messages awaiting reply", count: 2, tone: "default" as const },
];

const TODAY = [
  { time: "09:30", label: "Registrar sync — cohort A" },
  { time: "11:00", label: "Walk-in office hours" },
  { time: "14:15", label: "Certificate batch dispatch" },
];

export function SecretaryDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold tracking-tight md:text-3xl"
        >
          Operations desk
        </motion.h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Front-office snapshot: queues, touchpoints, and today&apos;s rhythm.
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
                  Needs attention
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
              Today
            </CardTitle>
            <CardDescription>Structured day — demo schedule.</CardDescription>
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
            <CardTitle className="text-lg">Service level</CardTitle>
            <CardDescription>How the desk is performing (sample KPIs).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "First response (median)", value: "2h 10m", ok: true },
              { label: "SLA breaches (7d)", value: "0", ok: true },
              { label: "Open enrollment tickets", value: "6", ok: false },
            ].map((row) => (
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
              Quick: new enrollment
            </CardTitle>
            <CardDescription>Jump to the enrollments queue with filters applied.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/secretary/enrollments"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Open enrollments →
            </Link>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-gradient-to-br from-cyan-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              Directory
            </CardTitle>
            <CardDescription>Search learners and guardians for callbacks.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              to="/secretary/directory"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Open directory →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
