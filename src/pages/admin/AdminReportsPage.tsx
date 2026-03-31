import { useState, useEffect } from "react";
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
  { id: "users", label: "User Analytics", icon: Users, description: "User registrations, activity, and demographics" },
  { id: "courses", label: "Course Performance", icon: BookOpen, description: "Enrollments, completions, and ratings" },
  { id: "engagement", label: "Engagement Metrics", icon: TrendingUp, description: "Platform usage and engagement stats" },
  { id: "at-risk", label: "At-Risk Students", icon: AlertTriangle, description: "Students needing attention" },
];

export function AdminReportsPage() {
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
        setError(err instanceof Error ? err.message : 'Failed to load report data');
        toast.error('Failed to load report data');
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
          toast.success('Users exported', { description: 'CSV file downloaded.' });
        } else if (selectedReport === 'at-risk') {
          await adminService.exportAtRiskStudentsCsv();
          toast.success('At-risk students exported', { description: 'CSV file downloaded.' });
        } else {
          toast.info('Export coming soon', { description: `CSV export for ${selectedReport} will be available shortly.` });
        }
      } catch (err) {
        toast.error('Export failed', { description: err instanceof Error ? err.message : 'Please try again.' });
      }
    } else {
      toast.info(`Export as ${format.toUpperCase()}`, { description: 'Coming soon.' });
    }
  };

  if (error && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">Failed to load reports</h2>
        <p className="text-muted-foreground mt-1">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Generate and export platform analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {dateRange === "7d" ? "Last 7 days" : dateRange === "30d" ? "Last 30 days" : dateRange === "90d" ? "Last 90 days" : "Last 12 months"}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setDateRange("7d")}>Last 7 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("30d")}>Last 30 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("90d")}>Last 90 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("12m")}>Last 12 months</DropdownMenuItem>
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
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
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
              <p className="font-medium">{report.label}</p>
              <p className="text-xs text-muted-foreground">{report.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Report Preview */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h3 className="font-semibold">
              {REPORT_TYPES.find((r) => r.id === selectedReport)?.label}
            </h3>
            <p className="text-xs text-muted-foreground">
              Preview of report data
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileJson className="mr-2 h-4 w-4" />
                Export as JSON
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
                      <p className="text-xs text-muted-foreground">Total Students</p>
                      <p className="text-2xl font-bold">{analytics?.totalStudents?.toLocaleString() || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Total Instructors</p>
                      <p className="text-2xl font-bold">{analytics?.totalInstructors?.toLocaleString() || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Active This Week</p>
                      <p className="text-2xl font-bold text-emerald-500">{analytics?.studentsActiveThisWeek?.toLocaleString() || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Active This Month</p>
                      <p className="text-2xl font-bold">{analytics?.studentsActiveThisMonth?.toLocaleString() || 0}</p>
                    </div>
                  </div>

                  {/* Activity Chart */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Daily Active Users (Last 30 Days)</h4>
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
                            <Area type="monotone" dataKey="activity" stroke="#3b82f6" strokeWidth={2} fill="url(#activityGradient)" name="Active Users" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          No activity data available
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
                      <p className="text-xs text-muted-foreground">Total Courses</p>
                      <p className="text-2xl font-bold">{analytics?.totalCourses?.toLocaleString() || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Total Enrollments</p>
                      <p className="text-2xl font-bold">{analytics?.totalEnrollments?.toLocaleString() || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Active Enrollments</p>
                      <p className="text-2xl font-bold text-emerald-500">{analytics?.activeEnrollments?.toLocaleString() || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Avg. Completion Rate</p>
                      <p className="text-2xl font-bold">{analytics?.averageCourseCompletion?.toFixed(1) || 0}%</p>
                    </div>
                  </div>

                  {/* Enrollment Trend */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Enrollment Trend (Last 30 Days)</h4>
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
                            <Area type="monotone" dataKey="enrollments" stroke="#10b981" strokeWidth={2} fill="url(#enrollGradient)" name="Enrollments" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          No enrollment data available
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Courses */}
                  {coursePerformanceData.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Most Enrolled Courses</h4>
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
                            <Bar dataKey="enrollments" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Enrollments" />
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
                      <p className="text-xs text-muted-foreground">Platform Engagement</p>
                      <p className="text-2xl font-bold">{analytics?.platformEngagementScore?.toFixed(1) || 0}%</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Active Today</p>
                      <p className="text-2xl font-bold text-emerald-500">{analytics?.studentsActiveToday?.toLocaleString() || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">Avg. Student Grade</p>
                      <p className="text-2xl font-bold">{analytics?.averageStudentGrade?.toFixed(1) || 0}%</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground">At-Risk Students</p>
                      <p className="text-2xl font-bold text-orange-500">{analytics?.atRiskStudentCount || 0}</p>
                    </div>
                  </div>

                  {/* Completion Trend */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Course Completions (Last 30 Days)</h4>
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
                            <Bar dataKey="completions" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Completions" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          No completion data available
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Performers */}
                  {analytics?.topPerformers && analytics.topPerformers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Top Performing Students</h4>
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Student</th>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Engagement</th>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Completion</th>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Avg. Grade</th>
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
                      <p className="text-xs text-muted-foreground">Total At-Risk</p>
                      <p className="text-2xl font-bold">{analytics?.atRiskStudentCount || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-red-500/10 p-4">
                      <p className="text-xs text-muted-foreground">Critical Risk</p>
                      <p className="text-2xl font-bold text-red-500">{analytics?.criticalRiskCount || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-orange-500/10 p-4">
                      <p className="text-xs text-muted-foreground">High Risk</p>
                      <p className="text-2xl font-bold text-orange-500">{analytics?.highRiskCount || 0}</p>
                    </div>
                    <div className="rounded-lg border bg-yellow-500/10 p-4">
                      <p className="text-xs text-muted-foreground">Medium Risk</p>
                      <p className="text-2xl font-bold text-yellow-500">{analytics?.mediumRiskCount || 0}</p>
                    </div>
                  </div>

                  {/* At-Risk Students Table */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Students Needing Attention</h4>
                    {atRiskStudents.length > 0 ? (
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Student</th>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Risk Level</th>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Risk Score</th>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Engagement</th>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Completion</th>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Risk Factors</th>
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
                                        +{student.riskFactors.length - 2} more
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
                        No at-risk students found
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
