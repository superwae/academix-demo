import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  Download,
  Eye,
  RotateCcw,
  FileText,
  History,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "../../../lib/cn";
import { Button } from "../../../components/ui/button";
import {
  FilterBar,
  DataTable,
  DetailModal,
  DetailAmount,
  type Column,
  type RowAction,
  type FilterConfig,
} from "../../../components/admin/finance";
import { toast } from "sonner";
import { paymentService, type PaymentDto } from "../../../services/paymentService";

// =====================
// TYPES
// =====================

interface Transaction {
  id: string;
  user: {
    name: string;
    email: string;
    id: string;
  };
  course: {
    title: string;
    id: string;
    instructor: string;
  };
  amount: number;
  currency: string;
  fee: number;
  net: number;
  type: "purchase" | "refund";
  status: "completed" | "pending" | "processing" | "failed";
  paymentMethod: string;
  date: string;
  ip: string;
  refundReason?: string;
  failureReason?: string;
}

// Backend GET /payments returns PaymentListDto items; userEmail is present on the
// wire but missing from the frontend PaymentDto interface, so widen it here.
type BackendPayment = PaymentDto & { userEmail?: string };

const mapStatus = (status: string): Transaction["status"] => {
  switch (status) {
    case "Completed":
    case "Refunded":
    case "PartiallyRefunded":
      return "completed";
    case "Failed":
      return "failed";
    case "Pending":
    default:
      return "pending";
  }
};

/** Backend stores amounts in the smallest currency unit (cents/agorot). */
const toMajorUnits = (amount: number) => amount / 100;

const mapPaymentToTransaction = (p: BackendPayment, subscriptionLabel: string): Transaction => {
  const isRefund = p.type === "Refund" || p.status === "Refunded" || p.status === "PartiallyRefunded";
  const amount = toMajorUnits(p.amount);
  return {
    id: p.lahzaReference || p.id,
    user: {
      name: p.userName || "—",
      email: p.userEmail || "",
      id: p.userId || "",
    },
    course: {
      title: p.courseTitle || (p.type === "Subscription" ? subscriptionLabel : "—"),
      id: p.courseId || "",
      instructor: "—",
    },
    amount,
    currency: p.currency,
    fee: 0,
    net: isRefund ? -amount : amount,
    type: isRefund ? "refund" : "purchase",
    status: mapStatus(p.status),
    paymentMethod: p.lahzaReference ? "Lahza" : "—",
    date: p.paidAt || p.createdAt,
    ip: "—",
  };
};

// =====================
// HELPERS
// =====================

