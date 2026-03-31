"use client";

import React, { useState } from "react";
import {
  FileText,
  Filter,
  Download,
  User,
  BookOpen,
  CreditCard,
  Settings,
  Shield,
  Search,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { PageHeader, DataTable, StatusBadge, Column } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { mockAuditLogs, AuditLog } from "@/lib/admin/mockData";
import { cn } from "@/lib/cn";

export default function AuditLogsPage() {
  const [logs] = useState<AuditLog[]>(mockAuditLogs);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterTargetType, setFilterTargetType] = useState<string>("all");
  const [filterActor, setFilterActor] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== "all" && !log.action.toLowerCase().includes(filterAction))
      return false;
    if (filterTargetType !== "all" && log.targetType !== filterTargetType)
      return false;
    if (filterActor && !log.actor.toLowerCase().includes(filterActor.toLowerCase()))
      return false;
    if (dateRange.start && new Date(log.timestamp) < new Date(dateRange.start))
      return false;
    if (dateRange.end && new Date(log.timestamp) > new Date(dateRange.end))
      return false;
    return true;
  });

  const getTargetTypeIcon = (type: string) => {
    switch (type) {
      case "user":
        return <User className="h-4 w-4" />;
      case "course":
        return <BookOpen className="h-4 w-4" />;
      case "payment":
        return <CreditCard className="h-4 w-4" />;
      case "system":
        return <Settings className="h-4 w-4" />;
      case "role":
        return <Shield className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTargetTypeColor = (type: string) => {
    switch (type) {
      case "user":
        return "bg-blue-500/10 text-blue-500";
      case "course":
        return "bg-emerald-500/10 text-emerald-500";
      case "payment":
        return "bg-amber-500/10 text-amber-500";
      case "system":
        return "bg-purple-500/10 text-purple-500";
      case "role":
        return "bg-pink-500/10 text-pink-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes("create") || lowerAction.includes("approved"))
      return "text-emerald-500";
    if (lowerAction.includes("delete") || lowerAction.includes("suspended"))
      return "text-red-500";
    if (lowerAction.includes("update") || lowerAction.includes("modified"))
      return "text-amber-500";
    if (lowerAction.includes("login") || lowerAction.includes("logout"))
      return "text-blue-500";
    return "text-foreground";
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const uniqueActions = Array.from(
    new Set(logs.map((log) => log.action.split(" ")[0].toLowerCase()))
  );

  const columns: Column<AuditLog>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      sortable: true,
      render: (log) => {
        const { date, time } = formatTimestamp(log.timestamp);
        return (
          <div className="text-sm">
            <p className="font-medium">{date}</p>
            <p className="text-muted-foreground">{time}</p>
          </div>
        );
      },
    },
    {
      key: "action",
      header: "Action",
      sortable: true,
      render: (log) => (
        <span className={cn("font-medium", getActionColor(log.action))}>
          {log.action}
        </span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      sortable: true,
      render: (log) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {log.actor
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <span>{log.actor}</span>
        </div>
      ),
    },
    {
      key: "target",
      header: "Target",
      render: (log) => (
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              getTargetTypeColor(log.targetType)
            )}
          >
            {getTargetTypeIcon(log.targetType)}
          </div>
          <div>
            <p className="font-medium">{log.target}</p>
            <p className="text-xs capitalize text-muted-foreground">
              {log.targetType}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "details",
      header: "Details",
      render: (log) => (
        <span className="text-sm text-muted-foreground">
          {log.details || "—"}
        </span>
      ),
    },
    {
      key: "ipAddress",
      header: "IP Address",
      render: (log) => (
        <span className="font-mono text-sm text-muted-foreground">
          {log.ipAddress}
        </span>
      ),
    },
  ];

  // Stats
  const stats = {
    total: logs.length,
    today: logs.filter(
      (l) =>
        new Date(l.timestamp).toDateString() === new Date().toDateString()
    ).length,
    users: logs.filter((l) => l.targetType === "user").length,
    system: logs.filter((l) => l.targetType === "system").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track all system activities and user actions"
      >
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Logs</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Calendar className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.today}</p>
              <p className="text-sm text-muted-foreground">Today</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <User className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.users}</p>
              <p className="text-sm text-muted-foreground">User Actions</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Settings className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.system}</p>
              <p className="text-sm text-muted-foreground">System Events</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          {/* Actor Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by actor..."
              value={filterActor}
              onChange={(e) => setFilterActor(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Action Filter */}
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Actions</option>
            <option value="login">Login</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="approved">Approved</option>
            <option value="suspended">Suspended</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Target Type Filter */}
          <select
            value={filterTargetType}
            onChange={(e) => setFilterTargetType(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Types</option>
            <option value="user">User</option>
            <option value="course">Course</option>
            <option value="payment">Payment</option>
            <option value="system">System</option>
            <option value="role">Role</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
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

          {/* Clear Filters */}
          {(filterAction !== "all" ||
            filterTargetType !== "all" ||
            filterActor ||
            dateRange.start ||
            dateRange.end) && (
            <button
              onClick={() => {
                setFilterAction("all");
                setFilterTargetType("all");
                setFilterActor("");
                setDateRange({ start: "", end: "" });
              }}
              className="text-sm text-primary hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <DataTable
        data={filteredLogs}
        columns={columns}
        searchable={false}
        pageSize={15}
        emptyMessage="No audit logs found"
      />

      {/* Log Retention Notice */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Log Retention Policy:</span>{" "}
              Audit logs are retained for 90 days. Older logs are automatically
              archived. For compliance purposes, archived logs can be retrieved
              upon request.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
