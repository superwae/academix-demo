import { motion } from "framer-motion";
import { Download, FileSpreadsheet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

export function AccountantReportsPage() {
  const { t } = useTranslation(["admin"]);

  const REPORTS = [
    {
      title: t("admin:accountant.reports.items.monthlyRevenueTitle"),
      desc: t("admin:accountant.reports.items.monthlyRevenueDesc"),
      period: t("admin:accountant.reports.items.monthlyRevenuePeriod"),
    },
    {
      title: t("admin:accountant.reports.items.instructorLiabilityTitle"),
      desc: t("admin:accountant.reports.items.instructorLiabilityDesc"),
      period: t("admin:accountant.reports.items.instructorLiabilityPeriod"),
    },
    {
      title: t("admin:accountant.reports.items.taxExportTitle"),
      desc: t("admin:accountant.reports.items.taxExportDesc"),
      period: t("admin:accountant.reports.items.taxExportPeriod"),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("admin:accountant.reports.title")}</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          {t("admin:accountant.reports.subtitle")}
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
                  {t("admin:accountant.reports.pdf")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-border/60 border-dashed">
        <CardHeader>
          <CardTitle>{t("admin:accountant.reports.builderTitle")}</CardTitle>
          <CardDescription>
            {t("admin:accountant.reports.builderDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-muted/40 p-8 text-center text-sm text-muted-foreground">
            {t("admin:accountant.reports.builderPlaceholder")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
