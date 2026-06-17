import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  PiggyBank,
  Receipt,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { KPIStatCard } from "../../../components/admin/finance";
import { cn } from "../../../lib/cn";
import { formatMoney } from "../../../lib/money";
import { financeService, type FinanceOverviewDto } from "../../../services/financeService";
import { paymentService, type PaymentDto, type PaymentSummaryDto } from "../../../services/paymentService";

const TIME_RANGE_IDS = ["7d", "30d", "90d", "12m"] as const;
type TimeRangeId = (typeof TIME_RANGE_IDS)[number];

const toMajor = (amount: number) => amount / 100;

export function FinanceOverviewPage() {
  const { t } = useTranslation(["admin", "common", "errors"]);
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRangeId>("30d");
  const [summary, setSummary] = useState<PaymentSummaryDto | null>(null);
  const [overview, setOverview] = useState<FinanceOverviewDto | null>(null);
  const [recentPayments, setRecentPayments] = useState<PaymentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadFinance = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [summaryResult, overviewResult, paymentResult] = await Promise.all([
        paymentService.getPaymentSummary(),
        financeService.getOverview(),
        paymentService.getAllPayments(1, 5),
      ]);
      setSummary(summaryResult);
      setOverview(overviewResult);
      setRecentPayments(paymentResult.items ?? []);
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFinance();
  }, []);

  const timeRangeLabels: Record<TimeRangeId, string> = {
    "7d": t("admin:finance.overview.timeRanges.last7Days"),
    "30d": t("admin:finance.overview.timeRanges.last30Days"),
    "90d": t("admin:finance.overview.timeRanges.last90Days"),
    "12m": t("admin:finance.overview.timeRanges.last12Months"),
  };

  const currency = overview?.currency || summary?.currency || "ILS";
  const formatCurrency = (minorAmount: number) => formatMoney(toMajor(minorAmount), currency);

  const kpis = useMemo(() => {
    const revenueThisMonth = summary?.revenueThisMonth ?? 0;
    const revenueLastMonth = summary?.revenueLastMonth ?? 0;
    const monthChange =
      revenueLastMonth > 0
        ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 1000) / 10
        : 0;
    const pendingPayoutsTotal = overview?.pendingPayouts.reduce((sum, payout) => sum + payout.netAmount, 0) ?? 0;

    return {
      totalRevenue: summary?.totalRevenue ?? 0,
      revenueThisMonth,
      monthChange,
      completedPayments: summary?.completedPayments ?? 0,
      pendingPayments: summary?.pendingPayments ?? 0,
      failedPayments: summary?.failedPayments ?? 0,
      totalPayments: summary?.totalPayments ?? 0,
      pendingPayoutsTotal,
      pendingPayoutsCount: overview?.pendingPayouts.length ?? 0,
    };
  }, [overview, summary]);

  const trendData =
    overview?.revenueTrend.map((point) => ({
      month: point.period,
      revenue: toMajor(point.revenue),
      payoutLiability: toMajor(point.payoutLiability),
      refunds: toMajor(point.refunds),
    })) ?? [];

  const categoryData =
    overview?.revenueByCategory.map((category) => ({
      ...category,
      value: toMajor(category.value),
    })) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-20">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{t("common:loading")}</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-2 text-sm text-destructive">{loadError}</p>
        <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => void loadFinance()}>
          <RefreshCw className="h-4 w-4" />
          {t("common:retry", { defaultValue: "Retry" })}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("admin:finance.overview.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin:finance.overview.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {timeRangeLabels[timeRange]}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {TIME_RANGE_IDS.map((rangeId) => (
                <DropdownMenuItem
                  key={rangeId}
                  onClick={() => setTimeRange(rangeId)}
                  className={cn(timeRange === rangeId && "bg-primary/10")}
                >
                  {timeRangeLabels[rangeId]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info(t("admin:finance.overview.exportingReport"))}>
            <Download className="h-4 w-4" />
            {t("admin:finance.overview.export")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStatCard
          title={t("admin:finance.overview.kpi.totalRevenue")}
          value={formatCurrency(kpis.totalRevenue)}
          icon={PiggyBank}
          iconColor="bg-emerald-500/10 text-emerald-500"
          href="/admin/finance/transactions?type=purchase"
          subtitle={t("admin:finance.overview.kpi.viewAllPurchases")}
        />
        <KPIStatCard
          title={t("admin:finance.overview.kpi.revenueThisMonth", { defaultValue: "Revenue This Month" })}
          value={formatCurrency(kpis.revenueThisMonth)}
          change={{ value: kpis.monthChange, label: t("admin:finance.overview.kpi.vsLastPeriod") }}
          trend={kpis.monthChange >= 0 ? "up" : "down"}
          icon={TrendingUp}
          iconColor="bg-blue-500/10 text-blue-500"
          href="/admin/finance/transactions"
          subtitle={t("admin:finance.overview.kpi.viewAllPurchases")}
        />
        <KPIStatCard
          title={t("admin:finance.overview.kpi.completedPayments", { defaultValue: "Completed Payments" })}
          value={String(kpis.completedPayments)}
          icon={Receipt}
          iconColor="bg-emerald-500/10 text-emerald-500"
          href="/admin/finance/transactions"
          subtitle={t("admin:finance.overview.kpi.ofTotalPayments", { defaultValue: "of {{count}} total", count: kpis.totalPayments })}
        />
        <KPIStatCard
          title={t("admin:finance.overview.kpi.pendingFailed", { defaultValue: "Pending / Failed" })}
          value={`${kpis.pendingPayments} / ${kpis.failedPayments}`}
          icon={Wallet}
          iconColor="bg-amber-500/10 text-amber-500"
          href="/admin/finance/transactions"
          subtitle={t("admin:finance.overview.kpi.needsAttention", { defaultValue: "May need attention" })}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{t("admin:finance.overview.charts.revenueTrend")}</h3>
              <p className="text-xs text-muted-foreground">
                {t("admin:finance.overview.charts.revenueTrendDesc", { defaultValue: "Revenue, payout liability, and refunds from live payment records." })}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/finance/transactions")} className="gap-1 text-xs">
              {t("admin:finance.overview.charts.viewDetails")}
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="h-72">
            {trendData.length === 0 ? (
              <EmptyPanel message={t("admin:finance.noTransactions", { defaultValue: "No transactions yet." })} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="payoutGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="refundGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#dc2626" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatMoney(Number(value), currency)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value, name) => [formatMoney(Number(value), currency), String(name)]}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                  <Area type="monotone" dataKey="revenue" name={t("admin:finance.overview.charts.revenue")} stroke="#16a34a" strokeWidth={2} fill="url(#revenueGradient)" />
                  <Area type="monotone" dataKey="payoutLiability" name={t("admin:finance.overview.charts.expenses", { defaultValue: "Payout liability" })} stroke="#2563eb" strokeWidth={2} fill="url(#payoutGradient)" />
                  <Area type="monotone" dataKey="refunds" name={t("admin:finance.overview.charts.refunds")} stroke="#dc2626" strokeWidth={2} fill="url(#refundGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="font-semibold">{t("admin:finance.overview.charts.revenueByCategory")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("admin:finance.overview.charts.revenueByCategoryDesc", { defaultValue: "Completed payment totals by payment type." })}
            </p>
          </div>
          <div className="h-52">
            {categoryData.length === 0 ? (
              <EmptyPanel message={t("admin:finance.noTransactions", { defaultValue: "No transactions yet." })} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => formatMoney(Number(value), currency)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 space-y-2">
            {categoryData.map((category) => (
              <div key={category.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                  <span className="text-muted-foreground">{category.label}</span>
                </div>
                <span className="font-medium">{formatMoney(category.value, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <PanelHeader
            title={t("admin:finance.overview.recentTransactions.title")}
            subtitle={t("admin:finance.overview.recentTransactions.subtitle")}
            action={t("admin:finance.overview.recentTransactions.viewAll")}
            onAction={() => navigate("/admin/finance/transactions")}
          />
          <div className="divide-y divide-border">
            {recentPayments.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{t("admin:finance.noTransactions", { defaultValue: "No transactions yet." })}</p>
            ) : (
              recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-muted/30"
                  onClick={() => navigate(`/admin/finance/transactions?id=${payment.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", payment.status === "Refunded" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500")}>
                      {payment.status === "Refunded" ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{payment.userName || "-"}</p>
                      <p className="text-xs text-muted-foreground">{payment.courseTitle || payment.type}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className={cn("text-sm font-semibold", payment.status === "Refunded" ? "text-red-500" : "text-emerald-500")}>
                      {payment.status === "Refunded" ? "-" : "+"}
                      {formatMoney(toMajor(payment.amount), payment.currency || currency)}
                    </p>
                    <p className={cn("text-xs", payment.status === "Completed" ? "text-emerald-500" : "text-amber-500")}>
                      {payment.status}
                      {" / "}
                      {formatDistanceToNow(new Date(payment.paidAt || payment.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <PanelHeader
            title={t("admin:finance.overview.pendingPayouts.title")}
            subtitle={t("admin:finance.overview.pendingPayouts.subtitle", { defaultValue: "Instructor payout liability from completed course sales." })}
            action={t("admin:finance.overview.pendingPayouts.manage")}
            onAction={() => navigate("/admin/finance/payouts")}
          />
          <div className="divide-y divide-border">
            {(overview?.pendingPayouts ?? []).length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{t("admin:finance.payouts.empty.message")}</p>
            ) : (
              overview!.pendingPayouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-muted/30"
                  onClick={() => navigate(`/admin/finance/payouts?id=${payout.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {payout.avatar || "IN"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{payout.instructorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("admin:finance.payouts.instructorMeta.coursePlural", { defaultValue: "{{count}} courses", count: payout.courseCount })}
                        {" / "}
                        {payout.paymentCount} {t("admin:finance.transactions.title", { defaultValue: "transactions" }).toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold">{formatCurrency(payout.netAmount)}</p>
                    <p className="flex items-center justify-end gap-1 text-xs text-amber-500">
                      <Clock className="h-3 w-3" />
                      {t("admin:finance.payouts.status.pending")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("admin:finance.overview.pendingPayouts.totalPending")}</span>
              <span className="text-lg font-bold">{formatCurrency(kpis.pendingPayoutsTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <PanelHeader
          title={t("admin:finance.overview.topCourses.title")}
          subtitle={t("admin:finance.overview.topCourses.subtitle")}
          action={t("admin:finance.overview.topCourses.viewAllCourses")}
          onAction={() => navigate("/admin/courses")}
        />
        {(overview?.topCourses ?? []).length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{t("admin:finance.noTransactions", { defaultValue: "No transactions yet." })}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("admin:finance.overview.topCourses.columns.number")}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("admin:finance.overview.topCourses.columns.course")}</th>
                  <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t("admin:finance.overview.topCourses.columns.instructor")}</th>
                  <th className="px-4 py-3 text-end font-medium text-muted-foreground">{t("admin:finance.overview.topCourses.columns.revenue")}</th>
                  <th className="px-4 py-3 text-end font-medium text-muted-foreground">{t("admin:finance.overview.topCourses.columns.enrollments")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overview!.topCourses.map((course, index) => (
                  <tr key={course.courseId} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => navigate(`/admin/courses?id=${course.courseId}`)}>
                    <td className="px-4 py-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{course.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{course.instructorName}</td>
                    <td className="px-4 py-3 text-end font-semibold">{formatCurrency(course.revenue)}</td>
                    <td className="px-4 py-3 text-end text-muted-foreground">{course.enrollments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PanelHeader({ title, subtitle, action, onAction }: { title: string; subtitle: string; action: string; onAction: () => void }) {
  return (
    <div className="flex items-center justify-between border-b p-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onAction} className="gap-1 text-xs">
        {action}
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      {message}
    </div>
  );
}
