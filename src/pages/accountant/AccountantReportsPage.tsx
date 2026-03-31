import { motion } from "framer-motion";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

const REPORTS = [
  {
    title: "Monthly revenue summary",
    desc: "Platform fees, gross sales, refunds.",
    period: "March 2026",
  },
  {
    title: "Instructor liability",
    desc: "Accrued vs paid — by region.",
    period: "Q1 2026",
  },
  {
    title: "Tax export (VAT)",
    desc: "Line-level transactions for filing.",
    period: "Feb 2026",
  },
];

export function AccountantReportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & exports</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Packaged views for auditors and regulators. Wire these to your reporting engine when ready.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {REPORTS.map((r, i) => (
          <motion.div
            key={r.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="border-border/60 h-full flex flex-col">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg leading-snug">{r.title}</CardTitle>
                <CardDescription>{r.desc}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">{r.period}</span>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-border/60 border-dashed">
        <CardHeader>
          <CardTitle>Custom report builder</CardTitle>
          <CardDescription>
            Coming soon — drag dimensions, filters, and saved schedules for recurring exports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            Placeholder for advanced reporting builder.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
