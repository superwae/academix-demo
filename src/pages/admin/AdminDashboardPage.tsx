import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  BookOpen,
  DollarSign,
  ClipboardCheck,
  Activity,
  UserPlus,
  CreditCard,
  FileCheck,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronDown,
  ExternalLink,
  Server,
  Database,
  HardDrive,
  Mail,
  Wifi,
  Loader2,
  AlertCircle,
  GraduationCap,
  Target,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
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
  AreaChart,
  Area,
} from "recharts";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { adminService } from "../../services/adminService";
import type { AnalyticsDashboardDto } from "../../services/adminService";
import { toast } from "sonner";

// System Health (mock - no backend)
const systemHealth = {
  status: "healthy",
  uptime: "99.98%",
  services: [
    { name: "API Server", status: "operational" },
    { name: "Database", status: "operational" },
    { name: "Cache", status: "operational" },
    { name: "Storage", status: "operational" },
    { name: "Email Service", status: "operational" },
    { name: "Payment Gateway", status: "operational" },
  ],
};

// Time Range Options
type TimeRange = "7d" | "30d" | "90d" | "12m";
const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
];

// Time Range Selector Component
function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}) {
  const selected = TIME_RANGES.find((r) => r.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Calendar className="h-3.5 w-3.5" />
          {selected?.label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {TIME_RANGES.map((range) => (
          <DropdownMenuItem
            key={range.value}
            onClick={() => onChange(range.value)}
            className={cn(value === range.value && "bg-primary/10 text-primary")}
          >
            {range.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Clickable Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  change,
  trend,
  iconColor = "text-primary",
  href,
  onClick,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  change?: { value: number; label: string };
  trend?: "up" | "down" | "neutral";
  iconColor?: string;
  href?: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      navigate(href);
    }
  };

  const isClickable = !!href || !!onClick;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5",
        isClickable && "cursor-pointer"
      )}
      onClick={handleClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            {isClickable && (
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            )}
          </div>
          {loading ? (
            <div className="mt-1.5 h-8 w-20 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-1.5 text-2xl font-bold tracking-tight">{value}</p>
          )}
          {change && !loading && (
            <div
              className={cn(
                "mt-1.5 flex items-center gap-1 text-xs",
                trend === "up"
                  ? "text-emerald-500"
                  : trend === "down"
                  ? "text-red-500"
                  : "text-muted-foreground"
              )}
            >
              {trend === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : trend === "down" ? (
                <TrendingDown className="h-3 w-3" />
              ) : null}
              <span className="font-medium">
                {trend === "up" ? "+" : ""}
                {change.value}%
              </span>
              <span className="text-muted-foreground">{change.label}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-transform duration-300 group-hover:scale-110 shrink-0"
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

// Section Header Component
function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userChartRange, setUserChartRange] = useState<TimeRange>("30d");
  const [revenueChartRange, setRevenueChartRange] = useState<TimeRange>("30d");

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);
        const data = await adminService.getDashboardAnalytics();
        setAnalytics(data);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : err && typeof err === "object" && "error" in err
              ? String((err as { error?: string }).error)
              : "Failed to load analytics";
        setError(msg);
        toast.error('Failed to load dashboard analytics');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "registration":
        return <UserPlus className="h-4 w-4" />;
      case "payment":
        return <CreditCard className="h-4 w-4" />;
      case "course_approval":
        return <FileCheck className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "registration":
        return "bg-blue-500/10 text-blue-500";
      case "payment":
        return "bg-emerald-500/10 text-emerald-500";
      case "course_approval":
        return "bg-amber-500/10 text-amber-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getServiceIcon = (name: string) => {
    switch (name) {
      case "API Server":
        return <Server className="h-4 w-4" />;
      case "Database":
        return <Database className="h-4 w-4" />;
      case "Cache":
      case "Storage":
        return <HardDrive className="h-4 w-4" />;
      case "Email Service":
        return <Mail className="h-4 w-4" />;
      case "Payment Gateway":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Wifi className="h-4 w-4" />;
    }
  };

  // Prepare chart data from analytics
  const enrollmentChartData = analytics?.enrollmentTrend?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    enrollments: item.value,
  })) || [];

  const activityChartData = analytics?.activityTrend?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    activity: item.value,
  })) || [];

  // User distribution from real data
  const userRolesDistribution = [
    { name: "Students", value: analytics?.totalStudents || 0, color: "#3b82f6" },
    { name: "Instructors", value: analytics?.totalInstructors || 0, color: "#10b981" },
  ];

  // Risk distribution
  const riskDistribution = [
    { name: "Critical", value: analytics?.criticalRiskCount || 0, color: "#ef4444" },
    { name: "High", value: analytics?.highRiskCount || 0, color: "#f97316" },
    { name: "Medium", value: analytics?.mediumRiskCount || 0, color: "#eab308" },
  ];

  if (error && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">Failed to load dashboard</h2>
        <p className="text-muted-foreground mt-1">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back! Here's what's happening with AcademiX.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/reports")}>
            <FileCheck className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* ==================== SECTION 1: EXECUTIVE OVERVIEW ==================== */}
      <section>
        <SectionHeader
          title="Executive Overview"
          description="Key performance metrics at a glance"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Total Students"
            value={analytics?.totalStudents?.toLocaleString() || "0"}
            icon={Users}
            change={{ value: 12.5, label: "vs last month" }}
            trend="up"
            iconColor="text-blue-500"
            href="/admin/users"
            loading={loading}
          />
          <StatCard
            title="Total Courses"
            value={analytics?.totalCourses?.toLocaleString() || "0"}
            icon={BookOpen}
            change={{ value: 8.2, label: "vs last month" }}
            trend="up"
            iconColor="text-emerald-500"
            href="/admin/courses"
            loading={loading}
          />
          <StatCard
            title="Total Enrollments"
            value={analytics?.totalEnrollments?.toLocaleString() || "0"}
            icon={GraduationCap}
            change={{ value: 15.3, label: "vs last month" }}
            trend="up"
            iconColor="text-purple-500"
            loading={loading}
          />
          <StatCard
            title="At-Risk Students"
            value={analytics?.atRiskStudentCount?.toLocaleString() || "0"}
            icon={AlertTriangle}
            change={{ value: analytics?.criticalRiskCount || 0, label: "critical" }}
            trend="neutral"
            iconColor="text-orange-500"
            href="/admin/reports"
            loading={loading}
          />
          <StatCard
            title="System Health"
            value={systemHealth.uptime}
            icon={Activity}
            change={{ value: 0, label: systemHealth.status }}
            trend="up"
            iconColor="text-emerald-500"
            href="/admin/settings"
          />
        </div>
      </section>

      {/* ==================== SECTION 2: PERFORMANCE METRICS ==================== */}
      <section>
        <SectionHeader
          title="Performance Metrics"
          description="Student engagement and course completion"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Platform Engagement</p>
                {loading ? (
                  <div className="mt-1 h-8 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="mt-1 text-2xl font-bold">{analytics?.platformEngagementScore?.toFixed(1) || 0}%</p>
                )}
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Target className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Completion Rate</p>
                {loading ? (
                  <div className="mt-1 h-8 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="mt-1 text-2xl font-bold">{analytics?.averageCourseCompletion?.toFixed(1) || 0}%</p>
                )}
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <ClipboardCheck className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Student Grade</p>
                {loading ? (
                  <div className="mt-1 h-8 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="mt-1 text-2xl font-bold">{analytics?.averageStudentGrade?.toFixed(1) || 0}%</p>
                )}
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <GraduationCap className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active This Week</p>
                {loading ? (
                  <div className="mt-1 h-8 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="mt-1 text-2xl font-bold">{analytics?.studentsActiveThisWeek?.toLocaleString() || 0}</p>
                )}
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Activity className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 3: TRENDS & ANALYTICS ==================== */}
      <section>
        <SectionHeader
          title="Trends & Analytics"
          description="Platform growth and activity insights"
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Enrollment Trend Chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Enrollment Trend</h3>
                <p className="text-xs text-muted-foreground">
                  New enrollments over the last 30 days
                </p>
              </div>
            </div>
            <div className="h-56">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : enrollmentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={enrollmentChartData}>
                    <defs>
                      <linearGradient id="enrollmentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
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
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="enrollments"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#enrollmentGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No enrollment data available
                </div>
              )}
            </div>
          </div>

          {/* Activity Trend Chart */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Activity Trend</h3>
                <p className="text-xs text-muted-foreground">
                  Daily active students over the last 30 days
                </p>
              </div>
            </div>
            <div className="h-56">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : activityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
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
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar
                      dataKey="activity"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No activity data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Distribution and Top Courses */}
        <div className="grid gap-6 lg:grid-cols-3 mt-6">
          {/* User Roles Distribution */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3">
              <h3 className="font-semibold">User Distribution</h3>
              <p className="text-xs text-muted-foreground">Students vs Instructors</p>
            </div>
            <div className="h-52">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userRolesDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {userRolesDistribution.map((entry, index) => (
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
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={32}
                      formatter={(value) => (
                        <span className="text-xs text-muted-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Courses */}
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Top Performing Courses</h3>
                <p className="text-xs text-muted-foreground">
                  Most enrolled courses on the platform
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => navigate("/admin/courses")}
              >
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg p-2.5">
                    <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-24 animate-pulse rounded bg-muted mt-1" />
                    </div>
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  </div>
                ))
              ) : analytics?.mostEnrolledCourses?.slice(0, 4).map((course, index) => (
                <div
                  key={course.courseId}
                  className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{course.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {course.instructorName}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="text-sm font-medium">
                      {course.metricValue?.toLocaleString() ?? 0}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {course.metricLabel || 'enrollments'}
                    </span>
                  </div>
                </div>
              )) || (
                <div className="py-8 text-center text-muted-foreground">
                  No course data available
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION 4: AT-RISK STUDENTS ==================== */}
      {analytics?.needsAttention && analytics.needsAttention.length > 0 && (
        <section>
          <SectionHeader
            title="Students Needing Attention"
            description="Students with declining engagement or performance"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/reports")}
              >
                View Details
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            }
          />
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Risk Level</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Engagement</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Completion</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Risk Factors</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.needsAttention.slice(0, 5).map((student) => (
                    <tr key={student.userId} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{student.studentName}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          student.riskLevel === "Critical" && "bg-red-500/10 text-red-600",
                          student.riskLevel === "High" && "bg-orange-500/10 text-orange-600",
                          student.riskLevel === "Medium" && "bg-yellow-500/10 text-yellow-600",
                          student.riskLevel === "Low" && "bg-green-500/10 text-green-600"
                        )}>
                          {student.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3">{student.engagementScore.toFixed(0)}%</td>
                      <td className="px-4 py-3">{student.completionRate.toFixed(0)}%</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {student.riskFactors.slice(0, 2).map((factor, i) => (
                            <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                              {factor}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ==================== SECTION 5: OPERATIONS & SYSTEM HEALTH ==================== */}
      <section>
        <SectionHeader
          title="Operations & System Health"
          description="Infrastructure and service status"
          action={
            <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </span>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {systemHealth.services.map((service) => (
            <div
              key={service.name}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30"
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                  service.status === "operational"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : service.status === "degraded"
                    ? "bg-amber-500/10 text-amber-500"
                    : "bg-red-500/10 text-red-500"
                )}
              >
                {getServiceIcon(service.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{service.name}</p>
                <p
                  className={cn(
                    "text-xs",
                    service.status === "operational"
                      ? "text-emerald-500"
                      : service.status === "degraded"
                      ? "text-amber-500"
                      : "text-red-500"
                  )}
                >
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </p>
              </div>
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  service.status === "operational"
                    ? "bg-emerald-500"
                    : service.status === "degraded"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-red-500 animate-pulse"
                )}
              />
            </div>
          ))}
        </div>

        {/* Quick Stats Row */}
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Server Uptime</p>
            <p className="text-xl font-bold text-emerald-500">{systemHealth.uptime}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Instructors</p>
            {loading ? (
              <div className="h-7 w-12 animate-pulse rounded bg-muted mt-1" />
            ) : (
              <p className="text-xl font-bold">{analytics?.totalInstructors || 0}</p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Active Today</p>
            {loading ? (
              <div className="h-7 w-12 animate-pulse rounded bg-muted mt-1" />
            ) : (
              <p className="text-xl font-bold">{analytics?.studentsActiveToday || 0}</p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Active Enrollments</p>
            {loading ? (
              <div className="h-7 w-12 animate-pulse rounded bg-muted mt-1" />
            ) : (
              <p className="text-xl font-bold">{analytics?.activeEnrollments?.toLocaleString() || 0}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
