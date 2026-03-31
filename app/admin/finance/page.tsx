"use client";

import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  Column,
  ChartCard,
} from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import {
  mockTransactions,
  monthlyRevenueData,
  Transaction,
} from "@/lib/admin/mockData";
import { cn } from "@/lib/cn";

export default function FinancePage() {
  const [transactions] = useState<Transaction[]>(mockTransactions);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("all");

  const filteredTransactions = transactions.filter((tx) => {
    if (filterStatus !== "all" && tx.status !== filterStatus) return false;
    if (filterPaymentMethod !== "all" && tx.paymentMethod !== filterPaymentMethod)
      return false;
    return true;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);

  // Calculate stats
  const stats = {
    totalRevenue: transactions
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + t.amount, 0),
    pendingPayouts: transactions
      .filter((t) => t.status === "pending")
      .reduce((sum, t) => sum + t.amount, 0),
    refunded: transactions
      .filter((t) => t.status === "refunded")
      .reduce((sum, t) => sum + t.amount, 0),
    avgTransactionValue:
      transactions.length > 0
        ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
        : 0,
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { status: "success" as const, label: "Completed" };
      case "pending":
        return { status: "pending" as const, label: "Pending" };
      case "failed":
        return { status: "error" as const, label: "Failed" };
      case "refunded":
        return { status: "warning" as const, label: "Refunded" };
      default:
        return { status: "default" as const, label: status };
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "credit_card":
        return "💳";
      case "paypal":
        return "🅿️";
      case "bank_transfer":
        return "🏦";
      default:
        return "💰";
    }
  };

  const formatPaymentMethod = (method: string) => {
    return method
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const columns: Column<Transaction>[] = [
    {
      key: "id",
      header: "Transaction",
      render: (tx) => (
        <div>
          <p className="font-mono text-sm font-medium">#{tx.id.toUpperCase()}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(tx.createdAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      ),
    },
    {
      key: "userName",
      header: "Customer",
      sortable: true,
      render: (tx) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {tx.userName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <span>{tx.userName}</span>
        </div>
      ),
    },
    {
      key: "courseTitle",
      header: "Course",
      render: (tx) => (
        <span className="text-muted-foreground">{tx.courseTitle}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (tx) => (
        <span className="font-medium">{formatCurrency(tx.amount)}</span>
      ),
    },
    {
      key: "paymentMethod",
      header: "Method",
      render: (tx) => (
        <div className="flex items-center gap-2">
          <span>{getPaymentMethodIcon(tx.paymentMethod)}</span>
          <span className="text-sm text-muted-foreground">
            {formatPaymentMethod(tx.paymentMethod)}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (tx) => {
        const config = getStatusConfig(tx.status);
        return <StatusBadge status={config.status} label={config.label} />;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Revenue, transactions, and payout management"
      >
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync
        </Button>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </PageHeader>

      {/* Revenue Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <DollarSign className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="flex items-center gap-1 text-sm text-emerald-500">
              <ArrowUpRight className="h-4 w-4" />
              <span>+12.5%</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <Wallet className="h-6 w-6 text-amber-500" />
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Processing</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold">{formatCurrency(stats.pendingPayouts)}</p>
            <p className="text-sm text-muted-foreground">Pending Payouts</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
              <ArrowDownRight className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex items-center gap-1 text-sm text-red-500">
              <span>-2.3%</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold">{formatCurrency(stats.refunded)}</p>
            <p className="text-sm text-muted-foreground">Refunded</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <TrendingUp className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex items-center gap-1 text-sm text-blue-500">
              <ArrowUpRight className="h-4 w-4" />
              <span>+5.8%</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold">
              {formatCurrency(stats.avgTransactionValue)}
            </p>
            <p className="text-sm text-muted-foreground">Avg. Transaction</p>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <ChartCard
        title="Revenue Trend"
        description="Monthly revenue over the past 7 months"
        actions={[
          { label: "Export CSV", onClick: () => console.log("Export") },
          { label: "View Detailed Report", onClick: () => console.log("Report") },
        ]}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyRevenueData}>
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
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Transactions Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Methods</option>
                <option value="credit_card">Credit Card</option>
                <option value="paypal">PayPal</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>
        </div>

        <DataTable
          data={filteredTransactions}
          columns={columns}
          searchable
          searchPlaceholder="Search transactions..."
          searchKeys={["userName", "courseTitle"]}
          pageSize={10}
          emptyMessage="No transactions found"
        />
      </div>

      {/* Payment Gateway Integration Notice */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <CreditCard className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h4 className="font-semibold text-amber-500">
              Payment Gateway Integration
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your payment gateway (Stripe, PayPal, or others) to enable
              real-time transaction processing and automatic payouts.
            </p>
            <Button variant="outline" size="sm" className="mt-4">
              Configure Payment Gateway
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
