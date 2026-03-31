import { motion } from "framer-motion";
import { CheckCircle2, Clock, Send } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

const BATCHES = [
  { id: "PAY-2026-03-A", instructors: 14, amount: "$18,240", status: "scheduled", date: "Mar 25" },
  { id: "PAY-2026-02-B", instructors: 22, amount: "$31,880", status: "sent", date: "Feb 28" },
  { id: "PAY-2026-02-A", instructors: 19, amount: "$28,102", status: "sent", date: "Feb 14" },
];

export function AccountantPayoutsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Instructor payouts</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Review batches before release, confirm amounts, and keep a clear payout history.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Next run", value: "Mar 25", sub: "Auto-scheduled" },
          { label: "On hold", value: "$0", sub: "No blocks" },
          { label: "Avg. processing", value: "1.2d", sub: "From submission" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardDescription>{s.label}</CardDescription>
                <CardTitle className="text-2xl">{s.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payout batches</CardTitle>
            <CardDescription>Operational view — not wired to live payroll yet.</CardDescription>
          </div>
          <Button size="sm" className="gap-2">
            <Send className="h-4 w-4" />
            New batch
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {BATCHES.map((b) => (
            <div
              key={b.id}
              className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-sm font-semibold">{b.id}</p>
                <p className="text-sm text-muted-foreground">
                  {b.instructors} instructors · {b.date}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold tabular-nums">{b.amount}</span>
                <Badge
                  variant={b.status === "sent" ? "secondary" : "default"}
                  className="gap-1"
                >
                  {b.status === "sent" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {b.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
