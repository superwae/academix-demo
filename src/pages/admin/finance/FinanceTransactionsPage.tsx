import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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

// =====================
// MOCK DATA
// =====================

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "TXN-2026-001234",
    user: { name: "James Taylor", email: "james.taylor@email.com", id: "USR001" },
    course: { title: "Advanced React Patterns", id: "CRS001", instructor: "Dr. Sarah Johnson" },
    amount: 99.99,
    fee: 9.99,
    net: 90.00,
    type: "purchase",
    status: "completed",
    paymentMethod: "Visa •••• 4242",
    date: "2026-01-19T08:45:00Z",
    ip: "192.168.1.100",
  },
  {
    id: "TXN-2026-001233",
    user: { name: "Michelle Garcia", email: "m.garcia@email.com", id: "USR002" },
    course: { title: "Machine Learning Fundamentals", id: "CRS002", instructor: "Dr. Emily Watson" },
    amount: 149.99,
    fee: 14.99,
    net: 135.00,
    type: "purchase",
    status: "completed",
    paymentMethod: "Mastercard •••• 5555",
    date: "2026-01-19T07:30:00Z",
    ip: "203.45.67.89",
  },
  {
    id: "TXN-2026-001232",
    user: { name: "Robert Martinez", email: "r.martinez@email.com", id: "USR003" },
    course: { title: "DevOps & Cloud Computing", id: "CRS003", instructor: "Prof. Michael Chen" },
    amount: 99.99,
    fee: 0,
    net: -99.99,
    type: "refund",
    status: "completed",
    paymentMethod: "Visa •••• 1234",
    date: "2026-01-18T16:00:00Z",
    ip: "10.0.0.1",
    refundReason: "Course content not as expected",
  },
  {
    id: "TXN-2026-001231",
    user: { name: "Sarah Chen", email: "s.chen@email.com", id: "USR004" },
    course: { title: "UI/UX Design Principles", id: "CRS004", instructor: "Jennifer White" },
    amount: 79.99,
    fee: 7.99,
    net: 72.00,
    type: "purchase",
    status: "pending",
    paymentMethod: "PayPal",
    date: "2026-01-18T14:30:00Z",
    ip: "156.78.90.12",
  },
  {
    id: "TXN-2026-001230",
    user: { name: "Michael Brown", email: "m.brown@email.com", id: "USR005" },
    course: { title: "Python for Data Science", id: "CRS005", instructor: "Dr. Lisa Park" },
    amount: 129.99,
    fee: 12.99,
    net: 117.00,
    type: "purchase",
    status: "completed",
    paymentMethod: "Amex •••• 9876",
    date: "2026-01-17T10:15:00Z",
    ip: "45.67.89.123",
  },
  {
    id: "TXN-2026-001229",
    user: { name: "Emily Johnson", email: "e.johnson@email.com", id: "USR006" },
    course: { title: "Advanced React Patterns", id: "CRS001", instructor: "Dr. Sarah Johnson" },
    amount: 99.99,
    fee: 0,
    net: -99.99,
    type: "refund",
    status: "processing",
    paymentMethod: "Visa •••• 7890",
    date: "2026-01-17T09:00:00Z",
    ip: "78.90.12.34",
    refundReason: "Duplicate purchase",
  },
  {
    id: "TXN-2026-001228",
    user: { name: "David Wilson", email: "d.wilson@email.com", id: "USR007" },
    course: { title: "Node.js Backend Masterclass", id: "CRS006", instructor: "Prof. Michael Chen" },
    amount: 119.99,
    fee: 11.99,
    net: 108.00,
    type: "purchase",
    status: "failed",
    paymentMethod: "Visa •••• 3456",
    date: "2026-01-16T15:45:00Z",
    ip: "90.12.34.56",
    failureReason: "Card declined - insufficient funds",
  },
  {
    id: "TXN-2026-001227",
    user: { name: "Lisa Anderson", email: "l.anderson@email.com", id: "USR008" },
    course: { title: "Data Structures & Algorithms", id: "CRS007", instructor: "Dr. Alan Turing" },
    amount: 89.99,
    fee: 8.99,
    net: 81.00,
    type: "purchase",
    status: "completed",
    paymentMethod: "Visa •••• 1111",
    date: "2026-01-16T12:00:00Z",
    ip: "123.45.67.89",
  },
  {
    id: "TXN-2026-001226",
    user: { name: "Kevin Smith", email: "k.smith@email.com", id: "USR009" },
    course: { title: "Mobile App Development", id: "CRS008", instructor: "Jennifer White" },
    amount: 139.99,
    fee: 13.99,
    net: 126.00,
    type: "purchase",
    status: "completed",
    paymentMethod: "Mastercard •••• 2222",
    date: "2026-01-15T18:30:00Z",
    ip: "234.56.78.90",
  },
  {
    id: "TXN-2026-001225",
    user: { name: "Amanda White", email: "a.white@email.com", id: "USR010" },
    course: { title: "Cloud Architecture", id: "CRS009", instructor: "Prof. Michael Chen" },
    amount: 159.99,
    fee: 15.99,
    net: 144.00,
    type: "purchase",
    status: "completed",
    paymentMethod: "PayPal",
    date: "2026-01-15T09:15:00Z",
    ip: "345.67.89.01",
  },
  {
    id: "TXN-2026-001224",
    user: { name: "Brian Davis", email: "b.davis@email.com", id: "USR011" },
    course: { title: "Machine Learning Fundamentals", id: "CRS002", instructor: "Dr. Emily Watson" },
    amount: 149.99,
    fee: 0,
    net: -149.99,
    type: "refund",
    status: "completed",
    paymentMethod: "Visa •••• 3333",
    date: "2026-01-14T14:00:00Z",
    ip: "456.78.90.12",
    refundReason: "Technical issues with course videos",
  },
  {
    id: "TXN-2026-001223",
    user: { name: "Christina Lee", email: "c.lee@email.com", id: "USR012" },
    course: { title: "UI/UX Design Principles", id: "CRS004", instructor: "Jennifer White" },
    amount: 79.99,
    fee: 7.99,
    net: 72.00,
    type: "purchase",
    status: "completed",
    paymentMethod: "Amex •••• 4444",
    date: "2026-01-14T11:30:00Z",
    ip: "567.89.01.23",
  },
];

