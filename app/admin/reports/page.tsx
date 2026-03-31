"use client";

import React, { useState } from "react";
import {
  BarChart3,
  LineChart,
  PieChart,
  Calendar,
  Download,
  FileText,
  Users,
  DollarSign,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PageHeader, ChartCard } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import {
  userGrowthData,
  monthlyRevenueData,
  userRolesDistribution,
} from "@/lib/admin/mockData";
import { cn } from "@/lib/cn";

type ReportType = "users" | "revenue" | "courses" | "engagement";

interface ReportConfig {
  id: ReportType;
  label: string;
  icon: React.ElementType;
  description: string;
}

const reportTypes: ReportConfig[] = [
  {
    id: "users",
    label: "User Analytics",
    icon: Users,
    description: "User registration, activity, and demographics",
  },
  {
    id: "revenue",
    label: "Revenue Report",
    icon: DollarSign,
    description: "Income, refunds, and financial metrics",
  },
  {
    id: "courses",
    label: "Course Performance",
    icon: BookOpen,
    description: "Enrollments, completion rates, and ratings",
  },
  {
    id: "engagement",
    label: "Engagement Metrics",
    icon: TrendingUp,
    description: "User activity, session duration, and retention",
  },
];

// Mock course performance data
const coursePerformanceData = [
  { name: "React Patterns", enrollments: 234, completions: 180, rating: 4.8 },
  { name: "ML Fundamentals", enrollments: 189, completions: 120, rating: 4.6 },
  { name: "Python Analysis", enrollments: 312, completions: 250, rating: 4.9 },
  { name: "AWS Solutions", enrollments: 98, completions: 65, rating: 4.5 },
  { name: "UI/UX Design", enrollments: 156, completions: 130, rating: 4.7 },
];

// Mock engagement data
const engagementData = [
  { day: "Mon", sessions: 1250, avgDuration: 42 },
  { day: "Tue", sessions: 1420, avgDuration: 45 },
  { day: "Wed", sessions: 1380, avgDuration: 38 },
  { day: "Thu", sessions: 1520, avgDuration: 50 },
  { day: "Fri", sessions: 1100, avgDuration: 35 },
  { day: "Sat", sessions: 890, avgDuration: 55 },
  { day: "Sun", sessions: 750, avgDuration: 60 },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("users");
  const [dateRange, setDateRange] = useState({
    start: "2025-01-01",
    end: "2025-01-19",
  });

  const handleExport = (format: "csv" | "pdf") => {
    console.log(`Exporting ${selectedReport} report as ${format}`);
    // Mock export functionality
  };

  const renderReportContent = () => {
    switch (selectedReport) {
      case "users":
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="User Growth"
              description="Monthly new user registrations"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={userGrowthData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="User Distribution"
              description="Users by role type"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={userRolesDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {userRolesDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        );

      case "revenue":
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Monthly Revenue"
              description="Revenue breakdown by month"
              className="lg:col-span-2"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenueData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [
                      `$${value.toLocaleString()}`,
                      "Revenue",
                    ]}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        );

      case "courses":
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Course Enrollments"
              description="Top performing courses by enrollments"
              className="lg:col-span-2"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coursePerformanceData} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    horizontal={false}
                  />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="enrollments"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                    name="Enrollments"
                  />
                  <Bar
                    dataKey="completions"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    name="Completions"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        );

      case "engagement":
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Daily Sessions"
              description="User sessions throughout the week"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar
                    dataKey="sessions"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Average Session Duration"
              description="Minutes per session by day"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={engagementData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}m`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value} minutes`, "Duration"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgDuration"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: "#f59e0b" }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and export platform analytics reports"
      >
        <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
          <FileText className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport("pdf")}>
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </PageHeader>

      {/* Report Type Selection */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const isSelected = selectedReport === report.id;

          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={cn(
                "group rounded-xl border p-4 text-left transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/50 hover:bg-accent"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{report.label}</h3>
                  <p className="text-xs text-muted-foreground">
                    {report.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Date Range:</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, start: e.target.value }))
            }
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, end: e.target.value }))
            }
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setDateRange({
                start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
                end: new Date().toISOString().split("T")[0],
              })
            }
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Last 7 days
          </button>
          <button
            onClick={() =>
              setDateRange({
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
                end: new Date().toISOString().split("T")[0],
              })
            }
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Last 30 days
          </button>
          <button
            onClick={() =>
              setDateRange({
                start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
                end: new Date().toISOString().split("T")[0],
              })
            }
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Last 90 days
          </button>
        </div>
      </div>

      {/* Report Content */}
      {renderReportContent()}
    </div>
  );
}
