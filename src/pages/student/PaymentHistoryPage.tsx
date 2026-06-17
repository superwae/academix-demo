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
import { ResponsiveTable, type ResponsiveTableColumn } from "../../components/ui/responsive-table";
import { formatMoney } from "../../lib/money";

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
      {loading ? (
        <div className="flex items-center justify-center overflow-hidden rounded-xl border border-border py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        (() => {
          const paymentColumns: ResponsiveTableColumn<PaymentDto>[] = [
            {
              id: 'date',
              header: t('student:payments.columnDate'),
              cell: (payment) => (
                <span className="text-sm">{new Date(payment.createdAt).toLocaleDateString()}</span>
              ),
            },
            {
              id: 'course',
              header: t('student:payments.columnCourse'),
              cell: (payment) => (
                <p className="font-medium">{payment.courseTitle}</p>
              ),
            },
            {
              id: 'amount',
              header: t('student:payments.columnAmount'),
              cell: (payment) => (
                <span className="text-sm font-medium">
                  {formatMoney(payment.amount / 100, payment.currency || 'ILS')}
                </span>
              ),
            },
            {
              id: 'status',
              header: t('student:payments.columnStatus'),
              cell: (payment) => (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                    getStatusBadge(payment.status)
                  )}
                >
                  {payment.status}
                </span>
              ),
            },
            {
              id: 'reference',
              header: t('student:payments.columnReference'),
              hiddenOnMobile: true,
              cell: (payment) => (
                <span className="text-sm text-muted-foreground font-mono">
                  {payment.lahzaReference}
                </span>
              ),
            },
          ];
          return (
            <ResponsiveTable
              data={payments}
              columns={paymentColumns}
              rowKey={(payment) => payment.id}
              empty={
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <CreditCard className="h-8 w-8 text-muted-foreground/50" />
                    <p>{t('student:payments.noPayments')}</p>
                  </div>
                </div>
              }
            />
          );
        })()
      )}

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
