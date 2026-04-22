import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  PiggyBank,
  Calendar,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertCircle,
  Users,
  BookOpen,
  Download,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "../../../lib/cn";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { KPIStatCard } from "../../../components/admin/finance";
import { toast } from "sonner";

// =====================
// MOCK DATA
// =====================

const REVENUE_TREND_DATA = [
  { month: "Jul", revenue: 45000, expenses: 12000, refunds: 2100 },
  { month: "Aug", revenue: 52000, expenses: 14000, refunds: 1800 },
  { month: "Sep", revenue: 48000, expenses: 11000, refunds: 2400 },
  { month: "Oct", revenue: 61000, expenses: 15000, refunds: 1500 },
  { month: "Nov", revenue: 55000, expenses: 13000, refunds: 2200 },
  { month: "Dec", revenue: 72000, expenses: 18000, refunds: 1900 },
  { month: "Jan", revenue: 68000, expenses: 16000, refunds: 2600 },
];

const REVENUE_BY_CATEGORY = [
  { name: "Course Sales", value: 285000, color: "#3b82f6" },
  { name: "Subscriptions", value: 95000, color: "#10b981" },
  { name: "Certificates", value: 32000, color: "#f59e0b" },
  { name: "Other", value: 12000, color: "#8b5cf6" },
];

const TOP_COURSES = [
  { id: "CRS001", title: "Advanced React Patterns", revenue: 48250, enrollments: 245, growth: 12.5, instructor: "Dr. Sarah Johnson" },
  { id: "CRS002", title: "Machine Learning Fundamentals", revenue: 38161, enrollments: 189, growth: 8.2, instructor: "Dr. Emily Watson" },
  { id: "CRS003", title: "DevOps & Cloud Computing", revenue: 28444, enrollments: 156, growth: -3.1, instructor: "Prof. Michael Chen" },
  { id: "CRS004", title: "Python for Data Science", revenue: 25720, enrollments: 144, growth: 15.8, instructor: "Dr. Lisa Park" },
  { id: "CRS005", title: "UI/UX Design Principles", revenue: 18450, enrollments: 134, growth: 6.4, instructor: "Jennifer White" },
];

const RECENT_TRANSACTIONS = [
  { id: "TXN-2026-001234", user: "James Taylor", amount: 99.99, type: "purchase", status: "completed", time: "5 min ago", course: "Advanced React Patterns" },
  { id: "TXN-2026-001233", user: "Michelle Garcia", amount: 149.99, type: "purchase", status: "completed", time: "12 min ago", course: "Machine Learning Fundamentals" },
  { id: "TXN-2026-001232", user: "Robert Martinez", amount: 99.99, type: "refund", status: "completed", time: "1 hour ago", course: "DevOps & Cloud Computing" },
  { id: "TXN-2026-001231", user: "Sarah Chen", amount: 79.99, type: "purchase", status: "pending", time: "2 hours ago", course: "UI/UX Design Principles" },
  { id: "TXN-2026-001230", user: "Michael Brown", amount: 129.99, type: "purchase", status: "completed", time: "3 hours ago", course: "Python for Data Science" },
];

const PENDING_PAYOUTS = [
  { id: "PAY-2026-001", instructor: "Dr. Sarah Johnson", avatar: "SJ", amount: 4250, courses: 2, status: "pending", scheduledDate: "Jan 20, 2026" },
  { id: "PAY-2026-002", instructor: "Prof. Michael Chen", avatar: "MC", amount: 3180, courses: 2, status: "pending", scheduledDate: "Jan 20, 2026" },
  { id: "PAY-2026-003", instructor: "Dr. Emily Watson", avatar: "EW", amount: 2890, courses: 1, status: "processing", scheduledDate: "Jan 18, 2026" },
];

const TIME_RANGE_IDS = ["7d", "30d", "90d", "12m"] as const;
type TimeRangeId = typeof TIME_RANGE_IDS[number];

// =====================
// COMPONENT
// =====================

