import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  FileCheck,
  PieChart,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/cn";

const KPI = [
  {
    label: "Net revenue (MTD)",
    value: "$48,290",
    delta: "+12.4%",
    up: true,
    icon: TrendingUp,
  },
  {
    label: "Pending payouts",
    value: "$6,420",
    delta: "4 batches",
    up: null,
    icon: Banknote,
  },
  {
    label: "Invoices due",
    value: "12",
    delta: "This week",
    up: null,
    icon: Receipt,
  },
  {
    label: "Reconciliation",
    value: "98.2%",
    delta: "Matched",
    up: true,
    icon: FileCheck,
  },
];

const PIPELINE = [
  { stage: "Authorized", amount: "$12,400", count: 18 },
  { stage: "Settled", amount: "$28,910", count: 42 },
  { stage: "Awaiting review", amount: "$6,980", count: 9 },
];

export function AccountantDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold tracking-tight md:text-3xl"
        >
          Finance workspace
        </motion.h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          High-level cash position, settlement health, and what needs your attention today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {k.label}
                </CardTitle>
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <k.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{k.value}</div>
                <p
                  className={cn(
                    "text-xs mt-1 flex items-center gap-1",
                    k.up === true && "text-emerald-600 dark:text-emerald-400",
                    k.up === false && "text-destructive",
                    k.up === null && "text-muted-foreground"
                  )}
                >
                  {k.up === true && <ArrowUpRight className="h-3 w-3" />}
                  {k.up === false && <ArrowDownRight className="h-3 w-3" />}
                  {k.delta}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChart className="h-5 w-5 text-primary" />
              Settlement pipeline
            </CardTitle>
            <CardDescription>Volume by processing stage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {PIPELINE.map((row) => (
              <div
                key={row.stage}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{row.stage}</p>
                  <p className="text-xs text-muted-foreground">{row.count} items</p>
                </div>
                <span className="text-lg font-semibold tabular-nums">{row.amount}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">Compliance checklist</CardTitle>
            <CardDescription>Recurring controls for this period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "VAT export locked for Q1",
              "Instructor payout rates verified",
              "Refund queue reconciled",
              "Chargeback window monitored",
            ].map((item, i) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {i + 1}
                </span>
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
