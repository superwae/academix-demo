import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, MapPin, RefreshCcw, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { courseService, type CourseDto } from "../../services/courseService";
import {
  expandCoursesToWeekEvents,
  formatTimeRange,
  groupByDay,
  startOfWeek,
  type WeeklySessionEvent,
} from "../../lib/weeklySessions";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function addWeeks(date: Date, weeks: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(value);
}

export function SecretaryCalendarPage() {
  const { t } = useTranslation(["admin", "common", "errors"]);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await courseService.getCourses({
          pageNumber: 1,
          pageSize: 250,
          sortBy: "created",
          sortDescending: true,
        });
        if (!cancelled) setCourses(result.items);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("common:somethingWrong"));
          setCourses([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshToken, t]);

  const weekStart = useMemo(() => addWeeks(startOfWeek(new Date()), weekOffset), [weekOffset]);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  const events = useMemo(() => expandCoursesToWeekEvents(courses, weekStart), [courses, weekStart]);
  const groupedDays = useMemo(() => groupByDay(events, weekStart), [events, weekStart]);
  const scheduledCourseCount = useMemo(
    () => new Set(events.map((event) => event.courseId)).size,
    [events],
  );
  const onlineLinkCount = useMemo(
    () => courses.flatMap((course) => course.sections ?? []).filter((section) => section.joinUrl?.trim()).length,
    [courses],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("admin:secretary.calendar.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("admin:secretary.calendar.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((value) => value - 1)} aria-label={t("admin:secretary.calendar.previousWeek")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
            {t("admin:secretary.calendar.thisWeek")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((value) => value + 1)} aria-label={t("admin:secretary.calendar.nextWeek")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRefreshToken((value) => value + 1)} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            {t("common:refresh")}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-card/70 p-4">
          <div className="text-xs text-muted-foreground">{t("admin:secretary.calendar.sessionsThisWeek")}</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{events.length}</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card/70 p-4">
          <div className="text-xs text-muted-foreground">{t("admin:secretary.calendar.coursesScheduled")}</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{scheduledCourseCount}</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card/70 p-4">
          <div className="text-xs text-muted-foreground">{t("admin:secretary.calendar.onlineLinks")}</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{onlineLinkCount}</div>
        </div>
      </div>

      <Card className="border-border/60 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            {t("admin:secretary.calendar.weekOf", {
              start: formatDate(weekStart),
              end: formatDate(weekEnd),
            })}
          </CardTitle>
          <CardDescription>{t("admin:secretary.calendar.headerDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setRefreshToken((value) => value + 1)}>
                {t("common:retry")}
              </Button>
            </div>
          ) : loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("common:loading")}</div>
          ) : events.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <h2 className="mt-4 text-lg font-semibold">{t("admin:secretary.calendar.noSessions")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("admin:secretary.calendar.noSessionsBody")}</p>
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-7">
              {groupedDays.map((day) => (
                <motion.section
                  key={day.dayIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: day.dayIndex * 0.025 }}
                  className="min-h-[180px] rounded-lg border border-border/60 bg-background p-3"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold">{t(`admin:secretary.calendar.weekdays.${WEEKDAY_KEYS[day.dayIndex]}`)}</h2>
                      <p className="text-xs text-muted-foreground">{formatDate(day.date)}</p>
                    </div>
                    <Badge variant="outline">{day.events.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {day.events.length === 0 ? (
                      <p className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                        {t("admin:secretary.calendar.noDaySessions")}
                      </p>
                    ) : (
                      day.events.map((event) => <SessionBlock key={event.key} event={event} />)
                    )}
                  </div>
                </motion.section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SessionBlock({ event }: { event: WeeklySessionEvent }) {
  const { t } = useTranslation(["admin"]);

  return (
    <div className="rounded-md border border-border/70 bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{event.courseTitle}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{event.sectionName}</p>
        </div>
        {event.joinUrl ? (
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 min-h-[32px] min-w-[32px]" title={t("admin:secretary.calendar.openJoinLink")}>
            <a href={event.joinUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : (
          <Badge variant="outline" className="gap-1">
            <Video className="h-3 w-3" />
            {t("admin:secretary.calendar.noLink")}
          </Badge>
        )}
      </div>
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p>{formatTimeRange(event.startMinutes, event.endMinutes)}</p>
        {event.locationLabel && (
          <p className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{event.locationLabel}</span>
          </p>
        )}
      </div>
    </div>
  );
}
