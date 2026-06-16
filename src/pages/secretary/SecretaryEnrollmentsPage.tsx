import { motion } from "framer-motion";
import { Mail, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { DemoDataBadge } from "../../components/admin/finance/DemoDataBadge";

type RowStatus = "pending" | "review" | "approved";
type RowChannel = "Web" | "Referral";

const ROWS: { id: string; name: string; course: string; channel: RowChannel; status: RowStatus }[] = [
  { id: "ENR-8821", name: "Haya Al-Masri", course: "Data Literacy 101", channel: "Web", status: "pending" },
  { id: "ENR-8820", name: "Marcus Lee", course: "UX Fundamentals", channel: "Referral", status: "review" },
  { id: "ENR-8819", name: "Sofia Ivanova", course: "Python Basics", channel: "Web", status: "approved" },
];

export function SecretaryEnrollmentsPage() {
  const { t } = useTranslation(["admin"]);

  const channelLabel = (channel: RowChannel) =>
    channel === "Web"
      ? t("admin:secretary.enrollments.channels.web")
      : t("admin:secretary.enrollments.channels.referral");

  const statusLabel = (status: RowStatus) => {
    switch (status) {
      case "approved":
        return t("admin:secretary.enrollments.statuses.approved");
      case "review":
        return t("admin:secretary.enrollments.statuses.review");
      default:
        return t("admin:secretary.enrollments.statuses.pending");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">{t("admin:secretary.enrollments.title")} <DemoDataBadge /></h1>
        <p className="text-muted-foreground mt-1">
          {t("admin:secretary.enrollments.subtitle")}
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("admin:secretary.enrollments.activeQueueTitle")}</CardTitle>
            <CardDescription>{t("admin:secretary.enrollments.activeQueueSubtitle")}</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            {t("admin:secretary.enrollments.export")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {ROWS.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex flex-col gap-3 rounded-xl border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-xs text-muted-foreground">{r.id}</p>
                <p className="font-semibold">{r.name}</p>
                <p className="text-sm text-muted-foreground">{r.course}</p>
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {t("admin:secretary.enrollments.emailOnFile")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {t("admin:secretary.enrollments.phoneOptional")}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{channelLabel(r.channel)}</Badge>
                <Badge
                  variant={
                    r.status === "approved"
                      ? "secondary"
                      : r.status === "review"
                        ? "default"
                        : "outline"
                  }
                >
                  {statusLabel(r.status)}
                </Badge>
                <Button size="sm">{t("admin:secretary.enrollments.open")}</Button>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