export function FinanceOverviewPage() {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRangeId>("30d");

  const timeRangeLabels: Record<TimeRangeId, string> = {
    "7d": t('admin:finance.overview.timeRanges.last7Days'),
    "30d": t('admin:finance.overview.timeRanges.last30Days'),
    "90d": t('admin:finance.overview.timeRanges.last90Days'),
    "12m": t('admin:finance.overview.timeRanges.last12Months'),
  };

  const revenueCategoryLabels: Record<string, string> = {
    "Course Sales": t('admin:finance.overview.categories.courseSales'),
    "Subscriptions": t('admin:finance.overview.categories.subscriptions'),
    "Certificates": t('admin:finance.overview.categories.certificates'),
    "Other": t('admin:finance.overview.categories.other'),
  };

  // Format currency
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  // Calculate KPI values
  const kpis = useMemo(() => {
    const totalRevenue = REVENUE_TREND_DATA.reduce((sum, d) => sum + d.revenue, 0);
    const totalExpenses = REVENUE_TREND_DATA.reduce((sum, d) => sum + d.expenses, 0);
    const totalRefunds = REVENUE_TREND_DATA.reduce((sum, d) => sum + d.refunds, 0);
    const netProfit = totalRevenue - totalExpenses - totalRefunds;
    const pendingPayoutsTotal = PENDING_PAYOUTS.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalRevenue,
      totalExpenses,
      totalRefunds,
      netProfit,
      pendingPayoutsTotal,
      pendingPayoutsCount: PENDING_PAYOUTS.length,
    };
  }, []);

  const timeRangeLabel = timeRangeLabels[timeRange] || timeRangeLabels["30d"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin:finance.overview.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('admin:finance.overview.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {timeRangeLabel}
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
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info(t('admin:finance.overview.exportingReport'))}>
            <Download className="h-4 w-4" />
            {t('admin:finance.overview.export')}
          </Button>
        </div>
      </div>

      {/* KPI Cards - All Clickable with Drill-Down */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStatCard
          title={t('admin:finance.overview.kpi.totalRevenue')}
          value={formatCurrency(kpis.totalRevenue)}
          change={{ value: 12.5, label: t('admin:finance.overview.kpi.vsLastPeriod') }}
          trend="up"
          icon={DollarSign}
          iconColor="bg-emerald-500/10 text-emerald-500"
          href="/admin/finance/transactions?type=purchase"
          subtitle={t('admin:finance.overview.kpi.viewAllPurchases')}
        />
        <KPIStatCard
          title={t('admin:finance.overview.kpi.totalRefunds')}
          value={formatCurrency(kpis.totalRefunds)}
          change={{ value: 5.2, label: t('admin:finance.overview.kpi.vsLastPeriod') }}
          trend="down"
          icon={Receipt}
          iconColor="bg-red-500/10 text-red-500"
          href="/admin/finance/transactions?type=refund"
          subtitle={t('admin:finance.overview.kpi.viewRefundHistory')}
        />
        <KPIStatCard
          title={t('admin:finance.overview.kpi.netProfit')}
          value={formatCurrency(kpis.netProfit)}
          change={{ value: 8.3, label: t('admin:finance.overview.kpi.vsLastPeriod') }}
          trend="up"
          icon={PiggyBank}
          iconColor="bg-blue-500/10 text-blue-500"
          href="/admin/finance/revenue-split"
          subtitle={t('admin:finance.overview.kpi.viewRevenueBreakdown')}
        />
        <KPIStatCard
          title={t('admin:finance.overview.kpi.pendingPayouts')}
          value={formatCurrency(kpis.pendingPayoutsTotal)}
          subtitle={t('admin:finance.overview.kpi.instructorsAwaiting', { count: kpis.pendingPayoutsCount })}
          icon={Wallet}
          iconColor="bg-amber-500/10 text-amber-500"
          href="/admin/finance/payouts"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{t('admin:finance.overview.charts.revenueTrend')}</h3>
              <p className="text-xs text-muted-foreground">{t('admin:finance.overview.charts.revenueTrendDesc')}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/finance/revenue-split")}
              className="gap-1 text-xs"
            >
              {t('admin:finance.overview.charts.viewDetails')}
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_TREND_DATA}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="refundGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [formatCurrency(Number(value ?? 0))]}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name={t('admin:finance.overview.charts.revenue')}
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name={t('admin:finance.overview.charts.expenses')}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#expenseGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="refunds"
                  name={t('admin:finance.overview.charts.refunds')}
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#refundGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Category */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="font-semibold">{t('admin:finance.overview.charts.revenueByCategory')}</h3>
            <p className="text-xs text-muted-foreground">{t('admin:finance.overview.charts.revenueByCategoryDesc')}</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={REVENUE_BY_CATEGORY}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {REVENUE_BY_CATEGORY.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {REVENUE_BY_CATEGORY.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-muted-foreground">{revenueCategoryLabels[cat.name] || cat.name}</span>
                </div>
                <span className="font-medium">{formatCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Access Panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h3 className="font-semibold">{t('admin:finance.overview.recentTransactions.title')}</h3>
              <p className="text-xs text-muted-foreground">{t('admin:finance.overview.recentTransactions.subtitle')}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/finance/transactions")}
              className="gap-1 text-xs"
            >
              {t('admin:finance.overview.recentTransactions.viewAll')}
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="divide-y divide-border">
            {RECENT_TRANSACTIONS.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/admin/finance/transactions?id=${txn.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      txn.type === "purchase"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-red-500/10 text-red-500"
                    )}
                  >
                    {txn.type === "purchase" ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{txn.user}</p>
                    <p className="text-xs text-muted-foreground">{txn.course}</p>
                  </div>
                </div>
                <div className="text-end">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      txn.type === "refund" ? "text-red-500" : "text-emerald-500"
                    )}
                  >
                    {txn.type === "refund" ? "-" : "+"}
                    {formatCurrency(txn.amount)}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      txn.status === "completed"
                        ? "text-emerald-500"
                        : "text-amber-500"
                    )}
                  >
                    {txn.status === "completed"
                      ? t('admin:finance.overview.recentTransactions.status.completed')
                      : t('admin:finance.overview.recentTransactions.status.pending')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Payouts */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h3 className="font-semibold">{t('admin:finance.overview.pendingPayouts.title')}</h3>
              <p className="text-xs text-muted-foreground">{t('admin:finance.overview.pendingPayouts.subtitle')}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/finance/payouts")}
              className="gap-1 text-xs"
            >
              {t('admin:finance.overview.pendingPayouts.manage')}
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="divide-y divide-border">
            {PENDING_PAYOUTS.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/admin/finance/payouts?id=${payout.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {payout.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{payout.instructor}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('admin:finance.overview.pendingPayouts.coursesLine', { count: payout.courses, date: payout.scheduledDate })}
                    </p>
                  </div>
                </div>
                <div className="text-end">
                  <p className="text-sm font-bold">{formatCurrency(payout.amount)}</p>
                  <p
                    className={cn(
                      "text-xs flex items-center justify-end gap-1",
                      payout.status === "pending"
                        ? "text-amber-500"
                        : "text-blue-500"
                    )}
                  >
                    {payout.status === "pending" ? (
                      <Clock className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {payout.status === "pending"
                      ? t('admin:finance.overview.pendingPayouts.status.pending')
                      : t('admin:finance.overview.pendingPayouts.status.processing')}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('admin:finance.overview.pendingPayouts.totalPending')}</span>
              <span className="text-lg font-bold">
                {formatCurrency(kpis.pendingPayoutsTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Courses */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h3 className="font-semibold">{t('admin:finance.overview.topCourses.title')}</h3>
            <p className="text-xs text-muted-foreground">{t('admin:finance.overview.topCourses.subtitle')}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/courses")}
            className="gap-1 text-xs"
          >
            {t('admin:finance.overview.topCourses.viewAllCourses')}
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">{t('admin:finance.overview.topCourses.columns.number')}</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('admin:finance.overview.topCourses.columns.course')}
                </th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">
                  {t('admin:finance.overview.topCourses.columns.instructor')}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {t('admin:finance.overview.topCourses.columns.revenue')}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {t('admin:finance.overview.topCourses.columns.enrollments')}
                </th>
                <th className="px-4 py-3 text-end font-medium text-muted-foreground">
                  {t('admin:finance.overview.topCourses.columns.growth')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TOP_COURSES.map((course, idx) => (
                <tr
                  key={course.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/courses?id=${course.id}`)}
                >
                  <td className="px-4 py-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{course.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{course.instructor}</td>
                  <td className="px-4 py-3 text-end font-semibold">
                    {formatCurrency(course.revenue)}
                  </td>
                  <td className="px-4 py-3 text-end text-muted-foreground">
                    {course.enrollments}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium",
                        course.growth >= 0 ? "text-emerald-500" : "text-red-500"
                      )}
                    >
                      {course.growth >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {course.growth >= 0 ? "+" : ""}
                      {course.growth}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
