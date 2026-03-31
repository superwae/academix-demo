import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  ArrowRight,
  Info,
  PieChart as PieChartIcon,
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
  Sankey,
  Layer,
  Rectangle,
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

const MONTHLY_BREAKDOWN = [
  { month: "Jul", revenue: 45000, platformFee: 9000, instructorShare: 36000, refunds: 2100 },
  { month: "Aug", revenue: 52000, platformFee: 10400, instructorShare: 41600, refunds: 1800 },
  { month: "Sep", revenue: 48000, platformFee: 9600, instructorShare: 38400, refunds: 2400 },
  { month: "Oct", revenue: 61000, platformFee: 12200, instructorShare: 48800, refunds: 1500 },
  { month: "Nov", revenue: 55000, platformFee: 11000, instructorShare: 44000, refunds: 2200 },
  { month: "Dec", revenue: 72000, platformFee: 14400, instructorShare: 57600, refunds: 1900 },
  { month: "Jan", revenue: 68000, platformFee: 13600, instructorShare: 54400, refunds: 2600 },
];

const EXPENSE_CATEGORIES = [
  { name: "Payment Processing", value: 12030, color: "#f59e0b", percentage: 15 },
  { name: "Hosting & Infrastructure", value: 18500, color: "#8b5cf6", percentage: 23 },
  { name: "Marketing", value: 25000, color: "#ec4899", percentage: 31 },
  { name: "Support & Operations", value: 15670, color: "#06b6d4", percentage: 20 },
  { name: "Other", value: 9000, color: "#6b7280", percentage: 11 },
];

const INSTRUCTOR_EARNINGS = [
  { id: "INS001", name: "Dr. Sarah Johnson", avatar: "SJ", courses: 2, revenue: 42000, share: 33600, percentage: 10.5, growth: 12.5 },
  { id: "INS002", name: "Dr. Emily Watson", avatar: "EW", courses: 1, revenue: 38500, share: 30800, percentage: 9.6, growth: 8.2 },
  { id: "INS003", name: "Prof. Michael Chen", avatar: "MC", courses: 2, revenue: 35200, share: 28160, percentage: 8.8, growth: -3.1 },
  { id: "INS004", name: "Dr. Lisa Park", avatar: "LP", courses: 1, revenue: 28900, share: 23120, percentage: 7.2, growth: 15.8 },
  { id: "INS005", name: "Jennifer White", avatar: "JW", courses: 1, revenue: 22400, share: 17920, percentage: 5.6, growth: 6.4 },
  { id: "INS006", name: "Dr. Alan Turing", avatar: "AT", courses: 1, revenue: 18500, share: 14800, percentage: 4.6, growth: 22.1 },
  { id: "INS007", name: "Maria Rodriguez", avatar: "MR", courses: 2, revenue: 16200, share: 12960, percentage: 4.0, growth: -1.2 },
];

const COURSE_REVENUE = [
  { id: "CRS001", name: "Advanced React Patterns", revenue: 48500, enrollments: 245, instructor: "Dr. Sarah Johnson" },
  { id: "CRS002", name: "Machine Learning Fundamentals", revenue: 38500, enrollments: 189, instructor: "Dr. Emily Watson" },
  { id: "CRS003", name: "DevOps & Cloud Computing", revenue: 28200, enrollments: 156, instructor: "Prof. Michael Chen" },
  { id: "CRS004", name: "Python for Data Science", revenue: 25600, enrollments: 144, instructor: "Dr. Lisa Park" },
  { id: "CRS005", name: "UI/UX Design Principles", revenue: 18900, enrollments: 134, instructor: "Jennifer White" },
];

const TIME_RANGES = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "12m", label: "Last 12 months" },
];

// =====================
// COMPONENT
// =====================

