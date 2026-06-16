import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, RefreshCw } from "lucide-react";
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
import { paymentService, type PaymentDto } from "../../services/paymentService";
import { formatMoney } from "../../lib/money";
import { format } from "date-fns";

export function AccountantTransactionsPage() {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await paymentService.getAllPayments(1, 100);
      setPayments(result.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors:generic', { defaultValue: 'Something went wrong' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const statusVariant = (status: PaymentDto['status']) =>
    status === 'Completed' ? 'secondary' : status === 'Pending' ? 'outline' : 'destructive';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin:accountant.transactions.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('admin:accountant.transactions.subtitle')}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          {t('common:refresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>{t('admin:accountant.transactions.recentActivity')}</CardTitle>
            <CardDescription>{t('admin:accountant.transactions.recentActivityDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive py-6 text-center">{error}</p>
            ) : payments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t('admin:finance.noTransactions', { defaultValue: 'No transactions yet.' })}
              </p>
            ) : (
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
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">
                        {p.lahzaReference ? `${p.lahzaReference.slice(0, 14)}…` : p.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="truncate">{p.userName || '—'}</div>
                          {p.courseTitle ? (
                            <div className="text-xs text-muted-foreground truncate">{p.courseTitle}</div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatMoney(p.amount / 100, p.currency || 'ILS')}
                      </TableCell>
                      <TableCell>{p.type}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                      </TableCell>
                      <TableCell className="text-end text-muted-foreground text-sm">
                        {format(new Date(p.paidAt || p.createdAt), 'PP p')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
