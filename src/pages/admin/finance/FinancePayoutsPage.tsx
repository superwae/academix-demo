import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // UI state
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);

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
    toast.success(`Processing ${selectedIds.length} payouts`, {
      description: "Payouts will be sent to instructors",
    });
    setSelectedIds([]);
  };

  // Filter configurations
  const filters: FilterConfig[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { id: "all", label: "All Statuses" },
        { id: "pending", label: "Pending" },
        { id: "processing", label: "Processing" },
        { id: "completed", label: "Completed" },
        { id: "on_hold", label: "On Hold" },
      ],
      value: statusFilter,
      onChange: setStatusFilter,
    },
  ];

  // Table columns
  const columns: Column<Payout>[] = [
    {
      key: "instructor",
      header: "Instructor",
      sortable: true,
      render: (payout) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
            {payout.instructor.avatar}
          </div>
          <div className="min-w-0">
            <p className="font-medium">{payout.instructor.name}</p>
            <p className="text-xs text-muted-foreground">
              {payout.courses.length} {payout.courses.length === 1 ? "course" : "courses"} • {payout.instructor.paymentMethod}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (payout) => (
        <div>
          <p className="text-sm font-medium">{payout.period.split(" - ")[0]}</p>
          <p className="text-xs text-muted-foreground">to {payout.period.split(" - ")[1]}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Gross",
      sortable: true,
      className: "text-right",
      render: (payout) => (
        <div className="text-right">
          <p className="font-semibold">{formatCurrency(payout.amount)}</p>
          <p className="text-xs text-muted-foreground">-{formatCurrency(payout.platformFee)} fee</p>
        </div>
      ),
    },
    {
      key: "netAmount",
      header: "Net Payout",
      sortable: true,
      className: "text-right",
      render: (payout) => (
        <p className="text-lg font-bold text-emerald-500">{formatCurrency(payout.netAmount)}</p>
      ),
    },
    {
      key: "status",
      header: "Status",
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
              {payout.status === "on_hold" ? "On Hold" : payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
            </span>
            {payout.status === "pending" && (
              <span className="text-[10px] text-muted-foreground">Due {formatDate(payout.scheduledDate)}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "action",
      header: "Quick Action",
      className: "text-center",
      render: (payout) => (
        <div className="flex justify-center">
          {payout.status === "pending" && (
            <Button
              size="sm"
              className="h-9 px-4 gap-2 shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                toast.success(`Processing ${payout.id}`, {
                  description: `Sending ${formatCurrency(payout.netAmount)} to ${payout.instructor.name}`,
                });
              }}
            >
              <Send className="h-4 w-4" />
              Process Now
            </Button>
          )}
          {payout.status === "on_hold" && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 gap-2 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
              onClick={(e) => {
                e.stopPropagation();
                toast.success(`Releasing hold on ${payout.id}`);
              }}
            >
              <CheckCircle className="h-4 w-4" />
              Release Hold
            </Button>
          )}
          {payout.status === "completed" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-4 gap-2 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                toast.info("Downloading receipt...");
              }}
            >
              <Download className="h-4 w-4" />
              Receipt
            </Button>
          )}
          {payout.status === "processing" && (
            <div className="flex items-center gap-2 text-blue-500">
              <AlertCircle className="h-4 w-4 animate-pulse" />
              <span className="text-xs font-medium">Processing...</span>
            </div>
          )}
        </div>
      ),
    },
  ];

  // Row actions
  const rowActions: RowAction<Payout>[] = [
    {
      label: "View Details",
      icon: Eye,
      onClick: (payout) => setSelectedPayout(payout),
    },
    {
      label: "Process Now",
      icon: Send,
      onClick: (payout) => toast.success(`Processing ${payout.id}`),
      show: (payout) => payout.status === "pending",
    },
    {
      label: "Hold Payout",
      icon: Ban,
      onClick: (payout) => toast.info(`Holding ${payout.id}`),
      show: (payout) => payout.status === "pending",
    },
    {
      label: "Release Hold",
      icon: CheckCircle,
      onClick: (payout) => toast.success(`Releasing hold on ${payout.id}`),
      show: (payout) => payout.status === "on_hold",
    },
    {
      label: "Download Receipt",
      icon: FileText,
      onClick: () => toast.info("Downloading receipt..."),
      show: (payout) => payout.status === "completed",
    },
    {
      label: "View History",
      icon: History,
      onClick: () => toast.info("Opening history..."),
    },
  ];

  // Get timeline items for detail modal
  const getTimelineItems = (payout: Payout) => {
    const items = [
      {
        label: "Created",
        value: formatDate(payout.createdAt),
        completed: true,
      },
      {
        label: "Scheduled",
        value: formatDate(payout.scheduledDate),
        completed: payout.status !== "pending" && payout.status !== "on_hold",
        active: payout.status === "pending",
      },
    ];

    if (payout.processedAt) {
      items.push({
        label: "Processed",
        value: formatDate(payout.processedAt),
        completed: !!payout.completedAt,
        active: payout.status === "processing",
      });
    }

    if (payout.completedAt) {
      items.push({
        label: "Completed",
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
      title: "Payout Information",
      items: [
        { label: "Payout ID", value: <span className="font-mono text-xs">{payout.id}</span> },
        { label: "Period", value: payout.period },
        { label: "Payment Method", value: payout.instructor.paymentMethod },
        { label: "Account", value: payout.instructor.bankAccount },
      ],
    },
    {
      title: "Amount Breakdown",
      items: [
        { label: "Gross Earnings", value: formatCurrency(payout.amount) },
        { label: "Platform Fee (20%)", value: <span className="text-red-500">-{formatCurrency(payout.platformFee)}</span> },
        { label: "Net Payout", value: <span className="text-emerald-500 font-bold">{formatCurrency(payout.netAmount)}</span> },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
          <p className="text-sm text-muted-foreground">
            Manage instructor payment disbursements
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button size="sm" className="gap-2" onClick={handleBulkProcess}>
              <Send className="h-4 w-4" />
              Process {selectedIds.length} Payouts
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => toast.info("Exporting payouts...")}
          >
            <Download className="h-4 w-4" />
            Export
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
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-xl font-bold">{formatCurrency(stats.pendingTotal)}</p>
              <p className="text-xs text-muted-foreground">{stats.pendingCount} payouts</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <AlertCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Processing</p>
              <p className="text-xl font-bold">{formatCurrency(stats.processingTotal)}</p>
              <p className="text-xs text-muted-foreground">{stats.processingCount} payouts</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid This Month</p>
              <p className="text-xl font-bold">{formatCurrency(stats.completedTotal)}</p>
              <p className="text-xs text-muted-foreground">{stats.completedCount} payouts</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Instructors</p>
              <p className="text-xl font-bold">{stats.uniqueInstructors}</p>
              <p className="text-xs text-muted-foreground">With earnings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <FilterBar
          searchPlaceholder="Search by instructor or payout ID..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onClearAll={clearFilters}
        />
        {stats.pendingCount > 0 && (
          <Button variant="outline" size="sm" onClick={selectAllPending} className="h-10">
            Select All Pending ({stats.pendingCount})
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
        emptyMessage="No payouts found"
        emptyAction={
          <Button variant="link" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        }
        pageSize={10}
      />

      {/* Payout Detail Modal */}
      {selectedPayout && (
        <DetailModal
          open={!!selectedPayout}
          onClose={() => setSelectedPayout(null)}
          title="Payout Details"
          icon={Wallet}
          badge={{
            label: selectedPayout.status === "on_hold" ? "On Hold" : selectedPayout.status.charAt(0).toUpperCase() + selectedPayout.status.slice(1),
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
                    toast.success(`Processing ${selectedPayout.id}`);
                    setSelectedPayout(null);
                  }}>
                    <Send className="h-4 w-4" />
                    Process Payout
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Ban className="h-4 w-4" />
                    Hold
                  </Button>
                </>
              )}
              {selectedPayout.status === "completed" && (
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Receipt
                </Button>
              )}
            </>
          }
        />
      )}
    </div>
  );
}
