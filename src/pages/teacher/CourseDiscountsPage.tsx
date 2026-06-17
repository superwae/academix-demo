import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Tag,
  ArrowLeft,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { cn } from "../../lib/cn";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { discountService, type DiscountDto } from "../../services/discountService";
import { formatMoney } from "../../lib/money";

const emptyForm = {
  code: "",
  type: "Percentage" as "Percentage" | "FixedAmount",
  value: "",
  startsAt: "",
  expiresAt: "",
  maxUses: "",
  isActive: true,
};

const toUtcDateTime = (date: string) => (date ? `${date}T00:00:00.000Z` : undefined);

export function CourseDiscountsPage() {
  const { t } = useTranslation(['teacher', 'common', 'errors']);
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [discounts, setDiscounts] = useState<DiscountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountDto | null>(null);
  const [deleteDiscount, setDeleteDiscount] = useState<DiscountDto | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchDiscounts = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const result = await discountService.getCourseDiscounts(courseId);
      setDiscounts(result);
    } catch (error) {
      console.error("Failed to fetch discounts:", error);
      toast.error(t('teacher:discounts.errors.loadFailed'), {
        description: error instanceof Error ? error.message : t('teacher:shared.errorOccurred'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, [courseId]);

  const openCreateDialog = () => {
    setEditingDiscount(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (discount: DiscountDto) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code ?? "",
      type: discount.type,
      value: String(discount.value),
      startsAt: discount.startsAt ? discount.startsAt.split("T")[0] : "",
      expiresAt: discount.expiresAt ? discount.expiresAt.split("T")[0] : "",
      maxUses: discount.maxUses != null ? String(discount.maxUses) : "",
      isActive: discount.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setSaving(true);

    const payload = {
      courseId,
      code: formData.code,
      type: formData.type,
      value: parseFloat(formData.value) || 0,
      startsAt: toUtcDateTime(formData.startsAt),
      expiresAt: toUtcDateTime(formData.expiresAt),
      maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
      isActive: formData.isActive,
    };

    try {
      if (editingDiscount) {
        await discountService.updateDiscount(editingDiscount.id, payload);
        toast.success(t('teacher:discounts.toasts.updated'));
      } else {
        await discountService.createDiscount(payload);
        toast.success(t('teacher:discounts.toasts.created'));
      }
      setDialogOpen(false);
      fetchDiscounts();
    } catch (error) {
      toast.error(editingDiscount ? t('teacher:discounts.errors.updateFailed') : t('teacher:discounts.errors.createFailed'), {
        description: error instanceof Error ? error.message : t('teacher:shared.errorOccurred'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (discount: DiscountDto) => {
    try {
      await discountService.deleteDiscount(discount.id);
      toast.success(t('teacher:discounts.toasts.deleted', { code: discount.code }));
      setDiscounts((prev) => prev.filter((d) => d.id !== discount.id));
    } catch (error) {
      toast.error(t('teacher:discounts.errors.deleteFailed'), {
        description: error instanceof Error ? error.message : t('teacher:shared.errorOccurred'),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('teacher:discounts.pageTitle')}</h1>
            <p className="mt-1 text-muted-foreground">
              {t('teacher:discounts.pageSubtitle')}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="me-2 h-4 w-4" />
          {t('teacher:discounts.createDiscount')}
        </Button>
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
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('teacher:discounts.columns.code')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('teacher:discounts.columns.type')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('teacher:discounts.columns.value')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('teacher:discounts.columns.dates')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('teacher:discounts.columns.usage')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('teacher:discounts.columns.status')}</th>
                <th className="px-4 py-3 text-end text-sm font-medium text-muted-foreground">{t('teacher:discounts.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {discounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Tag className="h-8 w-8 text-muted-foreground/50" />
                      <p>{t('teacher:discounts.emptyState')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                discounts.map((discount) => (
                  <tr key={discount.id} className="bg-card hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium">{discount.code}</span>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{discount.type}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {discount.type === "Percentage"
                        ? `${discount.value}%`
                        : formatMoney(discount.value)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {discount.startsAt
                        ? new Date(discount.startsAt).toLocaleDateString()
                        : t('teacher:discounts.noStart')}{" "}
                      -{" "}
                      {discount.expiresAt
                        ? new Date(discount.expiresAt).toLocaleDateString()
                        : t('teacher:discounts.noEnd')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {discount.usedCount}
                      {discount.maxUses != null && ` / ${discount.maxUses}`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          discount.isActive
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            discount.isActive ? "bg-emerald-500" : "bg-red-500"
                          )}
                        />
                        {discount.isActive ? t('teacher:discounts.active') : t('teacher:discounts.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => openEditDialog(discount)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t('common:edit')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-destructive hover:text-destructive"
                          onClick={() => setDeleteDiscount(discount)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDiscount ? t('teacher:discounts.editDiscount') : t('teacher:discounts.createDiscount')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discountCode">{t('teacher:discounts.form.codeRequired')}</Label>
              <Input
                id="discountCode"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                placeholder={t('teacher:discounts.form.codePlaceholder')}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discountType">{t('teacher:discounts.form.typeRequired')}</Label>
                <SelectRoot
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as "Percentage" | "FixedAmount" })
                  }
                >
                  <SelectTrigger id="discountType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Percentage">{t('teacher:discounts.percentage')}</SelectItem>
                    <SelectItem value="FixedAmount">{t('teacher:discounts.fixedAmount')}</SelectItem>
                  </SelectContent>
                </SelectRoot>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {formData.type === "Percentage" ? t('teacher:discounts.form.valuePercent') : t('teacher:discounts.form.valueDollar')}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  min="0"
                  step={formData.type === "Percentage" ? "1" : "0.01"}
                  max={formData.type === "Percentage" ? "100" : undefined}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.type === "Percentage" ? "20" : "10.00"}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">{t('teacher:discounts.form.startDate')}</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">{t('teacher:discounts.form.endDate')}</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxUses">{t('teacher:discounts.form.maxUses')}</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="0"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder={t('teacher:discounts.unlimited')}
                />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label htmlFor="discountActive">{t('teacher:discounts.active')}</Label>
                <Switch
                  id="discountActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('common:cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t('common:saving') : editingDiscount ? t('teacher:discounts.updateDiscount') : t('teacher:discounts.createDiscount')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDiscount !== null}
        onOpenChange={(open) => { if (!open) setDeleteDiscount(null); }}
        title={t('teacher:discounts.deleteDiscount')}
        description={t('teacher:discounts.deleteConfirmDetailed', { code: deleteDiscount?.code ?? '' })}
        confirmLabel={t('common:delete')}
        variant="destructive"
        onConfirm={() => {
          if (deleteDiscount) return handleDelete(deleteDiscount);
        }}
      />
    </div>
  );
}
