import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  DollarSign,
  Download,
  Filter,
  RefreshCw,
  ScrollText,
  Search,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { ResponsiveTable, type ResponsiveTableColumn } from "../../components/ui/responsive-table";
import { cn } from "../../lib/cn";
import { auditLogService, type AuditLogDto, type AuditLogSummaryDto } from "../../services/auditLogService";

const ACTION_CATEGORIES = [
  { value: "all", label: "All events" },
  { value: "user", label: "Users" },
  { value: "course", label: "Courses" },
  { value: "payment", label: "Payments" },
  { value: "organization", label: "Organizations" },
  { value: "support", label: "Support" },
  { value: "settings", label: "Settings" },
  { value: "system", label: "System" },
];

function getActionIcon(log: AuditLogDto) {
  if (log.category === "user") return <User className="h-4 w-4" />;
  if (log.category === "course") return <BookOpen className="h-4 w-4" />;
  if (log.category === "payment") return <DollarSign className="h-4 w-4" />;
  if (log.category === "settings") return <Settings className="h-4 w-4" />;
  return <Shield className="h-4 w-4" />;
}

function getActionColor(log: AuditLogDto) {
  if (log.status === "error") return "bg-red-500/10 text-red-500";
  if (log.status === "warning") return "bg-amber-500/10 text-amber-500";
  if (log.category === "user") return "bg-blue-500/10 text-blue-500";
  if (log.category === "course") return "bg-emerald-500/10 text-emerald-500";
  if (log.category === "payment") return "bg-violet-500/10 text-violet-500";
  if (log.category === "organization") return "bg-cyan-500/10 text-cyan-600";
  return "bg-muted text-muted-foreground";
}

export function AdminAuditLogsPage() {
  const { t } = useTranslation(["admin", "common", "errors"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [summary, setSummary] = useState<AuditLogSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [logResult, summaryResult] = await Promise.all([
        auditLogService.getAuditLogs(1, 100, categoryFilter, searchQuery),
        auditLogService.getSummary(),
      ]);
      setLogs(logResult.items ?? []);
      setSummary(summaryResult);
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [categoryFilter]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    const search = searchQuery.toLowerCase();
    return logs.filter((log) =>
      [log.actor, log.target, log.description, log.action, log.ipAddress, log.path]
        .some((value) => value.toLowerCase().includes(search))
    );
  }, [logs, searchQuery]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return t("admin:auditLogs.time.justNow");
    if (hours < 24) return t("admin:auditLogs.time.hoursAgo", { hours });
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const logColumns: ResponsiveTableColumn<AuditLogDto>[] = [
    {
      id: "action",
      header: t("admin:auditLogs.table.action"),
      cell: (log) => (
        <div className="flex items-center gap-2">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", getActionColor(log))}>
            {getActionIcon(log)}
          </div>
          <span className="font-mono text-xs">{log.action}</span>
        </div>
      ),
    },
    {
      id: "actor",
      header: t("admin:auditLogs.table.actor"),
      cell: (log) => (
        <div className="text-start">
          <p className="font-medium">{log.actor}</p>
          <p className="text-xs text-muted-foreground">{log.actorRole}</p>
        </div>
      ),
    },
    {
      id: "target",
      header: t("admin:auditLogs.table.target"),
      hiddenOnMobile: true,
      cell: (log) => <span className="text-muted-foreground">{log.target}</span>,
    },
    {
      id: "description",
      header: t("admin:auditLogs.table.description"),
      className: "max-w-xs truncate",
      cell: (log) => <span className="block truncate">{log.description}</span>,
    },
    {
      id: "ipAddress",
      header: t("admin:auditLogs.table.ipAddress"),
      hiddenOnMobile: true,
      cell: (log) => <span className="font-mono text-xs text-muted-foreground">{log.ipAddress}</span>,
    },
    {
      id: "time",
      header: t("admin:auditLogs.table.time"),
      cell: (log) => <span className="whitespace-nowrap text-xs text-muted-foreground">{formatTimestamp(log.timestamp)}</span>,
    },
  ];

  const exportCsv = () => {
    const headers = ["action", "actor", "role", "target", "description", "status", "ip", "method", "path", "timestamp"];
    const escape = (value: string) => (value.includes(",") || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value);
    const rows = filteredLogs.map((log) => [
      log.action,
      log.actor,
      log.actorRole,
      log.target,
      log.description,
      log.status,
      log.ipAddress,
      log.method,
      log.path,
      log.timestamp,
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    toast.success(t("admin:auditLogs.export", { defaultValue: "Export" }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("admin:auditLogs.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin:auditLogs.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => void loadLogs()}>
            <RefreshCw className="h-4 w-4" />
            {t("admin:auditLogs.refresh")}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            {t("admin:auditLogs.export")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={ScrollText} label={t("admin:auditLogs.stats.totalEvents")} value={(summary?.totalEvents ?? 0).toLocaleString()} color="bg-primary/10 text-primary" />
        <StatCard icon={RefreshCw} label={t("admin:auditLogs.stats.todayEvents")} value={String(summary?.todayEvents ?? 0)} color="bg-blue-500/10 text-blue-500" />
        <StatCard icon={Shield} label={t("admin:auditLogs.stats.failedActions")} value={String(summary?.failedActions ?? 0)} color="bg-red-500/10 text-red-500" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("admin:auditLogs.searchPlaceholder")}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void loadLogs();
            }}
            className="ps-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {ACTION_CATEGORIES.find((category) => category.value === categoryFilter)?.label ?? ACTION_CATEGORIES[0].label}
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

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("common:loading")}</span>
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm text-destructive">{loadError}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void loadLogs()}>
            {t("common:retry", { defaultValue: "Retry" })}
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card p-3 md:p-0">
          <ResponsiveTable
            data={filteredLogs}
            columns={logColumns}
            rowKey={(log) => log.id}
            empty={
              <div className="py-12 text-center">
                <ScrollText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">{t("admin:auditLogs.empty")}</p>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}
