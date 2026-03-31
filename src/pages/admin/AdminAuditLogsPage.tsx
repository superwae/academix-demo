import { useState } from "react";
import {
  ScrollText,
  Search,
  Filter,
  ChevronDown,
  User,
  Settings,
  BookOpen,
  DollarSign,
  Shield,
  Clock,
  Download,
  RefreshCw,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";

// Mock audit logs
const MOCK_AUDIT_LOGS = [
  {
    id: "LOG001",
    action: "user.login",
    actor: "admin@academixlms.com",
    actorRole: "SuperAdmin",
    target: "Session",
    description: "Admin logged in successfully",
    ipAddress: "192.168.1.100",
    timestamp: "2026-01-19T08:45:00Z",
    status: "success",
  },
  {
    id: "LOG002",
    action: "course.approve",
    actor: "admin@academixlms.com",
    actorRole: "SuperAdmin",
    target: "Advanced React Patterns",
    description: "Course approved for publication",
    ipAddress: "192.168.1.100",
    timestamp: "2026-01-19T08:30:00Z",
    status: "success",
  },
  {
    id: "LOG003",
    action: "user.create",
    actor: "system",
    actorRole: "System",
    target: "james.taylor@email.com",
    description: "New user registered via public signup",
    ipAddress: "203.45.67.89",
    timestamp: "2026-01-19T08:15:00Z",
    status: "success",
  },
  {
    id: "LOG004",
    action: "payment.process",
    actor: "system",
    actorRole: "System",
    target: "TXN-2024-001234",
    description: "Payment processed for course enrollment",
    ipAddress: "10.0.0.1",
    timestamp: "2026-01-19T07:45:00Z",
    status: "success",
  },
  {
    id: "LOG005",
    action: "user.password_reset",
    actor: "michelle.garcia@email.com",
    actorRole: "Student",
    target: "Self",
    description: "Password reset requested",
    ipAddress: "156.78.90.12",
    timestamp: "2026-01-19T07:30:00Z",
    status: "success",
  },
  {
    id: "LOG006",
    action: "settings.update",
    actor: "admin@academixlms.com",
    actorRole: "SuperAdmin",
    target: "Platform Settings",
    description: "Updated email notification settings",
    ipAddress: "192.168.1.100",
    timestamp: "2026-01-18T16:00:00Z",
    status: "success",
  },
  {
    id: "LOG007",
    action: "user.role_change",
    actor: "admin@academixlms.com",
    actorRole: "SuperAdmin",
    target: "sarah.johnson@email.com",
    description: "Role changed from Student to Instructor",
    ipAddress: "192.168.1.100",
    timestamp: "2026-01-18T15:30:00Z",
    status: "success",
  },
  {
    id: "LOG008",
    action: "course.reject",
    actor: "admin@academixlms.com",
    actorRole: "SuperAdmin",
    target: "Invalid Course Submission",
    description: "Course rejected - incomplete materials",
    ipAddress: "192.168.1.100",
    timestamp: "2026-01-18T14:00:00Z",
    status: "warning",
  },
  {
    id: "LOG009",
    action: "user.login_failed",
    actor: "unknown@email.com",
    actorRole: "Unknown",
    target: "Session",
    description: "Failed login attempt - invalid credentials",
    ipAddress: "45.67.89.123",
    timestamp: "2026-01-18T12:00:00Z",
    status: "error",
  },
];

const ACTION_CATEGORIES = [
  { value: "all", label: "All Actions" },
  { value: "user", label: "User Actions" },
  { value: "course", label: "Course Actions" },
  { value: "payment", label: "Payment Actions" },
  { value: "settings", label: "Settings" },
];

function getActionIcon(action: string) {
  if (action.startsWith("user")) return <User className="h-4 w-4" />;
  if (action.startsWith("course")) return <BookOpen className="h-4 w-4" />;
  if (action.startsWith("payment")) return <DollarSign className="h-4 w-4" />;
  if (action.startsWith("settings")) return <Settings className="h-4 w-4" />;
  return <Shield className="h-4 w-4" />;
}

function getActionColor(action: string, status: string) {
  if (status === "error") return "bg-red-500/10 text-red-500";
  if (status === "warning") return "bg-amber-500/10 text-amber-500";
  if (action.startsWith("user")) return "bg-blue-500/10 text-blue-500";
  if (action.startsWith("course")) return "bg-emerald-500/10 text-emerald-500";
  if (action.startsWith("payment")) return "bg-purple-500/10 text-purple-500";
  if (action.startsWith("settings")) return "bg-amber-500/10 text-amber-500";
  return "bg-muted text-muted-foreground";
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AdminAuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredLogs = MOCK_AUDIT_LOGS.filter((log) => {
    const matchesSearch = 
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || log.action.startsWith(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  // Stats
  const totalLogs = MOCK_AUDIT_LOGS.length;
  const todayLogs = MOCK_AUDIT_LOGS.filter((log) => {
    const logDate = new Date(log.timestamp).toDateString();
    return logDate === new Date().toDateString();
  }).length;
  const errorLogs = MOCK_AUDIT_LOGS.filter((log) => log.status === "error").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            Track all system activities and changes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ScrollText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Events</p>
              <p className="text-xl font-bold">{totalLogs.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Today's Events</p>
              <p className="text-xl font-bold">{todayLogs}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <Shield className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Failed Actions</p>
              <p className="text-xl font-bold text-red-500">{errorLogs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {ACTION_CATEGORIES.find((c) => c.value === categoryFilter)?.label}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {ACTION_CATEGORIES.map((category) => (
              <DropdownMenuItem key={category.value} onClick={() => setCategoryFilter(category.value)}>
                {category.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Target</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP Address</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", getActionColor(log.action, log.status))}>
                        {getActionIcon(log.action)}
                      </div>
                      <span className="font-mono text-xs">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{log.actor}</p>
                      <p className="text-xs text-muted-foreground">{log.actorRole}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.target}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{log.description}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ipAddress}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="py-12 text-center">
            <ScrollText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No logs found</p>
          </div>
        )}
      </div>
    </div>
  );
}
