import { motion } from "framer-motion";
import { CheckCircle2, Clock, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { DemoDataBadge } from "../../components/admin/finance/DemoDataBadge";
import { formatMoney } from "../../lib/money";

type BatchStatus = "scheduled" | "sent";

const BATCHES: { id: string; instructors: number; amount: number; status: BatchStatus; date: string }[] = [
  { id: "PAY-2026-03-A", instructors: 14, amount: 18240, status: "scheduled", date: "Mar 25" },
  { id: "PAY-2026-02-B", instructors: 22, amount: 31880, status: "sent", date: "Feb 28" },
  { id: "PAY-2026-02-A", instructors: 19, amount: 28102, status: "sent", date: "Feb 14" },
];

export function AccountantPayoutsPage() {
  const { t } = useTranslation(["admin"]);

  const stats = [
    {
      label: t("admin:accountant.payouts.stats.nextRun"),
      value: t("admin:accountant.payouts.stats.nextRunValue"),
      sub: t("admin:accountant.payouts.stats.nextRunSub"),
    },
    {
      label: t("admin:accountant.payouts.stats.onHold"),
      value: formatMoney(0),
      sub: t("admin:accountant.payouts.stats.onHoldSub"),
    },
    {
      label: t("admin:accountant.payouts.stats.avgProcessing"),
      value: t("admin:accountant.payouts.stats.avgProcessingValue"),
      sub: t("admin:accountant.payouts.stats.avgProcessingSub"),
    },
  ];

  const statusLabel = (status: BatchStatus) =>
    status === "sent"
      ? t("admin:accountant.payouts.statuses.sent")
      : t("admin:accountant.payouts.statuses.scheduled");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">{t("admin:accountant.payouts.title")} <DemoDataBadge /></h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          {t("admin:accountant.payouts.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardDescription>{s.label}</CardDescription>
                <CardTitle className="text-2xl">{s.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("admin:accountant.payouts.batchesTitle")}</CardTitle>
            <CardDescription>{t("admin:accountant.payouts.batchesSubtitle")}</CardDescription>
          </div>
          <Button size="sm" className="gap-2">
            <Send className="h-4 w-4" />
            {t("admin:accountant.payouts.newBatch")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {BATCHES.map((b) => (
            <div
              key={b.id}
              className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-sm font-semibold">{b.id}</p>
                <p className="text-sm text-muted-foreground">
                  {t("admin:accountant.payouts.instructorsMeta", { count: b.instructors, date: b.date })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold tabular-nums">{formatMoney(b.amount)}</span>
                <Badge
                  variant={b.status === "sent" ? "secondary" : "default"}
                  className="gap-1"
                >
                  {b.status === "sent" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {statusLabel(b.status)}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
