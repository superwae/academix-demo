import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  FileCheck,
  PieChart,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/cn";

export function AccountantDashboardPage() {
  const { t } = useTranslation(["admin"]);

  const KPI = [
    {
      label: t("admin:accountant.dashboard.kpi.netRevenue"),
      value: "$48,290",
      delta: t("admin:accountant.dashboard.kpi.netRevenueDelta"),
      up: true as boolean | null,
      icon: TrendingUp,
    },
    {
      label: t("admin:accountant.dashboard.kpi.pendingPayouts"),
      value: "$6,420",
      delta: t("admin:accountant.dashboard.kpi.pendingPayoutsDelta"),
      up: null as boolean | null,
      icon: Banknote,
    },
    {
      label: t("admin:accountant.dashboard.kpi.invoicesDue"),
      value: "12",
      delta: t("admin:accountant.dashboard.kpi.invoicesDueDelta"),
      up: null as boolean | null,
      icon: Receipt,
    },
    {
      label: t("admin:accountant.dashboard.kpi.reconciliation"),
      value: "98.2%",
      delta: t("admin:accountant.dashboard.kpi.reconciliationDelta"),
      up: true as boolean | null,
      icon: FileCheck,
    },
  ];

  const PIPELINE = [
    { stage: t("admin:accountant.dashboard.pipeline.authorized"), amount: "$12,400", count: 18 },
    { stage: t("admin:accountant.dashboard.pipeline.settled"), amount: "$28,910", count: 42 },
    { stage: t("admin:accountant.dashboard.pipeline.awaitingReview"), amount: "$6,980", count: 9 },
  ];

  const COMPLIANCE_ITEMS = [
    t("admin:accountant.dashboard.compliance.items.vatExport"),
    t("admin:accountant.dashboard.compliance.items.payoutRates"),
    t("admin:accountant.dashboard.compliance.items.refundQueue"),
    t("admin:accountant.dashboard.compliance.items.chargebackWindow"),
  ];

  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold tracking-tight md:text-3xl"
        >
          {t("admin:accountant.dashboard.title")}
        </motion.h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          {t("admin:accountant.dashboard.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {k.label}
                </CardTitle>
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <k.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{k.value}</div>
                <p
                  className={cn(
                    "text-xs mt-1 flex items-center gap-1",
                    k.up === true && "text-emerald-600 dark:text-emerald-400",
                    k.up === false && "text-destructive",
                    k.up === null && "text-muted-foreground"
                  )}
                >
                  {k.up === true && <ArrowUpRight className="h-3 w-3" />}
                  {k.up === false && <ArrowDownRight className="h-3 w-3" />}
                  {k.delta}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChart className="h-5 w-5 text-primary" />
              {t("admin:accountant.dashboard.pipeline.title")}
            </CardTitle>
            <CardDescription>{t("admin:accountant.dashboard.pipeline.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {PIPELINE.map((row) => (
              <div
                key={row.stage}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{row.stage}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("admin:accountant.dashboard.pipeline.items", { count: row.count })}
                  </p>
                </div>
                <span className="text-lg font-semibold tabular-nums">{row.amount}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">{t("admin:accountant.dashboard.compliance.title")}</CardTitle>
            <CardDescription>{t("admin:accountant.dashboard.compliance.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {COMPLIANCE_ITEMS.map((item, i) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {i + 1}
                </span>
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