const COURSE_OPTIONS = [
  { id: "all", label: "All Courses" },
  { id: "CRS001", label: "Advanced React Patterns" },
  { id: "CRS002", label: "Machine Learning Fundamentals" },
  { id: "CRS003", label: "DevOps & Cloud Computing" },
  { id: "CRS004", label: "UI/UX Design Principles" },
  { id: "CRS005", label: "Python for Data Science" },
];

const INSTRUCTOR_OPTIONS = [
  { id: "all", label: "All Instructors" },
  { id: "Dr. Sarah Johnson", label: "Dr. Sarah Johnson" },
  { id: "Dr. Emily Watson", label: "Dr. Emily Watson" },
  { id: "Prof. Michael Chen", label: "Prof. Michael Chen" },
  { id: "Jennifer White", label: "Jennifer White" },
  { id: "Dr. Lisa Park", label: "Dr. Lisa Park" },
];

// =====================
// HELPERS
// =====================

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

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
  const [searchParams] = useSearchParams();

  // Filter state
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [instructorFilter, setInstructorFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // UI state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return MOCK_TRANSACTIONS.filter((txn) => {
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
      const matchesCourse = courseFilter === "all" || txn.course.id === courseFilter;

      // Instructor
      const matchesInstructor =
        instructorFilter === "all" || txn.course.instructor === instructorFilter;

      // Date range
      let matchesDate = true;
      if (dateFrom) {
        matchesDate = matchesDate && new Date(txn.date) >= new Date(dateFrom);
      }
      if (dateTo) {
        matchesDate = matchesDate && new Date(txn.date) <= new Date(dateTo + "T23:59:59");
      }

      return matchesSearch && matchesType && matchesStatus && matchesCourse && matchesInstructor && matchesDate;
    });
  }, [searchQuery, typeFilter, statusFilter, courseFilter, instructorFilter, dateFrom, dateTo]);

  // Statistics
  const stats = useMemo(() => {
    const purchases = filteredTransactions.filter((t) => t.type === "purchase" && t.status === "completed");
    const refunds = filteredTransactions.filter((t) => t.type === "refund");
    return {
      total: filteredTransactions.length,
      totalRevenue: purchases.reduce((sum, t) => sum + t.amount, 0),
      totalRefunds: refunds.reduce((sum, t) => sum + t.amount, 0),
      pending: filteredTransactions.filter((t) => t.status === "pending").length,
    };
  }, [filteredTransactions]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setCourseFilter("all");
    setInstructorFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  // Filter configurations
  const filters: FilterConfig[] = [
    {
      key: "type",
      label: "Type",
      options: [
        { id: "all", label: "All Types" },
        { id: "purchase", label: "Purchase", icon: ArrowUpRight },
        { id: "refund", label: "Refund", icon: ArrowDownRight },
      ],
      value: typeFilter,
      onChange: setTypeFilter,
    },
    {
      key: "status",
      label: "Status",
      options: [
        { id: "all", label: "All Statuses" },
        { id: "completed", label: "Completed" },
        { id: "pending", label: "Pending" },
        { id: "processing", label: "Processing" },
        { id: "failed", label: "Failed" },
      ],
      value: statusFilter,
      onChange: setStatusFilter,
    },
  ];

  // Table columns
  const columns: Column<Transaction>[] = [
    {
      key: "id",
      header: "Transaction",
      sortable: true,
      render: (txn) => <span className="font-mono text-xs">{txn.id}</span>,
    },
    {
      key: "user",
      header: "Customer",
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
      header: "Course",
      render: (txn) => (
        <p className="font-medium truncate max-w-[200px]">{txn.course.title}</p>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      className: "text-right",
      render: (txn) => (
        <span
          className={cn(
            "font-semibold",
            txn.type === "refund" ? "text-red-500" : "text-emerald-500"
          )}
        >
          {txn.type === "refund" ? "-" : "+"}
          {formatCurrency(txn.amount)}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
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
            {txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
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
            {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
          </span>
        );
      },
    },
    {
      key: "date",
      header: "Date",
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
      label: "View Details",
      icon: Eye,
      onClick: (txn) => setSelectedTransaction(txn),
    },
    {
      label: "Issue Refund",
      icon: RotateCcw,
      onClick: (txn) => toast.info(`Refund flow for ${txn.id}`),
      show: (txn) => txn.type === "purchase" && txn.status === "completed",
    },
    {
      label: "Download Receipt",
      icon: FileText,
      onClick: () => toast.info("Downloading receipt..."),
    },
    {
      label: "View Audit Trail",
      icon: History,
      onClick: () => toast.info("Opening audit trail..."),
    },
  ];

  // Detail modal sections
  const getDetailSections = (txn: Transaction) => [
    {
      items: [
        { label: "Transaction ID", value: <span className="font-mono text-xs">{txn.id}</span> },
        { label: "Date & Time", value: formatDateTime(txn.date) },
        { label: "Type", value: txn.type.charAt(0).toUpperCase() + txn.type.slice(1) },
      ],
    },
    {
      title: "Customer Details",
      items: [
        { label: "Name", value: txn.user.name },
        { label: "Email", value: txn.user.email },
        { label: "IP Address", value: <span className="font-mono text-xs">{txn.ip}</span> },
      ],
    },
    {
      title: "Course Details",
      items: [
        { label: "Course", value: txn.course.title },
        { label: "Instructor", value: txn.course.instructor },
      ],
    },
    {
      title: "Payment Details",
      items: [
        { label: "Payment Method", value: txn.paymentMethod },
        ...(txn.refundReason ? [{ label: "Refund Reason", value: txn.refundReason }] : []),
        ...(txn.failureReason
          ? [
              {
                label: "Failure Reason",
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
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            View and manage all payment transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              const headers = ["ID", "User", "Email", "Course", "Instructor", "Amount", "Fee", "Net", "Type", "Status", "Date", "Payment Method"];
              const rows = filteredTransactions.map((t) => [
                t.id,
                t.user.name,
                t.user.email,
                t.course.title,
                t.course.instructor,
                t.amount.toFixed(2),
                t.fee.toFixed(2),
                t.net.toFixed(2),
                t.type,
                t.status,
                formatDateTime(t.date),
                t.paymentMethod,
              ]);
              const escape = (v: string) => (v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
              const csv = [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(a.href);
              toast.success("Transactions exported", { description: "CSV file downloaded." });
            }}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Transactions</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="text-2xl font-bold text-emerald-500">{formatCurrency(stats.totalRevenue)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Refunds</p>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(stats.totalRefunds)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        searchPlaceholder="Search by ID, customer, or course..."
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
              <label className="text-xs font-medium">Course</label>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {COURSE_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Instructor</label>
              <select
                value={instructorFilter}
                onChange={(e) => setInstructorFilter(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {INSTRUCTOR_OPTIONS.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
      />

      {/* Data Table */}
      <DataTable
        data={filteredTransactions}
        columns={columns}
        keyExtractor={(txn) => txn.id}
        rowActions={rowActions}
        onRowClick={(txn) => setSelectedTransaction(txn)}
        emptyIcon={CreditCard}
        emptyMessage="No transactions found"
        emptyAction={
          <Button variant="link" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        }
        pageSize={10}
      />

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <DetailModal
          open={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          title="Transaction Details"
          icon={CreditCard}
          badge={{
            label: selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1),
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
              label="Amount"
              amount={`${selectedTransaction.type === "refund" ? "-" : "+"}${formatCurrency(selectedTransaction.amount)}`}
              variant={selectedTransaction.type === "refund" ? "error" : "success"}
            />
          }
          sections={getDetailSections(selectedTransaction)}
          actions={
            <>
              {selectedTransaction.type === "purchase" && selectedTransaction.status === "completed" && (
                <Button variant="outline" size="sm" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Issue Refund
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Download Receipt
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <History className="h-4 w-4" />
                Audit Trail
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
