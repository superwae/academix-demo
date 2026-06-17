import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import {
  DataTable,
  DetailModal,
  FilterBar,
  type Column,
  type FilterConfig,
  type RowAction,
} from "../../../components/admin/finance";
import { cn } from "../../../lib/cn";
import { formatMoney } from "../../../lib/money";
import {
  financeService,
  type FinancePayoutDto,
  type FinancePayoutSummaryDto,
} from "../../../services/financeService";

const toMajor = (amount: number) => amount / 100;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const getStatusIcon = (status: FinancePayoutDto["status"]) => {
  switch (status) {
    case "completed":
      return CheckCircle;
    case "processing":
      return RefreshCw;
    case "on_hold":
      return AlertCircle;
    case "pending":
    default:
      return Clock;
  }
};

const getStatusColor = (status: FinancePayoutDto["status"]) => {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-600";
    case "processing":
      return "bg-blue-500/10 text-blue-600";
    case "on_hold":
      return "bg-red-500/10 text-red-600";
    case "pending":
    default:
      return "bg-amber-500/10 text-amber-600";
  }
};

export function FinancePayoutsPage() {
  const { t } = useTranslation(["admin", "common", "errors"]);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [payouts, setPayouts] = useState<FinancePayoutDto[]>([]);
  const [summary, setSummary] = useState<FinancePayoutSummaryDto | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<FinancePayoutDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPayouts = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [payoutResult, summaryResult] = await Promise.all([
        financeService.getPayouts(1, 100),
        financeService.getPayoutSummary(),
      ]);
      setPayouts(payoutResult.items ?? []);
      setSummary(summaryResult);
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPayouts();
  }, []);

  const currency = summary?.currency || payouts[0]?.courses[0]?.title || "ILS";
  const formatCurrency = (amount: number) => formatMoney(toMajor(amount), summary?.currency || "ILS");

  const getStatusLabel = (status: FinancePayoutDto["status"]) => {
    switch (status) {
      case "completed":
        return t("admin:finance.payouts.status.completed");
      case "processing":
        return t("admin:finance.payouts.status.processing");
      case "on_hold":
        return t("admin:finance.payouts.status.onHold");
      case "pending":
      default:
        return t("admin:finance.payouts.status.pending");
    }
  };

  const filteredPayouts = useMemo(() => {
    return payouts.filter((payout) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        payout.id.toLowerCase().includes(searchLower) ||
        payout.instructorName.toLowerCase().includes(searchLower) ||
        payout.instructorEmail.toLowerCase().includes(searchLower) ||
        payout.courses.some((course) => course.title.toLowerCase().includes(searchLower));
      const matchesStatus = statusFilter === "all" || payout.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [payouts, searchQuery, statusFilter]);

  const filters: FilterConfig[] = [
    {
      key: "status",
      label: t("admin:finance.payouts.filterLabels.status"),
      options: [
        { id: "all", label: t("admin:finance.payouts.status.all") },
        { id: "pending", label: t("admin:finance.payouts.status.pending") },
        { id: "processing", label: t("admin:finance.payouts.status.processing") },
        { id: "completed", label: t("admin:finance.payouts.status.completed") },
        { id: "on_hold", label: t("admin:finance.payouts.status.onHold") },
      ],
      value: statusFilter,
      onChange: setStatusFilter,
    },
  ];

  const columns: Column<FinancePayoutDto>[] = [
    {
      key: "instructor",
      header: t("admin:finance.payouts.columns.instructor"),
      render: (payout) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {payout.avatar || "IN"}
          </div>
          <div className="min-w-0">
            <p className="font-medium">{payout.instructorName}</p>
            <p className="truncate text-xs text-muted-foreground">{payout.instructorEmail}</p>
          </div>
        </div>
      ),
    },
    {
      key: "period",
      header: t("admin:finance.payouts.columns.period"),
      render: (payout) => (
        <div>
          <p className="text-sm font-medium">{formatDate(payout.periodStart)}</p>
          <p className="text-xs text-muted-foreground">{t("admin:finance.payouts.periodTo", { date: formatDate(payout.periodEnd) })}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: t("admin:finance.payouts.columns.gross"),
      className: "text-end",
      render: (payout) => (
        <div className="text-end">
          <p className="font-semibold">{formatCurrency(payout.grossAmount)}</p>
          <p className="text-xs text-muted-foreground">{t("admin:finance.payouts.feeLine", { amount: formatCurrency(payout.platformFee + payout.organizationShare) })}</p>
        </div>
      ),
    },
    {
      key: "netAmount",
      header: t("admin:finance.payouts.columns.netPayout"),
      className: "text-end",
      render: (payout) => <p className="text-lg font-bold text-emerald-500">{formatCurrency(payout.netAmount)}</p>,
    },
    {
      key: "status",
      header: t("admin:finance.payouts.columns.status"),
      className: "text-center",
      render: (payout) => {
        const StatusIcon = getStatusIcon(payout.status);
        return (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", getStatusColor(payout.status))}>
            <StatusIcon className="h-3.5 w-3.5" />
            {getStatusLabel(payout.status)}
          </span>
        );
      },
    },
  ];

  const rowActions: RowAction<FinancePayoutDto>[] = [
    {
      label: t("admin:finance.payouts.actions.viewDetails"),
      icon: Eye,
      onClick: (payout) => setSelectedPayout(payout),
    },
  ];

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const getDetailSections = (payout: FinancePayoutDto) => [
    {
      title: t("admin:finance.payouts.detail.sections.payoutInformation"),
      items: [
        { label: t("admin:finance.payouts.detail.fields.payoutId"), value: <span className="font-mono text-xs">{payout.id}</span> },
        { label: t("admin:finance.payouts.detail.fields.period"), value: `${formatDate(payout.periodStart)} - ${formatDate(payout.periodEnd)}` },
        { label: t("admin:finance.payouts.columns.instructor"), value: payout.instructorEmail },
        { label: t("admin:finance.payouts.instructorMeta.coursePlural"), value: String(payout.courseCount) },
      ],
    },
    {
      title: t("admin:finance.payouts.detail.sections.amountBreakdown"),
      items: [
        { label: t("admin:finance.payouts.detail.fields.grossEarnings"), value: formatCurrency(payout.grossAmount) },
        { label: t("admin:finance.payouts.detail.fields.platformFee"), value: <span className="text-red-500">-{formatCurrency(payout.platformFee)}</span> },
        ...(payout.organizationShare > 0
          ? [{ label: t("admin:finance.overview.categories.other", { defaultValue: "Organization share" }), value: <span className="text-red-500">-{formatCurrency(payout.organizationShare)}</span> }]
          : []),
        { label: t("admin:finance.payouts.detail.fields.netPayout"), value: <span className="font-bold text-emerald-500">{formatCurrency(payout.netAmount)}</span> },
      ],
    },
    {
      title: t("admin:finance.overview.topCourses.columns.course"),
      items: payout.courses.map((course) => ({
        label: course.title,
        value: `${formatCurrency(course.earnings)} / ${course.payments}`,
      })),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("admin:finance.payouts.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("admin:finance.payouts.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info(t("admin:finance.payouts.exportingPayouts"))}>
          <Download className="h-4 w-4" />
          {t("admin:finance.payouts.export")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={Clock} color="bg-amber-500/10 text-amber-500" label={t("admin:finance.payouts.stats.pending")} value={formatCurrency(summary?.pendingTotal ?? 0)} sub={t("admin:finance.payouts.stats.payouts", { count: summary?.pendingCount ?? 0 })} />
        <StatCard icon={RefreshCw} color="bg-blue-500/10 text-blue-500" label={t("admin:finance.payouts.stats.processing")} value={formatCurrency(summary?.processingTotal ?? 0)} sub={t("admin:finance.payouts.stats.payouts", { count: summary?.processingCount ?? 0 })} />
        <StatCard icon={CheckCircle} color="bg-emerald-500/10 text-emerald-500" label={t("admin:finance.payouts.stats.paidThisMonth")} value={formatCurrency(summary?.completedTotal ?? 0)} sub={t("admin:finance.payouts.stats.payouts", { count: summary?.completedCount ?? 0 })} />
        <StatCard icon={Users} color="bg-primary/10 text-primary" label={t("admin:finance.payouts.stats.activeInstructors")} value={String(summary?.uniqueInstructors ?? 0)} sub={t("admin:finance.payouts.stats.withEarnings")} />
      </div>

      <FilterBar
        searchPlaceholder={t("admin:finance.payouts.searchPlaceholder")}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onClearAll={clearFilters}
      />

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("common:loading")}</span>
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm text-destructive">{loadError}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void loadPayouts()}>
            {t("common:retry", { defaultValue: "Retry" })}
          </Button>
        </div>
      ) : (
        <DataTable
          data={filteredPayouts}
          columns={columns}
          keyExtractor={(payout) => payout.id}
          rowActions={rowActions}
          onRowClick={(payout) => setSelectedPayout(payout)}
          emptyIcon={Wallet}
          emptyMessage={t("admin:finance.payouts.empty.message")}
          emptyAction={
            <Button variant="link" size="sm" onClick={clearFilters}>
              {t("admin:finance.payouts.empty.clearFilters")}
            </Button>
          }
          pageSize={10}
        />
      )}

      {selectedPayout && (
        <DetailModal
          open={!!selectedPayout}
          onClose={() => setSelectedPayout(null)}
          title={t("admin:finance.payouts.detail.title")}
          icon={Wallet}
          badge={{
            label: getStatusLabel(selectedPayout.status),
            variant: selectedPayout.status === "completed" ? "success" : selectedPayout.status === "on_hold" ? "error" : selectedPayout.status === "processing" ? "info" : "warning",
          }}
          headerContent={
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                {selectedPayout.avatar || "IN"}
              </div>
              <div>
                <p className="font-medium">{selectedPayout.instructorName}</p>
                <p className="text-xs text-muted-foreground">{selectedPayout.instructorEmail}</p>
              </div>
            </div>
          }
          sections={getDetailSections(selectedPayout)}
          size="lg"
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  color,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  color: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
    </div>
  );
}
