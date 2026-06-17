import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Clock, Download, RefreshCw, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { formatMoney } from "../../lib/money";
import { financeService, type FinancePayoutDto, type FinancePayoutSummaryDto } from "../../services/financeService";

const toMajor = (amount: number) => amount / 100;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function AccountantPayoutsPage() {
  const { t } = useTranslation(["admin", "common"]);
  const [payouts, setPayouts] = useState<FinancePayoutDto[]>([]);
  const [summary, setSummary] = useState<FinancePayoutSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPayouts = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [payoutResult, summaryResult] = await Promise.all([
        financeService.getPayouts(1, 100),
        financeService.getPayoutSummary(),
      ]);
      setPayouts(payoutResult.items ?? []);
      setSummary(summaryResult);
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPayouts();
  }, []);

  const currency = summary?.currency || "ILS";
  const money = (amount: number) => formatMoney(toMajor(amount), currency);

  const stats = [
    {
      label: t("admin:accountant.payouts.live.pending", { defaultValue: "Pending payout liability" }),
      value: money(summary?.pendingTotal ?? 0),
      sub: t("admin:finance.payouts.stats.payouts", { count: summary?.pendingCount ?? 0 }),
    },
    {
      label: t("admin:accountant.payouts.live.instructors", { defaultValue: "Payable instructors" }),
      value: String(summary?.uniqueInstructors ?? 0),
      sub: t("admin:finance.payouts.stats.withEarnings"),
    },
    {
      label: t("admin:accountant.payouts.live.completed", { defaultValue: "Completed through system" }),
      value: money(summary?.completedTotal ?? 0),
      sub: t("admin:finance.payouts.stats.payouts", { count: summary?.completedCount ?? 0 }),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("admin:accountant.payouts.title")}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            {t("admin:accountant.payouts.live.subtitle", { defaultValue: "Live instructor payout liability calculated from completed course-sale revenue splits." })}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          {t("admin:finance.payouts.export")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-2xl">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{stat.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("admin:accountant.payouts.batchesTitle")}</CardTitle>
            <CardDescription>
              {t("admin:accountant.payouts.live.batchesSubtitle", { defaultValue: "Payable instructors grouped from live completed payments." })}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => void loadPayouts()}>
            <RefreshCw className="h-4 w-4" />
            {t("common:refresh", { defaultValue: "Refresh" })}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border/50 py-12 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {t("common:loading")}
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
              <AlertCircle className="mx-auto h-7 w-7 text-destructive" />
              <p className="mt-2 text-sm text-destructive">{loadError}</p>
            </div>
          ) : payouts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {t("admin:finance.payouts.empty.message")}
            </div>
          ) : (
            payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {payout.avatar || "IN"}
                  </div>
                  <div>
                    <p className="font-mono text-sm font-semibold">{payout.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {payout.instructorName} / {payout.courseCount} {t("admin:finance.payouts.instructorMeta.coursePlural", { defaultValue: "courses" })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payout.periodStart)} - {formatDate(payout.periodEnd)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold tabular-nums">{money(payout.netAmount)}</span>
                  <Badge variant="default" className="gap-1">
                    {payout.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {t(`admin:finance.payouts.status.${payout.status === "on_hold" ? "onHold" : payout.status}`)}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
