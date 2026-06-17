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
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/cn";
import { formatMoney } from "../../lib/money";
import { financeService, type FinanceInvoiceSummaryDto, type FinancePayoutSummaryDto } from "../../services/financeService";
import { paymentService, type PaymentDto, type PaymentSummaryDto } from "../../services/paymentService";

const toMajor = (amount: number) => amount / 100;

export function AccountantDashboardPage() {
  const { t } = useTranslation(["admin"]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryDto | null>(null);
  const [payoutSummary, setPayoutSummary] = useState<FinancePayoutSummaryDto | null>(null);
  const [invoiceSummary, setInvoiceSummary] = useState<FinanceInvoiceSummaryDto | null>(null);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const [paymentsSummaryData, payoutsSummaryData, invoicesSummaryData, paymentPage] = await Promise.all([
          paymentService.getPaymentSummary(),
          financeService.getPayoutSummary(),
          financeService.getInvoiceSummary(),
          paymentService.getAllPayments(1, 1000),
        ]);
        if (cancelled) return;
        setPaymentSummary(paymentsSummaryData);
        setPayoutSummary(payoutsSummaryData);
        setInvoiceSummary(invoicesSummaryData);
        setPayments(paymentPage.items || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("admin:errors.loadFailed", { defaultValue: "Failed to load finance dashboard" }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const currency = paymentSummary?.currency || payoutSummary?.currency || invoiceSummary?.currency || "ILS";
  const money = (minorAmount: number) => formatMoney(toMajor(minorAmount), currency);
  const reconciliationRate = paymentSummary && paymentSummary.totalPayments > 0
    ? (paymentSummary.completedPayments / paymentSummary.totalPayments) * 100
    : 0;

  const pipeline = useMemo(() => {
    const rows = [
      { key: "authorized", statuses: ["Pending"], stage: t("admin:accountant.dashboard.pipeline.authorized") },
      { key: "settled", statuses: ["Completed"], stage: t("admin:accountant.dashboard.pipeline.settled") },
      { key: "awaitingReview", statuses: ["Failed", "Refunded", "PartiallyRefunded"], stage: t("admin:accountant.dashboard.pipeline.awaitingReview") },
    ];
    return rows.map((row) => {
      const matched = payments.filter((p) => row.statuses.includes(p.status));
      return {
        stage: row.stage,
        amount: money(matched.reduce((sum, p) => sum + p.amount, 0)),
        count: matched.length,
      };
    });
  }, [payments, t, currency]);

  const kpis = [
    {
      label: t("admin:accountant.dashboard.kpi.netRevenue"),
      value: paymentSummary ? money(paymentSummary.revenueThisMonth) : "0.00",
      delta: paymentSummary
        ? t("admin:accountant.dashboard.kpi.netRevenueDeltaLive", {
            defaultValue: "{{amount}} last month",
            amount: money(paymentSummary.revenueLastMonth),
          })
        : t("admin:accountant.dashboard.kpi.netRevenueDelta"),
      up: paymentSummary ? paymentSummary.revenueThisMonth >= paymentSummary.revenueLastMonth : null,
      icon: TrendingUp,
    },
    {
      label: t("admin:accountant.dashboard.kpi.pendingPayouts"),
      value: payoutSummary ? money(payoutSummary.pendingTotal + payoutSummary.processingTotal) : "0.00",
      delta: payoutSummary
        ? t("admin:accountant.dashboard.kpi.pendingPayoutsDeltaLive", {
            defaultValue: "{{count}} batches",
            count: payoutSummary.pendingCount + payoutSummary.processingCount,
          })
        : t("admin:accountant.dashboard.kpi.pendingPayoutsDelta"),
      up: null as boolean | null,
      icon: Banknote,
    },
    {
      label: t("admin:accountant.dashboard.kpi.invoicesDue"),
      value: invoiceSummary ? money(invoiceSummary.outstanding) : "0.00",
      delta: invoiceSummary
        ? t("admin:accountant.dashboard.kpi.invoicesDueDeltaLive", {
            defaultValue: "{{count}} open",
            count: invoiceSummary.openCount,
          })
        : t("admin:accountant.dashboard.kpi.invoicesDueDelta"),
      up: null as boolean | null,
      icon: Receipt,
    },
    {
      label: t("admin:accountant.dashboard.kpi.reconciliation"),
      value: `${reconciliationRate.toFixed(1)}%`,
      delta: paymentSummary
        ? t("admin:accountant.dashboard.kpi.reconciliationDeltaLive", {
            defaultValue: "{{completed}} completed / {{total}} total",
            completed: paymentSummary.completedPayments,
            total: paymentSummary.totalPayments,
          })
        : t("admin:accountant.dashboard.kpi.reconciliationDelta"),
      up: reconciliationRate >= 95,
      icon: FileCheck,
    },
  ];

  const complianceItems = [
    t("admin:accountant.dashboard.compliance.items.paymentLedger", {
      defaultValue: "Payment ledger loaded: {{count}} records",
      count: paymentSummary?.totalPayments ?? 0,
    }),
    t("admin:accountant.dashboard.compliance.items.payoutLiability", {
      defaultValue: "Payout liability: {{amount}} across {{count}} instructors",
      amount: payoutSummary ? money(payoutSummary.pendingTotal + payoutSummary.processingTotal + payoutSummary.onHoldTotal) : money(0),
      count: payoutSummary?.uniqueInstructors ?? 0,
    }),
    t("admin:accountant.dashboard.compliance.items.invoiceStatus", {
      defaultValue: "Invoices: {{paid}} paid / {{open}} open",
      paid: invoiceSummary?.paidCount ?? 0,
      open: invoiceSummary?.openCount ?? 0,
    }),
    t("admin:accountant.dashboard.compliance.items.reconciliationRate", {
      defaultValue: "Reconciliation rate: {{rate}}%",
      rate: reconciliationRate.toFixed(1),
    }),
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
        {kpis.map((k, i) => (
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
                  {loading ? t("admin:accountant.dashboard.loading") : k.delta}
                </p>
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
              <PieChart className="h-5 w-5 text-primary" />
              {t("admin:accountant.dashboard.pipeline.title")}
            </CardTitle>
            <CardDescription>{t("admin:accountant.dashboard.pipeline.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pipeline.map((row) => (
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
            {complianceItems.map((item, i) => (
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
