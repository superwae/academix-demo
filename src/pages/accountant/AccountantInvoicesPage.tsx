import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Download, FileText, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { formatMoney } from "../../lib/money";
import { financeService, type FinanceInvoiceDto, type FinanceInvoiceSummaryDto } from "../../services/financeService";

const toMajor = (amount: number) => amount / 100;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function AccountantInvoicesPage() {
  const { t } = useTranslation(["admin", "common"]);
  const [invoices, setInvoices] = useState<FinanceInvoiceDto[]>([]);
  const [summary, setSummary] = useState<FinanceInvoiceSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadInvoices = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [invoiceResult, summaryResult] = await Promise.all([
        financeService.getInvoices(1, 100),
        financeService.getInvoiceSummary(),
      ]);
      setInvoices(invoiceResult.items ?? []);
      setSummary(summaryResult);
    } catch (error) {
      setLoadError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
  }, []);

  const currency = summary?.currency || "ILS";
  const money = (amount: number) => formatMoney(toMajor(amount), currency);

  const statusLabel = (status: FinanceInvoiceDto["status"]) => {
    switch (status) {
      case "paid":
        return t("admin:accountant.invoices.statuses.paid");
      case "failed":
        return t("admin:finance.transactions.status.failed", { defaultValue: "Failed" });
      case "refunded":
        return t("admin:finance.transactions.types.refund", { defaultValue: "Refunded" });
      case "open":
      default:
        return t("admin:accountant.invoices.statuses.open");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("admin:accountant.invoices.title")}</h1>
          <p className="mt-1 text-muted-foreground">
            {t("admin:accountant.invoices.live.subtitle", { defaultValue: "Invoices generated from real payment records and gateway status." })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 gap-2" onClick={() => void loadInvoices()}>
            <RefreshCw className="h-4 w-4" />
            {t("common:refresh", { defaultValue: "Refresh" })}
          </Button>
          <Button variant="outline" className="h-9 gap-2">
            <Download className="h-4 w-4" />
            {t("admin:finance.transactions.export", { defaultValue: "Export" })}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-3 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("admin:accountant.invoices.outstanding")}</p>
              <p className="text-3xl font-bold tracking-tight">{money(summary?.outstanding ?? 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{summary?.openCount ?? 0} {t("admin:accountant.invoices.statuses.open").toLowerCase()}</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-border/60 bg-muted/30 p-6"
        >
          <p className="text-sm font-medium text-muted-foreground">{t("admin:accountant.invoices.collected30d")}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{money(summary?.collectedLast30Days ?? 0)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{summary?.paidCount ?? 0} {t("admin:accountant.invoices.statuses.paid").toLowerCase()}</p>
        </motion.div>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{t("admin:accountant.invoices.latestTitle")}</CardTitle>
          <CardDescription>{t("admin:accountant.invoices.latestSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border/50 py-12 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {t("common:loading")}
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
              <AlertCircle className="mx-auto h-7 w-7 text-destructive" />
              <p className="mt-2 text-sm text-destructive">{loadError}</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {t("admin:finance.noTransactions", { defaultValue: "No transactions yet." })}
            </div>
          ) : (
            invoices.map((invoice) => (
              <div
                key={invoice.invoiceNumber}
                className="flex flex-col gap-2 rounded-xl border border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-sm font-semibold">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">{invoice.clientName}</p>
                  <p className="text-xs text-muted-foreground">{invoice.item}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold tabular-nums">{formatMoney(toMajor(invoice.total), invoice.currency)}</span>
                  <span className="w-28 text-xs text-muted-foreground">
                    {invoice.status === "paid" && invoice.paidAt
                      ? formatDate(invoice.paidAt)
                      : t("admin:accountant.invoices.dueLabel", { date: formatDate(invoice.dueAt) })}
                  </span>
                  <Badge variant={invoice.status === "paid" ? "secondary" : "default"}>{statusLabel(invoice.status)}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
