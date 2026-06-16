import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  Download,
  Eye,
  Send,
  Ban,
  FileText,
  History,
  Wallet,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  DollarSign,
  Calendar,
} from "lucide-react";
import { cn } from "../../../lib/cn";
import { Button } from "../../../components/ui/button";
import {
  FilterBar,
  DataTable,
  DetailModal,
  DetailCard,
  DetailTimeline,
  type Column,
  type RowAction,
  type FilterConfig,
} from "../../../components/admin/finance";
import { toast } from "sonner";
import { DemoDataBadge } from "../../../components/admin/finance/DemoDataBadge";

// =====================
// TYPES
// =====================

interface PayoutCourse {
  id: string;
  title: string;
  earnings: number;
  enrollments: number;
}

interface Payout {
  id: string;
  instructor: {
    name: string;
    email: string;
    avatar: string;
    bankAccount: string;
    paymentMethod: string;
  };
  amount: number;
  platformFee: number;
  netAmount: number;
  courses: PayoutCourse[];
  period: string;
  status: "pending" | "processing" | "completed" | "on_hold";
  createdAt: string;
  scheduledDate: string;
  processedAt?: string;
  completedAt?: string;
}

// =====================
// MOCK DATA
// =====================

const MOCK_PAYOUTS: Payout[] = [
  {
    id: "PAY-2026-001",
    instructor: {
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@email.com",
      avatar: "SJ",
      bankAccount: "•••• 4521",
      paymentMethod: "Bank Transfer",
    },
    amount: 4250.00,
    platformFee: 850.00,
    netAmount: 3400.00,
    courses: [
      { id: "CRS001", title: "Advanced React Patterns", earnings: 2450.00, enrollments: 45 },
      { id: "CRS007", title: "TypeScript Masterclass", earnings: 1800.00, enrollments: 32 },
    ],
    period: "Jan 1 - Jan 15, 2026",
    status: "pending",
    createdAt: "2026-01-16T00:00:00Z",
    scheduledDate: "2026-01-20T00:00:00Z",
  },
  {
    id: "PAY-2026-002",
    instructor: {
      name: "Prof. Michael Chen",
      email: "m.chen@email.com",
      avatar: "MC",
      bankAccount: "•••• 7890",
      paymentMethod: "PayPal",
    },
    amount: 3180.00,
    platformFee: 636.00,
    netAmount: 2544.00,
    courses: [
      { id: "CRS003", title: "DevOps & Cloud Computing", earnings: 1890.00, enrollments: 28 },
      { id: "CRS006", title: "Node.js Backend Masterclass", earnings: 1290.00, enrollments: 19 },
    ],
    period: "Jan 1 - Jan 15, 2026",
    status: "pending",
    createdAt: "2026-01-16T00:00:00Z",
    scheduledDate: "2026-01-20T00:00:00Z",
  },
  {
    id: "PAY-2026-003",
    instructor: {
      name: "Dr. Emily Watson",
      email: "e.watson@email.com",
      avatar: "EW",
      bankAccount: "•••• 3456",
      paymentMethod: "Bank Transfer",
    },
    amount: 2890.00,
    platformFee: 578.00,
    netAmount: 2312.00,
    courses: [
      { id: "CRS002", title: "Machine Learning Fundamentals", earnings: 2890.00, enrollments: 38 },
    ],
    period: "Jan 1 - Jan 15, 2026",
    status: "processing",
    createdAt: "2026-01-15T00:00:00Z",
    scheduledDate: "2026-01-18T00:00:00Z",
    processedAt: "2026-01-18T10:30:00Z",
  },
  {
    id: "PAY-2026-004",
    instructor: {
      name: "Jennifer White",
      email: "j.white@email.com",
      avatar: "JW",
      bankAccount: "•••• 1234",
      paymentMethod: "Bank Transfer",
    },
    amount: 1560.00,
    platformFee: 312.00,
    netAmount: 1248.00,
    courses: [
      { id: "CRS004", title: "UI/UX Design Principles", earnings: 1560.00, enrollments: 22 },
    ],
    period: "Dec 16 - Dec 31, 2025",
    status: "completed",
    createdAt: "2026-01-01T00:00:00Z",
    scheduledDate: "2026-01-05T00:00:00Z",
    processedAt: "2026-01-05T14:00:00Z",
    completedAt: "2026-01-05T14:00:00Z",
  },
  {
    id: "PAY-2026-005",
    instructor: {
      name: "Dr. Lisa Park",
      email: "l.park@email.com",
      avatar: "LP",
      bankAccount: "•••• 5678",
      paymentMethod: "PayPal",
    },
    amount: 2100.00,
    platformFee: 420.00,
    netAmount: 1680.00,
    courses: [
      { id: "CRS005", title: "Python for Data Science", earnings: 2100.00, enrollments: 30 },
    ],
    period: "Dec 16 - Dec 31, 2025",
    status: "completed",
    createdAt: "2026-01-01T00:00:00Z",
    scheduledDate: "2026-01-05T00:00:00Z",
    processedAt: "2026-01-05T14:15:00Z",
    completedAt: "2026-01-05T14:15:00Z",
  },
  {
    id: "PAY-2026-006",
    instructor: {
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@email.com",
      avatar: "SJ",
      bankAccount: "•••• 4521",
      paymentMethod: "Bank Transfer",
    },
    amount: 3890.00,
    platformFee: 778.00,
    netAmount: 3112.00,
    courses: [
      { id: "CRS001", title: "Advanced React Patterns", earnings: 2200.00, enrollments: 40 },
      { id: "CRS007", title: "TypeScript Masterclass", earnings: 1690.00, enrollments: 28 },
    ],
    period: "Dec 16 - Dec 31, 2025",
    status: "completed",
    createdAt: "2026-01-01T00:00:00Z",
    scheduledDate: "2026-01-05T00:00:00Z",
    processedAt: "2026-01-05T14:30:00Z",
    completedAt: "2026-01-05T14:30:00Z",
  },
  {
    id: "PAY-2026-007",
    instructor: {
      name: "Dr. Alan Turing",
      email: "a.turing@email.com",
      avatar: "AT",
      bankAccount: "•••• 9999",
      paymentMethod: "Bank Transfer",
    },
    amount: 1850.00,
    platformFee: 370.00,
    netAmount: 1480.00,
    courses: [
      { id: "CRS007", title: "Data Structures & Algorithms", earnings: 1850.00, enrollments: 25 },
    ],
    period: "Jan 1 - Jan 15, 2026",
    status: "on_hold",
    createdAt: "2026-01-16T00:00:00Z",
    scheduledDate: "2026-01-20T00:00:00Z",
  },
];

