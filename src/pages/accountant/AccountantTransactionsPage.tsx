import { motion } from "framer-motion";
import { Download, Filter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";

type RowType = "Sale" | "Refund" | "Fee" | "Chargeback";
type RowStatus = "settled" | "pending" | "review";
type RowWhenKind = "today" | "yesterday" | "onDate";

const ROWS: {
  id: string;
  party: string;
  amount: number;
  type: RowType;
  status: RowStatus;
  when: { kind: RowWhenKind; value?: string };
}[] = [
  { id: "TXN-9821", party: "Amira H.", amount: 129.0, type: "Sale", status: "settled", when: { kind: "today", value: "09:12" } },
  { id: "TXN-9820", party: "Leo K.", amount: 79.99, type: "Refund", status: "pending", when: { kind: "today", value: "08:44" } },
  { id: "TXN-9819", party: "Nora S.", amount: 199.0, type: "Sale", status: "settled", when: { kind: "yesterday" } },
  { id: "TXN-9818", party: "Omar F.", amount: 49.0, type: "Fee", status: "settled", when: { kind: "yesterday" } },
  { id: "TXN-9817", party: "Rina M.", amount: 0, type: "Chargeback", status: "review", when: { kind: "onDate", value: "Mar 22" } },
];

export function AccountantTransactionsPage() {
  const { t } = useTranslation(['admin', 'common', 'errors']);

  const typeLabel = (type: RowType) => {
    switch (type) {
      case "Sale":
        return t('admin:accountant.transactions.types.sale');
      case "Refund":
        return t('admin:accountant.transactions.types.refund');
      case "Fee":
        return t('admin:accountant.transactions.types.fee');
      case "Chargeback":
        return t('admin:accountant.transactions.types.chargeback');
    }
  };

  const statusLabel = (status: RowStatus) => {
    switch (status) {
      case "settled":
        return t('admin:accountant.transactions.statuses.settled');
      case "pending":
        return t('admin:accountant.transactions.statuses.pending');
      case "review":
        return t('admin:accountant.transactions.statuses.review');
    }
  };

  const whenLabel = (when: { kind: RowWhenKind; value?: string }) => {
    switch (when.kind) {
      case "today":
        return t('admin:accountant.transactions.when.today', { time: when.value ?? "" });
      case "yesterday":
        return t('admin:accountant.transactions.when.yesterday');
      case "onDate":
        return t('admin:accountant.transactions.when.onDate', { date: when.value ?? "" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin:accountant.transactions.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('admin:accountant.transactions.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            {t('admin:accountant.transactions.filters')}
          </Button>
          <Button size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            {t('admin:accountant.transactions.exportCsv')}
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>{t('admin:accountant.transactions.recentActivity')}</CardTitle>
            <CardDescription>{t('admin:accountant.transactions.recentActivityDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin:accountant.transactions.columns.reference')}</TableHead>
                  <TableHead>{t('admin:accountant.transactions.columns.counterparty')}</TableHead>
                  <TableHead className="text-end">{t('admin:accountant.transactions.columns.amount')}</TableHead>
                  <TableHead>{t('admin:accountant.transactions.columns.type')}</TableHead>
                  <TableHead>{t('admin:accountant.transactions.columns.status')}</TableHead>
                  <TableHead className="text-end">{t('admin:accountant.transactions.columns.when')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROWS.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell>{r.party}</TableCell>
                    <TableCell className="text-end tabular-nums">
                      {r.amount === 0 ? "—" : `$${r.amount.toFixed(2)}`}
                    </TableCell>
                    <TableCell>{typeLabel(r.type)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "settled"
                            ? "secondary"
                            : r.status === "pending"
                              ? "outline"
                              : "destructive"
                        }
                      >
                        {statusLabel(r.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end text-muted-foreground text-sm">{whenLabel(r.when)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
