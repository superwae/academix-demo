import { motion } from "framer-motion";
import { FileText, Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

const INVOICES = [
  { no: "INV-2026-0142", client: "Bright Minds Academy", total: "$4,200", due: "Apr 02", status: "open" },
  { no: "INV-2026-0141", client: "TechSkills NGO", total: "$890", due: "Mar 28", status: "open" },
  { no: "INV-2026-0138", client: "Northwind Tutors", total: "$12,450", due: "Mar 15", status: "paid" },
];

export function AccountantInvoicesPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            B2B and institutional billing — track what is outstanding and what is closed.
          </p>
        </div>
        <Button className="gap-2 h-9">
          <Plus className="h-4 w-4" />
          Draft invoice
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-3 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
              <p className="text-3xl font-bold tracking-tight">$5,090</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border/60 bg-muted/30 p-6"
        >
          <p className="text-sm font-medium text-muted-foreground">Collected (30d)</p>
          <p className="text-3xl font-bold tracking-tight mt-1">$38,120</p>
          <p className="text-xs text-muted-foreground mt-2">Demo figures for layout preview.</p>
        </motion.div>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Latest invoices</CardTitle>
          <CardDescription>Status and key dates at a glance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {INVOICES.map((inv) => (
            <div
              key={inv.no}
              className="flex flex-col gap-2 rounded-xl border border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-sm font-semibold">{inv.no}</p>
                <p className="text-sm text-muted-foreground">{inv.client}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-semibold tabular-nums">{inv.total}</span>
                <span className="text-xs text-muted-foreground w-24">Due {inv.due}</span>
                <Badge variant={inv.status === "paid" ? "secondary" : "default"}>
                  {inv.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