// =====================
// HELPERS
// =====================

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const getStatusIcon = (status: Payout["status"]) => {
  switch (status) {
    case "completed":
      return CheckCircle;
    case "pending":
      return Clock;
    case "processing":
      return AlertCircle;
    case "on_hold":
      return Ban;
  }
};

const getStatusColor = (status: Payout["status"]) => {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-600";
    case "pending":
      return "bg-amber-500/10 text-amber-600";
    case "processing":
      return "bg-blue-500/10 text-blue-600";
    case "on_hold":
      return "bg-red-500/10 text-red-600";
  }
};

// =====================
// COMPONENT
// =====================

export function FinancePayoutsPage() {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const [searchParams] = useSearchParams();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // UI state
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);

  // Translated status labels
  const getStatusLabel = (status: Payout["status"]) => {
    switch (status) {
      case "completed":
        return t('admin:finance.payouts.status.completed');
      case "pending":
        return t('admin:finance.payouts.status.pending');
      case "processing":
        return t('admin:finance.payouts.status.processing');
      case "on_hold":
        return t('admin:finance.payouts.status.onHold');
    }
  };

  // Filter payouts
  const filteredPayouts = useMemo(() => {
    return MOCK_PAYOUTS.filter((payout) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        payout.id.toLowerCase().includes(searchLower) ||
        payout.instructor.name.toLowerCase().includes(searchLower) ||
        payout.instructor.email.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === "all" || payout.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const pending = MOCK_PAYOUTS.filter((p) => p.status === "pending");
    const processing = MOCK_PAYOUTS.filter((p) => p.status === "processing");
    const completed = MOCK_PAYOUTS.filter((p) => p.status === "completed");
    const onHold = MOCK_PAYOUTS.filter((p) => p.status === "on_hold");
    
    return {
      pendingTotal: pending.reduce((sum, p) => sum + p.netAmount, 0),
      pendingCount: pending.length,
      processingTotal: processing.reduce((sum, p) => sum + p.netAmount, 0),
      processingCount: processing.length,
      completedTotal: completed.reduce((sum, p) => sum + p.netAmount, 0),
      completedCount: completed.length,
      onHoldTotal: onHold.reduce((sum, p) => sum + p.netAmount, 0),
      onHoldCount: onHold.length,
      uniqueInstructors: [...new Set(MOCK_PAYOUTS.map((p) => p.instructor.email))].length,
    };
  }, []);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  // Bulk actions
  const selectAllPending = () => {
    const pendingIds = MOCK_PAYOUTS.filter((p) => p.status === "pending").map((p) => p.id);
    setSelectedIds(pendingIds);
  };

  const handleBulkProcess = () => {
    if (selectedIds.length === 0) return;
    toast.success(t('admin:finance.payouts.toasts.processingCount', { count: selectedIds.length }), {
      description: t('admin:finance.payouts.toasts.processingCountDesc'),
    });
    setSelectedIds([]);
  };

  // Filter configurations
  const filters: FilterConfig[] = [
    {
      key: "status",
      label: t('admin:finance.payouts.filterLabels.status'),
      options: [
        { id: "all", label: t('admin:finance.payouts.status.all') },
        { id: "pending", label: t('admin:finance.payouts.status.pending') },
        { id: "processing", label: t('admin:finance.payouts.status.processing') },
        { id: "completed", label: t('admin:finance.payouts.status.completed') },
        { id: "on_hold", label: t('admin:finance.payouts.status.onHold') },
      ],
      value: statusFilter,
      onChange: setStatusFilter,
    },
  ];

  // Table columns
  const columns: Column<Payout>[] = [
    {
      key: "instructor",
      header: t('admin:finance.payouts.columns.instructor'),
      sortable: true,
      render: (payout) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
            {payout.instructor.avatar}
          </div>
          <div className="min-w-0">
            <p className="font-medium">{payout.instructor.name}</p>
            <p className="text-xs text-muted-foreground">
              {payout.courses.length} {payout.courses.length === 1 ? t('admin:finance.payouts.instructorMeta.courseSingular') : t('admin:finance.payouts.instructorMeta.coursePlural')} • {payout.instructor.paymentMethod}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "period",
      header: t('admin:finance.payouts.columns.period'),
      render: (payout) => (
        <div>
          <p className="text-sm font-medium">{payout.period.split(" - ")[0]}</p>
          <p className="text-xs text-muted-foreground">{t('admin:finance.payouts.periodTo', { date: payout.period.split(" - ")[1] })}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: t('admin:finance.payouts.columns.gross'),
      sortable: true,
      className: "text-end",
      render: (payout) => (
        <div className="text-end">
          <p className="font-semibold">{formatCurrency(payout.amount)}</p>
          <p className="text-xs text-muted-foreground">{t('admin:finance.payouts.feeLine', { amount: formatCurrency(payout.platformFee) })}</p>
        </div>
      ),
    },
    {
      key: "netAmount",
      header: t('admin:finance.payouts.columns.netPayout'),
      sortable: true,
      className: "text-end",
      render: (payout) => (
        <p className="text-lg font-bold text-emerald-500">{formatCurrency(payout.netAmount)}</p>
      ),
    },
    {
      key: "status",
      header: t('admin:finance.payouts.columns.status'),
      className: "text-center",
      render: (payout) => {
        const StatusIcon = getStatusIcon(payout.status);
        return (
          <div className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                getStatusColor(payout.status)
              )}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {getStatusLabel(payout.status)}
            </span>
            {payout.status === "pending" && (
              <span className="text-[10px] text-muted-foreground">{t('admin:finance.payouts.dueOn', { date: formatDate(payout.scheduledDate) })}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "action",
      header: t('admin:finance.payouts.columns.quickAction'),
      className: "text-center",
      render: (payout) => (
        <div className="flex justify-center">
          {payout.status === "pending" && (
            <Button
              size="sm"
              className="h-9 px-4 gap-2 shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                toast.success(t('admin:finance.payouts.toasts.processingSingle', { id: payout.id }), {
                  description: t('admin:finance.payouts.toasts.processingSingleDesc', { amount: formatCurrency(payout.netAmount), name: payout.instructor.name }),
                });
              }}
            >
              <Send className="h-4 w-4" />
              {t('admin:finance.payouts.actions.processNow')}
            </Button>
          )}
          {payout.status === "on_hold" && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 gap-2 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
              onClick={(e) => {
                e.stopPropagation();
                toast.success(t('admin:finance.payouts.toasts.releasingHold', { id: payout.id }));
              }}
            >
              <CheckCircle className="h-4 w-4" />
              {t('admin:finance.payouts.actions.releaseHold')}
            </Button>
          )}
          {payout.status === "completed" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-4 gap-2 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                toast.info(t('admin:finance.payouts.toasts.downloadingReceipt'));
              }}
            >
              <Download className="h-4 w-4" />
              {t('admin:finance.payouts.actions.receipt')}
            </Button>
          )}
          {payout.status === "processing" && (
            <div className="flex items-center gap-2 text-blue-500">
              <AlertCircle className="h-4 w-4 animate-pulse" />
              <span className="text-xs font-medium">{t('admin:finance.payouts.actions.processing')}</span>
            </div>
          )}
        </div>
      ),
    },
  ];

  // Row actions
  const rowActions: RowAction<Payout>[] = [
    {
      label: t('admin:finance.payouts.actions.viewDetails'),
      icon: Eye,
      onClick: (payout) => setSelectedPayout(payout),
    },
    {
      label: t('admin:finance.payouts.actions.processNow'),
      icon: Send,
      onClick: (payout) => toast.success(t('admin:finance.payouts.toasts.processingSingle', { id: payout.id })),
      show: (payout) => payout.status === "pending",
    },
    {
      label: t('admin:finance.payouts.actions.holdPayout'),
      icon: Ban,
      onClick: (payout) => toast.info(t('admin:finance.payouts.toasts.holdingPayout', { id: payout.id })),
      show: (payout) => payout.status === "pending",
    },
    {
      label: t('admin:finance.payouts.actions.releaseHold'),
      icon: CheckCircle,
      onClick: (payout) => toast.success(t('admin:finance.payouts.toasts.releasingHold', { id: payout.id })),
      show: (payout) => payout.status === "on_hold",
    },
    {
      label: t('admin:finance.payouts.actions.downloadReceipt'),
      icon: FileText,
      onClick: () => toast.info(t('admin:finance.payouts.toasts.downloadingReceipt')),
      show: (payout) => payout.status === "completed",
    },
    {
      label: t('admin:finance.payouts.actions.viewHistory'),
      icon: History,
      onClick: () => toast.info(t('admin:finance.payouts.toasts.openingHistory')),
    },
  ];

  // Get timeline items for detail modal
  const getTimelineItems = (payout: Payout) => {
    const items = [
      {
        label: t('admin:finance.payouts.detail.timeline.created'),
        value: formatDate(payout.createdAt),
        completed: true,
      },
      {
        label: t('admin:finance.payouts.detail.timeline.scheduled'),
        value: formatDate(payout.scheduledDate),
        completed: payout.status !== "pending" && payout.status !== "on_hold",
        active: payout.status === "pending",
      },
    ];

    if (payout.processedAt) {
      items.push({
        label: t('admin:finance.payouts.detail.timeline.processed'),
        value: formatDate(payout.processedAt),
        completed: !!payout.completedAt,
        active: payout.status === "processing",
      });
    }

    if (payout.completedAt) {
      items.push({
        label: t('admin:finance.payouts.detail.timeline.completed'),
        value: formatDate(payout.completedAt),
        completed: true,
        active: false,
      });
    }

    return items;
  };

  // Detail modal sections
  const getDetailSections = (payout: Payout) => [
    {
      title: t('admin:finance.payouts.detail.sections.payoutInformation'),
      items: [
        { label: t('admin:finance.payouts.detail.fields.payoutId'), value: <span className="font-mono text-xs">{payout.id}</span> },
        { label: t('admin:finance.payouts.detail.fields.period'), value: payout.period },
        { label: t('admin:finance.payouts.detail.fields.paymentMethod'), value: payout.instructor.paymentMethod },
        { label: t('admin:finance.payouts.detail.fields.account'), value: payout.instructor.bankAccount },
      ],
    },
    {
      title: t('admin:finance.payouts.detail.sections.amountBreakdown'),
      items: [
        { label: t('admin:finance.payouts.detail.fields.grossEarnings'), value: formatCurrency(payout.amount) },
        { label: t('admin:finance.payouts.detail.fields.platformFee'), value: <span className="text-red-500">-{formatCurrency(payout.platformFee)}</span> },
        { label: t('admin:finance.payouts.detail.fields.netPayout'), value: <span className="text-emerald-500 font-bold">{formatCurrency(payout.netAmount)}</span> },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">{t('admin:finance.payouts.title')} <DemoDataBadge /></h1>
          <p className="text-sm text-muted-foreground">
            {t('admin:finance.payouts.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button size="sm" className="gap-2" onClick={handleBulkProcess}>
              <Send className="h-4 w-4" />
              {t('admin:finance.payouts.bulkProcess', { count: selectedIds.length })}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => toast.info(t('admin:finance.payouts.exportingPayouts'))}
          >
            <Download className="h-4 w-4" />
            {t('admin:finance.payouts.export')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin:finance.payouts.stats.pending')}</p>
              <p className="text-xl font-bold">{formatCurrency(stats.pendingTotal)}</p>
              <p className="text-xs text-muted-foreground">{t('admin:finance.payouts.stats.payouts', { count: stats.pendingCount })}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <AlertCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin:finance.payouts.stats.processing')}</p>
              <p className="text-xl font-bold">{formatCurrency(stats.processingTotal)}</p>
              <p className="text-xs text-muted-foreground">{t('admin:finance.payouts.stats.payouts', { count: stats.processingCount })}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin:finance.payouts.stats.paidThisMonth')}</p>
              <p className="text-xl font-bold">{formatCurrency(stats.completedTotal)}</p>
              <p className="text-xs text-muted-foreground">{t('admin:finance.payouts.stats.payouts', { count: stats.completedCount })}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('admin:finance.payouts.stats.activeInstructors')}</p>
              <p className="text-xl font-bold">{stats.uniqueInstructors}</p>
              <p className="text-xs text-muted-foreground">{t('admin:finance.payouts.stats.withEarnings')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <FilterBar
          searchPlaceholder={t('admin:finance.payouts.searchPlaceholder')}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onClearAll={clearFilters}
        />
        {stats.pendingCount > 0 && (
          <Button variant="outline" size="sm" onClick={selectAllPending} className="h-10">
            {t('admin:finance.payouts.selectAllPending', { count: stats.pendingCount })}
          </Button>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        data={filteredPayouts}
        columns={columns}
        keyExtractor={(payout) => payout.id}
        rowActions={rowActions}
        onRowClick={(payout) => setSelectedPayout(payout)}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        emptyIcon={Wallet}
        emptyMessage={t('admin:finance.payouts.empty.message')}
        emptyAction={
          <Button variant="link" size="sm" onClick={clearFilters}>
            {t('admin:finance.payouts.empty.clearFilters')}
          </Button>
        }
        pageSize={10}
      />

      {/* Payout Detail Modal */}
      {selectedPayout && (
        <DetailModal
          open={!!selectedPayout}
          onClose={() => setSelectedPayout(null)}
          title={t('admin:finance.payouts.detail.title')}
          icon={Wallet}
          badge={{
            label: getStatusLabel(selectedPayout.status),
            variant:
              selectedPayout.status === "completed"
                ? "success"
                : selectedPayout.status === "pending"
                ? "warning"
                : selectedPayout.status === "on_hold"
                ? "error"
                : "info",
          }}
          headerContent={
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                {selectedPayout.instructor.avatar}
              </div>
              <div>
                <p className="font-medium">{selectedPayout.instructor.name}</p>
                <p className="text-xs text-muted-foreground">{selectedPayout.instructor.email}</p>
              </div>
            </div>
          }
          sections={getDetailSections(selectedPayout)}
          size="lg"
          actions={
            <>
              {selectedPayout.status === "pending" && (
                <>
                  <Button size="sm" className="gap-2" onClick={() => {
                    toast.success(t('admin:finance.payouts.toasts.processingSingle', { id: selectedPayout.id }));
                    setSelectedPayout(null);
                  }}>
                    <Send className="h-4 w-4" />
                    {t('admin:finance.payouts.actions.processPayout')}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Ban className="h-4 w-4" />
                    {t('admin:finance.payouts.actions.hold')}
                  </Button>
                </>
              )}
              {selectedPayout.status === "completed" && (
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  {t('admin:finance.payouts.actions.downloadReceipt')}
                </Button>
              )}
            </>
          }
        />
      )}
    </div>
  );
}