export function FinanceRevenueSplitPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("30d");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  // Calculate totals
  const totals = useMemo(() => {
    const totalRevenue = MONTHLY_BREAKDOWN.reduce((sum, m) => sum + m.revenue, 0);
    const totalPlatformFee = MONTHLY_BREAKDOWN.reduce((sum, m) => sum + m.platformFee, 0);
    const totalInstructorShare = MONTHLY_BREAKDOWN.reduce((sum, m) => sum + m.instructorShare, 0);
    const totalRefunds = MONTHLY_BREAKDOWN.reduce((sum, m) => sum + m.refunds, 0);
    const totalExpenses = EXPENSE_CATEGORIES.reduce((sum, e) => sum + e.value, 0);
    const netPlatformProfit = totalPlatformFee - totalExpenses;

    return {
      totalRevenue,
      totalPlatformFee,
      totalInstructorShare,
      totalRefunds,
      totalExpenses,
      netPlatformProfit,
    };
  }, []);

  const timeRangeLabel = TIME_RANGES.find((t) => t.id === timeRange)?.label || "Last 30 days";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Split</h1>
          <p className="text-sm text-muted-foreground">
            Detailed breakdown of revenue distribution
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
              {TIME_RANGES.map((range) => (
                <DropdownMenuItem
                  key={range.id}
                  onClick={() => setTimeRange(range.id)}
                  className={cn(timeRange === range.id && "bg-primary/10")}
                >
                  {range.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info("Exporting report...")}>
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStatCard
          title="Gross Revenue"
          value={formatCurrency(totals.totalRevenue)}
          change={{ value: 12.5, label: "vs last period" }}
          trend="up"
          icon={DollarSign}
          iconColor="bg-emerald-500/10 text-emerald-500"
          href="/admin/finance/transactions?type=purchase"
        />
        <KPIStatCard
          title="Instructor Payouts"
          value={formatCurrency(totals.totalInstructorShare)}
          subtitle="80% of gross revenue"
          icon={Users}
          iconColor="bg-blue-500/10 text-blue-500"
          href="/admin/finance/payouts"
        />
        <KPIStatCard
          title="Platform Revenue"
          value={formatCurrency(totals.totalPlatformFee)}
          subtitle="20% of gross revenue"
          icon={PieChartIcon}
          iconColor="bg-purple-500/10 text-purple-500"
        />
        <KPIStatCard
          title="Net Platform Profit"
          value={formatCurrency(totals.netPlatformProfit)}
          change={{ value: 8.3, label: "vs last period" }}
          trend={totals.netPlatformProfit >= 0 ? "up" : "down"}
          subtitle="After all expenses"
          icon={TrendingUp}
          iconColor="bg-amber-500/10 text-amber-500"
        />
      </div>

      {/* Revenue Flow Diagram */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold mb-4">Revenue Flow</h3>
        <div className="flex flex-col lg:flex-row items-stretch justify-between gap-4">
          {/* Gross Revenue */}
          <div className="flex-1 text-center p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs text-muted-foreground mb-1">Gross Revenue</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totals.totalRevenue)}</p>
            <p className="text-xs text-emerald-600 mt-1">100%</p>
          </div>

          <div className="hidden lg:flex items-center justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex lg:hidden items-center justify-center py-2">
            <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
          </div>

          {/* Split */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Instructor Share (80%)</span>
                <span className="font-bold text-blue-600">{formatCurrency(totals.totalInstructorShare)}</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-blue-500/20">
                <div className="h-full rounded-full bg-blue-500" style={{ width: "80%" }} />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Platform Fee (20%)</span>
                <span className="font-bold text-purple-600">{formatCurrency(totals.totalPlatformFee)}</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-purple-500/20">
                <div className="h-full rounded-full bg-purple-500" style={{ width: "20%" }} />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium">Refunds</span>
                <span className="font-bold text-red-600">-{formatCurrency(totals.totalRefunds)}</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex lg:hidden items-center justify-center py-2">
            <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
          </div>

          {/* Platform Expenses */}
          <div className="flex-1 text-center p-5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-muted-foreground mb-1">Platform Expenses</p>
            <p className="text-2xl font-bold text-amber-600">-{formatCurrency(totals.totalExpenses)}</p>
            <p className="text-xs text-amber-600 mt-1">Operating costs</p>
          </div>

          <div className="hidden lg:flex items-center justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex lg:hidden items-center justify-center py-2">
            <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90" />
          </div>

          {/* Net Profit */}
          <div className="flex-1 text-center p-5 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Net Platform Profit</p>
            <p className={cn(
              "text-2xl font-bold",
              totals.netPlatformProfit >= 0 ? "text-primary" : "text-red-500"
            )}>
              {formatCurrency(totals.netPlatformProfit)}
            </p>
            <p className="text-xs text-primary mt-1">Final margin</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Breakdown Chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="font-semibold">Monthly Revenue Breakdown</h3>
            <p className="text-xs text-muted-foreground">Platform fee vs instructor share over time</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_BREAKDOWN}>
                <defs>
                  <linearGradient id="instructorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="platformGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
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
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
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
                  dataKey="instructorShare"
                  name="Instructor Share"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#instructorGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="platformFee"
                  name="Platform Fee"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fill="url(#platformGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="font-semibold">Platform Expense Breakdown</h3>
            <p className="text-xs text-muted-foreground">Where platform fees go</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={EXPENSE_CATEGORIES}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {EXPENSE_CATEGORIES.map((entry, index) => (
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
          <div className="space-y-2">
            {EXPENSE_CATEGORIES.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-muted-foreground">{cat.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{cat.percentage}%</span>
                  <span className="font-medium">{formatCurrency(cat.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructor Earnings Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h3 className="font-semibold">Instructor Earnings</h3>
            <p className="text-xs text-muted-foreground">Top performers by revenue</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/finance/payouts")}
            className="gap-1 text-xs"
          >
            View All
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Instructor</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Courses</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Gross Revenue</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Earnings (80%)</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">% of Total</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {INSTRUCTOR_EARNINGS.map((instructor, idx) => (
                <tr
                  key={instructor.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/users?id=${instructor.id}`)}
                >
                  <td className="px-4 py-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {instructor.avatar}
                      </div>
                      <span className="font-medium">{instructor.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{instructor.courses}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(instructor.revenue)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-500">
                    {formatCurrency(instructor.share)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(instructor.percentage * 8, 100)}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-12 text-right">
                        {instructor.percentage}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium",
                        instructor.growth >= 0 ? "text-emerald-500" : "text-red-500"
                      )}
                    >
                      {instructor.growth >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {instructor.growth >= 0 ? "+" : ""}
                      {instructor.growth}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course Revenue Chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4">
          <h3 className="font-semibold">Revenue by Course</h3>
          <p className="text-xs text-muted-foreground">Top courses by revenue generation</p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={COURSE_REVENUE} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v / 1000}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={160}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => formatCurrency(Number(value ?? 0))}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Split Policy Info */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-600 dark:text-blue-400">Revenue Split Policy</p>
            <p className="text-sm text-muted-foreground mt-1">
              The platform operates on an <strong>80/20 revenue split</strong>. Instructors receive
              80% of course sales revenue, while the platform retains 20% to cover payment
              processing, hosting, marketing, and operational costs. Payouts are processed
              bi-weekly for all earnings above $50.
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <span>Instructor: 80%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-purple-500" />
                <span>Platform: 20%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <span>Minimum Payout: $50</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span>Payout Cycle: Bi-weekly</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
