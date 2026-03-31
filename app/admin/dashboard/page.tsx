"use client";

import React from "react";
import {
  Users,
  BookOpen,
  DollarSign,
  ClipboardCheck,
  Activity,
  TrendingUp,
  UserPlus,
  CreditCard,
  FileCheck,
  ArrowRight,
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
} from "recharts";
import { PageHeader, StatCard, ChartCard } from "@/components/admin/shared";
import { cn } from "@/lib/cn";
import {
  userGrowthData,
  monthlyRevenueData,
  userRolesDistribution,
  recentActivity,
  systemHealth,
} from "@/lib/admin/mockData";

export default function AdminDashboard() {
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's what's happening with AcademiX."
      />

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Users"
          value="2,680"
          icon={Users}
          change={{ value: 12.5, label: "from last month" }}
          trend="up"
          iconColor="text-blue-500"
        />
        <StatCard
          title="Active Courses"
          value="48"
          icon={BookOpen}
          change={{ value: 8.2, label: "from last month" }}
          trend="up"
          iconColor="text-emerald-500"
        />
        <StatCard
          title="Monthly Revenue"
          value="$68,000"
          icon={DollarSign}
          change={{ value: 5.6, label: "from last month" }}
          trend="down"
          iconColor="text-amber-500"
        />
        <StatCard
          title="Pending Approvals"
          value="7"
          icon={ClipboardCheck}
          change={{ value: 3, label: "new today" }}
          trend="neutral"
          iconColor="text-orange-500"
        />
        <StatCard
          title="System Health"
          value={systemHealth.uptime}
          icon={Activity}
          change={{ value: 0, label: systemHealth.status }}
          trend="up"
          iconColor="text-emerald-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Growth Chart */}
        <ChartCard
          title="User Growth"
          description="New user registrations over time"
          actions={[
            { label: "Export CSV", onClick: () => console.log("Export") },
            { label: "View Details", onClick: () => console.log("Details") },
          ]}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={userGrowthData}>
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
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Monthly Revenue Chart */}
        <ChartCard
          title="Monthly Revenue"
          description="Revenue breakdown by month"
          actions={[
            { label: "Export CSV", onClick: () => console.log("Export") },
            { label: "View Details", onClick: () => console.log("Details") },
          ]}
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
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [formatCurrency(value), "Revenue"]}
              />
              <Bar
                dataKey="revenue"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Roles Distribution */}
        <ChartCard
          title="User Distribution"
          description="Users by role type"
          className="lg:col-span-1"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
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
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Recent Activity */}
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <p className="text-sm text-muted-foreground">
                Latest platform events
              </p>
            </div>
            <button className="flex items-center gap-1 text-sm text-primary hover:underline">
              View all
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            {recentActivity.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 rounded-lg p-3 transition-colors hover:bg-muted/50"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg",
                    getActivityColor(activity.type)
                  )}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {activity.description}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">
                    {formatTime(activity.timestamp)}
                  </span>
                  {activity.amount && (
                    <span className="text-sm font-medium text-emerald-500">
                      +{formatCurrency(activity.amount)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">System Status</h3>
            <p className="text-sm text-muted-foreground">
              All services operational status
            </p>
          </div>
          <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            All Systems Operational
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {systemHealth.services.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4"
            >
              <span className="font-medium">{service.name}</span>
              <span
                className={cn(
                  "flex items-center gap-1.5 text-sm",
                  service.status === "operational"
                    ? "text-emerald-500"
                    : service.status === "degraded"
                    ? "text-amber-500"
                    : "text-red-500"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    service.status === "operational"
                      ? "bg-emerald-500"
                      : service.status === "degraded"
                      ? "bg-amber-500"
                      : "bg-red-500"
                  )}
                />
                {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
