import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Download,
  Calendar,
  ChevronDown,
  Users,
  DollarSign,
  BookOpen,
  TrendingUp,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  FileJson,
  Loader2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
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
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
import { adminService } from "../../services/adminService";
import type { AnalyticsDashboardDto, StudentAnalyticsDto } from "../../services/adminService";
import { toast } from "sonner";

// Report types
const REPORT_TYPES = [
  { id: "users", labelKey: "admin:reports.types.users", icon: Users, descKey: "admin:reports.types.usersDesc" },
  { id: "courses", labelKey: "admin:reports.types.courses", icon: BookOpen, descKey: "admin:reports.types.coursesDesc" },
  { id: "engagement", labelKey: "admin:reports.types.engagement", icon: TrendingUp, descKey: "admin:reports.types.engagementDesc" },
  { id: "at-risk", labelKey: "admin:reports.types.atRisk", icon: AlertTriangle, descKey: "admin:reports.types.atRiskDesc" },
];

export function AdminReportsPage() {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const [selectedReport, setSelectedReport] = useState("users");
  const [dateRange, setDateRange] = useState("30d");
  const [analytics, setAnalytics] = useState<AnalyticsDashboardDto | null>(null);
  const [atRiskStudents, setAtRiskStudents] = useState<StudentAnalyticsDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [analyticsData, riskData] = await Promise.all([
          adminService.getDashboardAnalytics(),
          adminService.getAtRiskStudents(undefined, 50),
        ]);
        setAnalytics(analyticsData);
        setAtRiskStudents(riskData);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('admin:reports.errors.reportDataFailed'));
        toast.error(t('admin:reports.errors.reportDataFailed'));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value);

  // Prepare chart data
  const enrollmentChartData = analytics?.enrollmentTrend?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    enrollments: item.value,
  })) || [];

  const activityChartData = analytics?.activityTrend?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    activity: item.value,
  })) || [];

  const completionChartData = analytics?.completionTrend?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    completions: item.value,
  })) || [];

  const coursePerformanceData = analytics?.mostEnrolledCourses?.slice(0, 5).map(course => ({
    name: course.title.length > 20 ? course.title.substring(0, 20) + '...' : course.title,
    enrollments: course.metricValue ?? 0,
  })) || [];

  const handleExport = async (format: string) => {
    if (format === 'csv') {
      try {
        if (selectedReport === 'users') {
          await adminService.exportUsersCsv();
          toast.success(t('admin:reports.toasts.usersExported'), { description: t('admin:reports.toasts.csvDownloaded') });
        } else if (selectedReport === 'at-risk') {
          await adminService.exportAtRiskStudentsCsv();
          toast.success(t('admin:reports.toasts.atRiskExported'), { description: t('admin:reports.toasts.csvDownloaded') });
        } else {
          toast.info(t('admin:reports.toasts.comingSoon'), { description: t('admin:reports.toasts.comingSoonDesc', { report: selectedReport }) });
        }
      } catch (err) {
        toast.error(t('admin:reports.toasts.exportFailed'), { description: err instanceof Error ? err.message : t('admin:reports.toasts.exportFailedDesc') });
      }
    } else {
      toast.info(t('admin:reports.toasts.exportAs', { format: format.toUpperCase() }), { description: t('admin:reports.toasts.exportAsDesc') });
    }
  };

  if (error && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">{t('admin:reports.errors.loadFailed')}</h2>
        <p className="text-muted-foreground mt-1">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          {t('admin:reports.errors.tryAgain')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin:reports.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('admin:reports.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {dateRange === "7d" ? t('admin:reports.dateRanges.last7Days') : dateRange === "30d" ? t('admin:reports.dateRanges.last30Days') : dateRange === "90d" ? t('admin:reports.dateRanges.last90Days') : t('admin:reports.dateRanges.last12Months')}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setDateRange("7d")}>{t('admin:reports.dateRanges.last7Days')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("30d")}>{t('admin:reports.dateRanges.last30Days')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("90d")}>{t('admin:reports.dateRanges.last90Days')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("12m")}>{t('admin:reports.dateRanges.last12Months')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REPORT_TYPES.map((report) => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report.id)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-start transition-all",
              selectedReport === report.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/30 hover:bg-muted/30"
            )}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              selectedReport === report.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              <report.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{t(report.labelKey)}</p>
              <p className="text-xs text-muted-foreground">{t(report.descKey)}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Report Preview */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h3 className="font-semibold">
              {t(REPORT_TYPES.find((r) => r.id === selectedReport)?.labelKey ?? 'admin:reports.types.users')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('admin:reports.previewTitle')}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                {t('admin:reports.exports.label')}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="me-2 h-4 w-4" />
                {t('admin:reports.exports.csv')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="me-2 h-4 w-4" />
                {t('admin:reports.exports.pdf')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileJson className="me-2 h-4 w-4" />
                {t('admin:reports.exports.json')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {selectedReport === "users" && (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.totalStudents')}</p>
                      <p className="text-2xl font-bold">{analytics?.totalStudents?.toLocaleString() || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.totalInstructors')}</p>
                      <p className="text-2xl font-bold">{analytics?.totalInstructors?.toLocaleString() || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.activeThisWeek')}</p>
                      <p className="text-2xl font-bold text-emerald-500">{analytics?.studentsActiveThisWeek?.toLocaleString() || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.activeThisMonth')}</p>
                      <p className="text-2xl font-bold">{analytics?.studentsActiveThisMonth?.toLocaleString() || 0}</p>
                    </div>
                  </div>

                  {/* Activity Chart */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">{t('admin:reports.sections.dailyActiveUsers')}</h4>
                    <div className="h-64">
                      {activityChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={activityChartData}>
                            <defs>
                              <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Area type="monotone" dataKey="activity" stroke="#3b82f6" strokeWidth={2} fill="url(#activityGradient)" name={t('admin:reports.charts.activeUsersLabel')} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          {t('admin:reports.charts.noActivityData')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedReport === "courses" && (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.totalCourses')}</p>
                      <p className="text-2xl font-bold">{analytics?.totalCourses?.toLocaleString() || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.totalEnrollments')}</p>
                      <p className="text-2xl font-bold">{analytics?.totalEnrollments?.toLocaleString() || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.activeEnrollments')}</p>
                      <p className="text-2xl font-bold text-emerald-500">{analytics?.activeEnrollments?.toLocaleString() || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.avgCompletion')}</p>
                      <p className="text-2xl font-bold">{analytics?.averageCourseCompletion?.toFixed(1) || 0}%</p>
                    </div>
                  </div>

                  {/* Enrollment Trend */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">{t('admin:reports.sections.enrollmentTrend')}</h4>
                    <div className="h-64">
                      {enrollmentChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={enrollmentChartData}>
                            <defs>
                              <linearGradient id="enrollGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Area type="monotone" dataKey="enrollments" stroke="#10b981" strokeWidth={2} fill="url(#enrollGradient)" name={t('admin:reports.charts.enrollmentsLabel')} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          {t('admin:reports.charts.noEnrollmentData')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Courses */}
                  {coursePerformanceData.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">{t('admin:reports.sections.mostEnrolledCourses')}</h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={coursePerformanceData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={120} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Bar dataKey="enrollments" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name={t('admin:reports.charts.enrollmentsLabel')} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedReport === "engagement" && (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.platformEngagement')}</p>
                      <p className="text-2xl font-bold">{analytics?.platformEngagementScore?.toFixed(1) || 0}%</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.activeToday')}</p>
                      <p className="text-2xl font-bold text-emerald-500">{analytics?.studentsActiveToday?.toLocaleString() || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.avgGrade')}</p>
                      <p className="text-2xl font-bold">{analytics?.averageStudentGrade?.toFixed(1) || 0}%</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.atRiskStudents')}</p>
                      <p className="text-2xl font-bold text-orange-500">{analytics?.atRiskStudentCount || 0}</p>
                    </div>
                  </div>

                  {/* Completion Trend */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">{t('admin:reports.sections.courseCompletions')}</h4>
                    <div className="h-64">
                      {completionChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={completionChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Bar dataKey="completions" fill="#8b5cf6" radius={[4, 4, 0, 0]} name={t('admin:reports.charts.completionsLabel')} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          {t('admin:reports.charts.noCompletionData')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Performers */}
                  {analytics?.topPerformers && analytics.topPerformers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">{t('admin:reports.sections.topPerformers')}</h4>
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="px-4 py-2 text-start font-medium text-muted-foreground">{t('admin:reports.table.student')}</th>
                              <th className="px-4 py-2 text-start font-medium text-muted-foreground">{t('admin:reports.table.engagement')}</th>
                              <th className="px-4 py-2 text-start font-medium text-muted-foreground">{t('admin:reports.table.completion')}</th>
                              <th className="px-4 py-2 text-start font-medium text-muted-foreground">{t('admin:reports.table.avgGrade')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics.topPerformers.slice(0, 5).map((student) => (
                              <tr key={student.userId} className="border-b last:border-0">
                                <td className="px-4 py-2">
                                  <p className="font-medium">{student.studentName}</p>
                                  <p className="text-xs text-muted-foreground">{student.email}</p>
                                </td>
                                <td className="px-4 py-2">{student.engagementScore.toFixed(0)}%</td>
                                <td className="px-4 py-2">{student.completionRate.toFixed(0)}%</td>
                                <td className="px-4 py-2">{student.averageGrade.toFixed(0)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedReport === "at-risk" && (
                <div className="space-y-6">
                  {/* Risk Overview */}
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.totalAtRisk')}</p>
                      <p className="text-2xl font-bold">{analytics?.atRiskStudentCount || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-red-500/10 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.criticalRisk')}</p>
                      <p className="text-2xl font-bold text-red-500">{analytics?.criticalRiskCount || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-orange-500/10 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.highRisk')}</p>
                      <p className="text-2xl font-bold text-orange-500">{analytics?.highRiskCount || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-yellow-500/10 p-4">
                      <p className="text-xs text-muted-foreground">{t('admin:reports.sections.mediumRisk')}</p>
                      <p className="text-2xl font-bold text-yellow-500">{analytics?.mediumRiskCount || 0}</p>
                    </div>
                  </div>

                  {/* At-Risk Students Table */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">{t('admin:reports.sections.studentsNeedingAttention')}</h4>
                    {atRiskStudents.length > 0 ? (
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="px-4 py-2 text-start font-medium text-muted-foreground">{t('admin:reports.table.student')}</th>
                              <th className="px-4 py-2 text-start font-medium text-muted-foreground">{t('admin:reports.table.riskLevel')}</th>
                              <th className="px-4 py-2 text-start font-medium text-muted-foreground">{t('admin:reports.table.riskScore')}</th>
                              <th className="px-4 py-2 text-start font-medium text-muted-foreground">{t('admin:reports.table.engagement')}</th>
                              <th className="px-4 py-2 text-start font-medium text-muted-foreground">{t('admin:reports.table.completion')}</th>
                              <th className="px-4 py-2 text-start font-medium text-muted-foreground">{t('admin:reports.table.riskFactors')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {atRiskStudents.slice(0, 10).map((student) => (
                              <tr key={student.userId} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="px-4 py-2">
                                  <p className="font-medium">{student.studentName}</p>
                                  <p className="text-xs text-muted-foreground">{student.email}</p>
                                </td>
                                <td className="px-4 py-2">
                                  <span className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                    student.riskLevel === "Critical" && "bg-red-500/10 text-red-600",
                                    student.riskLevel === "High" && "bg-orange-500/10 text-orange-600",
                                    student.riskLevel === "Medium" && "bg-yellow-500/10 text-yellow-600",
                                    student.riskLevel === "Low" && "bg-green-500/10 text-green-600"
                                  )}>
                                    {student.riskLevel}
                                  </span>
                                </td>
                                <td className="px-4 py-2">{student.riskScore.toFixed(0)}</td>
                                <td className="px-4 py-2">{student.engagementScore.toFixed(0)}%</td>
                                <td className="px-4 py-2">{student.completionRate.toFixed(0)}%</td>
                                <td className="px-4 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {student.riskFactors.slice(0, 2).map((factor, i) => (
                                      <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                                        {factor}
                                      </span>
                                    ))}
                                    {student.riskFactors.length > 2 && (
                                      <span className="text-xs text-muted-foreground">
                                        {t('admin:reports.table.moreFactors', { count: student.riskFactors.length - 2 })}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-lg border p-8 text-center text-muted-foreground">
                        {t('admin:reports.charts.noAtRiskStudents')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