const formatCurrency = (value: number, currency?: string) => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency ?? ""}`.trim();
  }
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

const getStatusIcon = (status: Transaction["status"]) => {
  switch (status) {
    case "completed":
      return CheckCircle;
    case "pending":
      return Clock;
    case "processing":
      return RefreshCw;
    case "failed":
      return XCircle;
  }
};

const getStatusColor = (status: Transaction["status"]) => {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-600";
    case "pending":
      return "bg-amber-500/10 text-amber-600";
    case "processing":
      return "bg-blue-500/10 text-blue-600";
    case "failed":
      return "bg-red-500/10 text-red-600";
  }
};

// =====================
// COMPONENT
// =====================

export function FinanceTransactionsPage() {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const [searchParams] = useSearchParams();

  // Translated status labels
  const getStatusLabel = (status: Transaction["status"]) => {
    switch (status) {
      case "completed":
        return t('admin:finance.transactions.status.completed');
      case "pending":
        return t('admin:finance.transactions.status.pending');
      case "processing":
        return t('admin:finance.transactions.status.processing');
      case "failed":
        return t('admin:finance.transactions.status.failed');
    }
  };

  const getTypeLabel = (type: Transaction["type"]) =>
    type === "purchase"
      ? t('admin:finance.transactions.types.purchase')
      : t('admin:finance.transactions.types.refund');

  // Filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Data state
  const [rawPayments, setRawPayments] = useState<BackendPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await paymentService.getAllPayments(1, 100);
      setRawPayments((result.items ?? []) as BackendPayment[]);
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const subscriptionLabel = t('admin:finance.transactions.subscriptionItem', { defaultValue: 'Subscription' });

  const transactions = useMemo(
    () => rawPayments.map((p) => mapPaymentToTransaction(p, subscriptionLabel)),
    [rawPayments, subscriptionLabel]
  );

  // Course filter options derived from the loaded payments
  const courseOptions = useMemo(() => {
    const titles = Array.from(
      new Set(transactions.map((txn) => txn.course.title).filter((title) => title && title !== "—"))
    ).sort();
    return [
      { id: "all", label: t('admin:finance.transactions.filters.allCourses') },
      ...titles.map((title) => ({ id: title, label: title })),
    ];
  }, [transactions, t]);

  // UI state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      // Search
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        txn.id.toLowerCase().includes(searchLower) ||
        txn.user.name.toLowerCase().includes(searchLower) ||
        txn.user.email.toLowerCase().includes(searchLower) ||
        txn.course.title.toLowerCase().includes(searchLower);

      // Type
      const matchesType = typeFilter === "all" || txn.type === typeFilter;

      // Status
      const matchesStatus = statusFilter === "all" || txn.status === statusFilter;

      // Course
      const matchesCourse = courseFilter === "all" || txn.course.title === courseFilter;

      // Date range
      let matchesDate = true;
      if (dateFrom) {
        matchesDate = matchesDate && new Date(txn.date) >= new Date(dateFrom);
      }
      if (dateTo) {
        matchesDate = matchesDate && new Date(txn.date) <= new Date(dateTo + "T23:59:59");
      }

      return matchesSearch && matchesType && matchesStatus && matchesCourse && matchesDate;
    });
  }, [transactions, searchQuery, typeFilter, statusFilter, courseFilter, dateFrom, dateTo]);

  // Statistics
  const stats = useMemo(() => {
    const purchases = filteredTransactions.filter((txn) => txn.type === "purchase" && txn.status === "completed");
    const refunds = filteredTransactions.filter((txn) => txn.type === "refund");
    return {
      total: filteredTransactions.length,
      totalRevenue: purchases.reduce((sum, txn) => sum + txn.amount, 0),
      totalRefunds: refunds.reduce((sum, txn) => sum + txn.amount, 0),
      pending: filteredTransactions.filter((txn) => txn.status === "pending").length,
    };
  }, [filteredTransactions]);

  // Currency for aggregated stats (payments share the platform currency)
  const statsCurrency = transactions[0]?.currency;

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setCourseFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  // Filter configurations
  const filters: FilterConfig[] = [
    {
      key: "type",
      label: t('admin:finance.transactions.filters.type'),
      options: [
        { id: "all", label: t('admin:finance.transactions.filters.allTypes') },
        { id: "purchase", label: t('admin:finance.transactions.filters.purchase'), icon: ArrowUpRight },
        { id: "refund", label: t('admin:finance.transactions.filters.refund'), icon: ArrowDownRight },
      ],
      value: typeFilter,
      onChange: setTypeFilter,
    },
    {
      key: "status",
      label: t('admin:finance.transactions.filters.status'),
      options: [
        { id: "all", label: t('admin:finance.transactions.filters.allStatuses') },
        { id: "completed", label: t('admin:finance.transactions.filters.completed') },
        { id: "pending", label: t('admin:finance.transactions.filters.pending') },
        { id: "processing", label: t('admin:finance.transactions.filters.processing') },
        { id: "failed", label: t('admin:finance.transactions.filters.failed') },
      ],
      value: statusFilter,
      onChange: setStatusFilter,
    },
  ];

  // Table columns
  const columns: Column<Transaction>[] = [
    {
      key: "id",
      header: t('admin:finance.transactions.columns.transaction'),
      sortable: true,
      render: (txn) => <span className="font-mono text-xs">{txn.id}</span>,
    },
    {
      key: "user",
      header: t('admin:finance.transactions.columns.customer'),
      sortable: true,
      render: (txn) => (
        <div>
          <p className="font-medium">{txn.user.name}</p>
          <p className="text-xs text-muted-foreground">{txn.user.email}</p>
        </div>
      ),
    },
    {
      key: "course",
      header: t('admin:finance.transactions.columns.course'),
      render: (txn) => (
        <p className="font-medium truncate max-w-[200px]">{txn.course.title}</p>
      ),
    },
    {
      key: "amount",
      header: t('admin:finance.transactions.columns.amount'),
      sortable: true,
      className: "text-end",
      render: (txn) => (
        <span
          className={cn(
            "font-semibold",
            txn.type === "refund" ? "text-red-500" : "text-emerald-500"
          )}
        >
          {txn.type === "refund" ? "-" : "+"}
          {formatCurrency(txn.amount, txn.currency)}
        </span>
      ),
    },
    {
      key: "type",
      header: t('admin:finance.transactions.columns.type'),
      render: (txn) => {
        const Icon = txn.type === "purchase" ? ArrowUpRight : ArrowDownRight;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              txn.type === "purchase"
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-red-500/10 text-red-600"
            )}
          >
            <Icon className="h-3 w-3" />
            {getTypeLabel(txn.type)}
          </span>
        );
      },
    },
    {
      key: "status",
      header: t('admin:finance.transactions.columns.status'),
      render: (txn) => {
        const StatusIcon = getStatusIcon(txn.status);
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              getStatusColor(txn.status)
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {getStatusLabel(txn.status)}
          </span>
        );
      },
    },
    {
      key: "date",
      header: t('admin:finance.transactions.columns.date'),
      sortable: true,
      render: (txn) => (
        <div>
          <p className="text-sm">{formatDate(txn.date)}</p>
          <p className="text-xs text-muted-foreground">{formatTime(txn.date)}</p>
        </div>
      ),
    },
  ];

  // Row actions
  const rowActions: RowAction<Transaction>[] = [
    {
      label: t('admin:finance.transactions.actions.viewDetails'),
      icon: Eye,
      onClick: (txn) => setSelectedTransaction(txn),
    },
    {
      label: t('admin:finance.transactions.actions.issueRefund'),
      icon: RotateCcw,
      onClick: (txn) => toast.info(t('admin:finance.transactions.toasts.refundFlow', { id: txn.id })),
      show: (txn) => txn.type === "purchase" && txn.status === "completed",
    },
    {
      label: t('admin:finance.transactions.actions.downloadReceipt'),
      icon: FileText,
      onClick: () => toast.info(t('admin:finance.transactions.toasts.downloadingReceipt')),
    },
    {
      label: t('admin:finance.transactions.actions.viewAuditTrail'),
      icon: History,
      onClick: () => toast.info(t('admin:finance.transactions.toasts.openingAuditTrail')),
    },
  ];

  // Detail modal sections
  const getDetailSections = (txn: Transaction) => [
    {
      items: [
        { label: t('admin:finance.transactions.detail.fields.transactionId'), value: <span className="font-mono text-xs">{txn.id}</span> },
        { label: t('admin:finance.transactions.detail.fields.dateTime'), value: formatDateTime(txn.date) },
        { label: t('admin:finance.transactions.detail.fields.type'), value: getTypeLabel(txn.type) },
      ],
    },
    {
      title: t('admin:finance.transactions.detail.sections.customerDetails'),
      items: [
        { label: t('admin:finance.transactions.detail.fields.name'), value: txn.user.name },
        { label: t('admin:finance.transactions.detail.fields.email'), value: txn.user.email },
        { label: t('admin:finance.transactions.detail.fields.ipAddress'), value: <span className="font-mono text-xs">{txn.ip}</span> },
      ],
    },
    {
      title: t('admin:finance.transactions.detail.sections.courseDetails'),
      items: [
        { label: t('admin:finance.transactions.detail.fields.course'), value: txn.course.title },
        { label: t('admin:finance.transactions.detail.fields.instructor'), value: txn.course.instructor },
      ],
    },
    {
      title: t('admin:finance.transactions.detail.sections.paymentDetails'),
      items: [
        { label: t('admin:finance.transactions.detail.fields.paymentMethod'), value: txn.paymentMethod },
        ...(txn.refundReason ? [{ label: t('admin:finance.transactions.detail.fields.refundReason'), value: txn.refundReason }] : []),
        ...(txn.failureReason
          ? [
              {
                label: t('admin:finance.transactions.detail.fields.failureReason'),
                value: <span className="text-red-500">{txn.failureReason}</span>,
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin:finance.transactions.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('admin:finance.transactions.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const headers = [
                t('admin:finance.transactions.csvHeaders.id'),
                t('admin:finance.transactions.csvHeaders.user'),
                t('admin:finance.transactions.csvHeaders.email'),
                t('admin:finance.transactions.csvHeaders.course'),
                t('admin:finance.transactions.csvHeaders.instructor'),
                t('admin:finance.transactions.csvHeaders.amount'),
                t('admin:finance.transactions.csvHeaders.fee'),
                t('admin:finance.transactions.csvHeaders.net'),
                t('admin:finance.transactions.csvHeaders.type'),
                t('admin:finance.transactions.csvHeaders.status'),
                t('admin:finance.transactions.csvHeaders.date'),
                t('admin:finance.transactions.csvHeaders.paymentMethod'),
              ];
              const rows = filteredTransactions.map((txn) => [
                txn.id,
                txn.user.name,
                txn.user.email,
                txn.course.title,
                txn.course.instructor,
                txn.amount.toFixed(2),
                txn.fee.toFixed(2),
                txn.net.toFixed(2),
                txn.type,
                txn.status,
                formatDateTime(txn.date),
                txn.paymentMethod,
              ]);
              const escape = (v: string) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
              const csv = [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(a.href);
              toast.success(t('admin:finance.transactions.exportSuccess'), { description: t('admin:finance.transactions.exportSuccessDesc') });
            }}
          >
            <Download className="h-4 w-4" />
            {t('admin:finance.transactions.export')}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t('admin:finance.transactions.stats.totalTransactions')}</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t('admin:finance.transactions.stats.revenue')}</p>
          <p className="text-2xl font-bold text-emerald-500">{formatCurrency(stats.totalRevenue, statsCurrency)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t('admin:finance.transactions.stats.refunds')}</p>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(stats.totalRefunds, statsCurrency)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t('admin:finance.transactions.stats.pending')}</p>
          <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        searchPlaceholder={t('admin:finance.transactions.searchPlaceholder')}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        dateRange={{
          from: dateFrom,
          to: dateTo,
          onFromChange: setDateFrom,
          onToChange: setDateTo,
        }}
        onClearAll={clearFilters}
        showAdvancedFilters
        advancedFilters={
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('admin:finance.transactions.filters.course')}</label>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
      />

      {/* Data Table */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t('common:loading')}</span>
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-2 text-sm text-destructive">{loadError}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void loadPayments()}>
            {t('common:retry', { defaultValue: 'Retry' })}
          </Button>
        </div>
      ) : (
        <DataTable
          data={filteredTransactions}
          columns={columns}
          keyExtractor={(txn) => txn.id}
          rowActions={rowActions}
          onRowClick={(txn) => setSelectedTransaction(txn)}
          emptyIcon={CreditCard}
          emptyMessage={t('admin:finance.transactions.empty.message')}
          emptyAction={
            <Button variant="link" size="sm" onClick={clearFilters}>
              {t('admin:finance.transactions.empty.clearFilters')}
            </Button>
          }
          pageSize={10}
        />
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <DetailModal
          open={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          title={t('admin:finance.transactions.detail.title')}
          icon={CreditCard}
          badge={{
            label: getStatusLabel(selectedTransaction.status) ?? selectedTransaction.status,
            variant:
              selectedTransaction.status === "completed"
                ? "success"
                : selectedTransaction.status === "pending"
                ? "warning"
                : selectedTransaction.status === "failed"
                ? "error"
                : "info",
          }}
          headerContent={
            <DetailAmount
              label={t('admin:finance.transactions.detail.amountLabel')}
              amount={`${selectedTransaction.type === "refund" ? "-" : "+"}${formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}`}
              variant={selectedTransaction.type === "refund" ? "error" : "success"}
            />
          }
          sections={getDetailSections(selectedTransaction)}
          actions={
            <>
              {selectedTransaction.type === "purchase" && selectedTransaction.status === "completed" && (
                <Button variant="outline" size="sm" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {t('admin:finance.transactions.actions.issueRefund')}
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                {t('admin:finance.transactions.actions.downloadReceipt')}
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <History className="h-4 w-4" />
                {t('admin:finance.transactions.actions.auditTrail')}
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
