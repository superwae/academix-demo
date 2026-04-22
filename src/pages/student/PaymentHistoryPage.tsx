import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { toast } from "sonner";
import { paymentService, type PaymentDto } from "../../services/paymentService";

export function PaymentHistoryPage() {
  const { t } = useTranslation(['student', 'common', 'errors']);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const result = await paymentService.getMyPayments(currentPage, pageSize);
        setPayments(result.items);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
      } catch (error) {
        console.error("Failed to fetch payments:", error);
        toast.error(t('student:payments.errors.loadFailed'), {
          description: error instanceof Error ? error.message : t('student:payments.errors.unknownError'),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [currentPage, t]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
      case "completed":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "failed":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('student:payments.title')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('student:payments.subtitle', { count: totalCount })}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('student:payments.columnDate')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('student:payments.columnCourse')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('student:payments.columnAmount')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('student:payments.columnStatus')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('student:payments.columnReference')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <CreditCard className="h-8 w-8 text-muted-foreground/50" />
                      <p>{t('student:payments.noPayments')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="bg-card hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{payment.courseTitle}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {payment.currency} {payment.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                          getStatusBadge(payment.status)
                        )}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                      {payment.lahzaReference}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('student:payments.showing', {
              start: (currentPage - 1) * pageSize + 1,
              end: Math.min(currentPage * pageSize, totalCount),
              total: totalCount,
            })}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="rounded-lg p-2 hover:bg-accent disabled:opacity-50"
              aria-label={t('student:payments.previous')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm">
              {t('student:payments.page', { current: currentPage, total: totalPages })}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="rounded-lg p-2 hover:bg-accent disabled:opacity-50"
              aria-label={t('student:payments.next')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
