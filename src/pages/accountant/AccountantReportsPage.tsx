import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { financeService } from "../../services/financeService";

type ReportId = "monthly-revenue" | "instructor-liability" | "tax-export";

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => {
    const text = String(value);
    return text.includes(",") || text.includes('"') ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = [headers.join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

export function AccountantReportsPage() {
  const { t } = useTranslation(["admin"]);
  const [exporting, setExporting] = useState<ReportId | null>(null);

  const reports: { id: ReportId; title: string; desc: string; period: string }[] = [
    {
      id: "monthly-revenue",
      title: t("admin:accountant.reports.items.monthlyRevenueTitle"),
      desc: t("admin:accountant.reports.items.monthlyRevenueDesc"),
      period: t("admin:accountant.reports.items.monthlyRevenuePeriod"),
    },
    {
      id: "instructor-liability",
      title: t("admin:accountant.reports.items.instructorLiabilityTitle"),
      desc: t("admin:accountant.reports.items.instructorLiabilityDesc"),
      period: t("admin:accountant.reports.items.instructorLiabilityPeriod"),
    },
    {
      id: "tax-export",
      title: t("admin:accountant.reports.items.taxExportTitle"),
      desc: t("admin:accountant.reports.items.taxExportDesc"),
      period: t("admin:accountant.reports.items.taxExportPeriod"),
    },
  ];

  const exportReport = async (id: ReportId) => {
    setExporting(id);
    try {
      if (id === "monthly-revenue") {
        const overview = await financeService.getOverview();
        downloadCsv(
          `monthly-revenue-${new Date().toISOString().slice(0, 10)}.csv`,
          ["period", "periodStart", "revenueMinor", "payoutLiabilityMinor", "refundsMinor", "currency"],
          overview.revenueTrend.map((row) => [row.period, row.periodStart, row.revenue, row.payoutLiability, row.refunds, overview.currency])
        );
      } else if (id === "instructor-liability") {
        const payouts = await financeService.getPayouts(1, 500);
        downloadCsv(
          `instructor-liability-${new Date().toISOString().slice(0, 10)}.csv`,
          ["payoutId", "instructor", "email", "grossMinor", "platformFeeMinor", "organizationShareMinor", "netMinor", "paymentCount", "courseCount", "status"],
          (payouts.items ?? []).map((row) => [
            row.id,
            row.instructorName,
            row.instructorEmail,
            row.grossAmount,
            row.platformFee,
            row.organizationShare,
            row.netAmount,
            row.paymentCount,
            row.courseCount,
            row.status,
          ])
        );
      } else {
        const invoices = await financeService.getInvoices(1, 500);
        downloadCsv(
          `tax-export-${new Date().toISOString().slice(0, 10)}.csv`,
          ["invoiceNumber", "client", "email", "item", "totalMinor", "currency", "status", "issuedAt", "paidAt"],
          (invoices.items ?? []).map((row) => [
            row.invoiceNumber,
            row.clientName,
            row.clientEmail,
            row.item,
            row.total,
            row.currency,
            row.status,
            row.issuedAt,
            row.paidAt ?? "",
          ])
        );
      }
      toast.success(t("admin:reports.toasts.csvDownloaded", { defaultValue: "CSV file downloaded." }));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("admin:accountant.reports.title")}</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">{t("admin:accountant.reports.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {reports.map((report, index) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <Card className="flex h-full flex-col border-border/60">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg leading-snug">{report.title}</CardTitle>
                <CardDescription>{report.desc}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">{report.period}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void exportReport(report.id)}
                  disabled={exporting !== null}
                >
                  {exporting === report.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  CSV
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
