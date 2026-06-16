import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Crown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { cn } from "../../lib/cn";
import { toast } from "sonner";
import { subscriptionPlanService, type SubscriptionPlanDto } from "../../services/subscriptionPlanService";
import { formatMoney } from "../../lib/money";

const emptyForm = {
  name: "",
  description: "",
  monthlyPrice: "",
  yearlyPrice: "",
  maxCourses: "",
  maxSeatsPerCourse: "",
  maxTotalSeats: "",
  sortOrder: "",
  isActive: true,
};

export function SubscriptionPlansPage() {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanDto | null>(null);
  const [deletePlan, setDeletePlan] = useState<SubscriptionPlanDto | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const result = await subscriptionPlanService.getPlans();
      // Guard against setting state after unmount or stale fetch
      if (signal?.aborted) return;
      setPlans(result);
    } catch (error) {
      if (signal?.aborted) return;
      console.error("Failed to fetch plans:", error);
      toast.error(t('admin:subscriptionPlans.errors.loadFailed'), {
        description: error instanceof Error ? error.message : t('admin:subscriptionPlans.errors.errorOccurred'),
      });
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchPlans(controller.signal);
    return () => controller.abort();
  }, []);

  const openCreateDialog = () => {
    setEditingPlan(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (plan: SubscriptionPlanDto) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description ?? "",
      monthlyPrice: String(plan.monthlyPrice),
      yearlyPrice: String(plan.yearlyPrice),
      maxCourses: String(plan.maxCourses ?? ""),
      maxSeatsPerCourse: String(plan.maxSeatsPerCourse ?? ""),
      maxTotalSeats: String(plan.maxTotalSeats ?? ""),
      sortOrder: String(plan.sortOrder),
      isActive: plan.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: formData.name,
      description: formData.description,
      monthlyPrice: parseFloat(formData.monthlyPrice) || 0,
      yearlyPrice: parseFloat(formData.yearlyPrice) || 0,
      maxCourses: parseInt(formData.maxCourses) || 0,
      maxSeatsPerCourse: parseInt(formData.maxSeatsPerCourse) || 0,
      maxTotalSeats: parseInt(formData.maxTotalSeats) || 0,
      sortOrder: parseInt(formData.sortOrder) || 0,
      isActive: formData.isActive,
    };

    try {
      if (editingPlan) {
        await subscriptionPlanService.updatePlan(editingPlan.id, payload);
        toast.success(t('admin:subscriptionPlans.toasts.updated'));
      } else {
        await subscriptionPlanService.createPlan(payload);
        toast.success(t('admin:subscriptionPlans.toasts.created'));
      }
      setDialogOpen(false);
      fetchPlans();
    } catch (error) {
      toast.error(editingPlan ? t('admin:subscriptionPlans.errors.updateFailed') : t('admin:subscriptionPlans.errors.createFailed'), {
        description: error instanceof Error ? error.message : t('admin:subscriptionPlans.errors.errorOccurred'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: SubscriptionPlanDto) => {
    try {
      await subscriptionPlanService.deletePlan(plan.id);
      toast.success(t('admin:subscriptionPlans.toasts.deleted', { name: plan.name }));
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    } catch (error) {
      toast.error(t('admin:subscriptionPlans.errors.deleteFailed'), {
        description: error instanceof Error ? error.message : t('admin:subscriptionPlans.errors.errorOccurred'),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('admin:subscriptionPlans.title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {t('admin:subscriptionPlans.subtitle')}
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="me-2 h-4 w-4" />
          {t('admin:subscriptionPlans.createPlan')}
        </Button>
      </div>

      {/* Plans */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center text-sm text-muted-foreground">
          {t('admin:subscriptionPlans.empty')}
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10">
                      <Crown className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{plan.name}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex flex-none items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      plan.isActive
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        plan.isActive ? "bg-emerald-500" : "bg-red-500"
                      )}
                    />
                    {plan.isActive ? t('admin:users.statusActive') : t('admin:subscriptionPlans.inactive')}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <dt className="text-muted-foreground">{t('admin:subscriptionPlans.table.monthly')}</dt>
                    <dd className="mt-1 font-medium">{formatMoney(plan.monthlyPrice)}{t('admin:subscriptionPlans.perMonth')}</dd>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <dt className="text-muted-foreground">{t('admin:subscriptionPlans.table.yearly')}</dt>
                    <dd className="mt-1 font-medium">{formatMoney(plan.yearlyPrice)}{t('admin:subscriptionPlans.perYear')}</dd>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <dt className="text-muted-foreground">{t('admin:subscriptionPlans.table.courses')}</dt>
                    <dd className="mt-1 font-medium">{plan.maxCourses != null && plan.maxCourses > 0 ? plan.maxCourses : t('admin:subscriptionPlans.unlimited')}</dd>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <dt className="text-muted-foreground">{t('admin:subscriptionPlans.table.totalSeats')}</dt>
                    <dd className="mt-1 font-medium">{plan.maxTotalSeats != null && plan.maxTotalSeats > 0 ? plan.maxTotalSeats : t('admin:subscriptionPlans.unlimited')}</dd>
                  </div>
                  <div className="col-span-2 rounded-lg bg-muted/40 p-3">
                    <dt className="text-muted-foreground">{t('admin:subscriptionPlans.table.seatsPerCourse')}</dt>
                    <dd className="mt-1 font-medium">{plan.maxSeatsPerCourse != null && plan.maxSeatsPerCourse > 0 ? plan.maxSeatsPerCourse : t('admin:subscriptionPlans.unlimited')}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => openEditDialog(plan)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('common:edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => setDeletePlan(plan)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('admin:subscriptionPlans.table.plan')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('admin:subscriptionPlans.table.monthly')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('admin:subscriptionPlans.table.yearly')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('admin:subscriptionPlans.table.courses')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('admin:subscriptionPlans.table.seatsPerCourse')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('admin:subscriptionPlans.table.totalSeats')}</th>
                <th className="px-4 py-3 text-start text-sm font-medium text-muted-foreground">{t('admin:subscriptionPlans.table.status')}</th>
                <th className="px-4 py-3 text-end text-sm font-medium text-muted-foreground">{t('admin:subscriptionPlans.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plans.map((plan) => (
                  <tr key={plan.id} className="bg-card hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Crown className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{plan.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{formatMoney(plan.monthlyPrice)}{t('admin:subscriptionPlans.perMonth')}</td>
                    <td className="px-4 py-3 text-sm">{formatMoney(plan.yearlyPrice)}{t('admin:subscriptionPlans.perYear')}</td>
                    <td className="px-4 py-3 text-sm">{plan.maxCourses != null && plan.maxCourses > 0 ? plan.maxCourses : <span className="text-muted-foreground italic">{t('admin:subscriptionPlans.unlimited')}</span>}</td>
                    <td className="px-4 py-3 text-sm">{plan.maxSeatsPerCourse != null && plan.maxSeatsPerCourse > 0 ? plan.maxSeatsPerCourse : <span className="text-muted-foreground italic">{t('admin:subscriptionPlans.unlimited')}</span>}</td>
                    <td className="px-4 py-3 text-sm">{plan.maxTotalSeats != null && plan.maxTotalSeats > 0 ? plan.maxTotalSeats : <span className="text-muted-foreground italic">{t('admin:subscriptionPlans.unlimited')}</span>}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          plan.isActive
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            plan.isActive ? "bg-emerald-500" : "bg-red-500"
                          )}
                        />
                        {plan.isActive ? t('admin:users.statusActive') : t('admin:subscriptionPlans.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => openEditDialog(plan)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t('common:edit')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-destructive hover:text-destructive"
                          onClick={() => setDeletePlan(plan)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? t('admin:subscriptionPlans.editPlan') : t('admin:subscriptionPlans.createPlan')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="planName">{t('admin:subscriptionPlans.nameLabel')}</Label>
              <Input
                id="planName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('admin:subscriptionPlans.namePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="planDescription">{t('admin:subscriptionPlans.descriptionLabel')}</Label>
              <Input
                id="planDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('admin:subscriptionPlans.descriptionPlaceholder')}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="monthlyPrice">{t('admin:subscriptionPlans.monthlyPriceLabel')}</Label>
                <Input
                  id="monthlyPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthlyPrice}
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearlyPrice">{t('admin:subscriptionPlans.yearlyPriceLabel')}</Label>
                <Input
                  id="yearlyPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.yearlyPrice}
                  onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="maxCourses">{t('admin:subscriptionPlans.maxCoursesLabel')}</Label>
                <Input
                  id="maxCourses"
                  type="number"
                  min="0"
                  value={formData.maxCourses}
                  onChange={(e) => setFormData({ ...formData, maxCourses: e.target.value })}
                  placeholder="10"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxSeatsPerCourse">{t('admin:subscriptionPlans.maxSeatsPerCourseLabel')}</Label>
                <Input
                  id="maxSeatsPerCourse"
                  type="number"
                  min="0"
                  value={formData.maxSeatsPerCourse}
                  onChange={(e) => setFormData({ ...formData, maxSeatsPerCourse: e.target.value })}
                  placeholder="50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTotalSeats">{t('admin:subscriptionPlans.maxTotalSeatsLabel')}</Label>
                <Input
                  id="maxTotalSeats"
                  type="number"
                  min="0"
                  value={formData.maxTotalSeats}
                  onChange={(e) => setFormData({ ...formData, maxTotalSeats: e.target.value })}
                  placeholder="500"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sortOrder">{t('admin:subscriptionPlans.sortOrderLabel')}</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label htmlFor="isActive">{t('admin:subscriptionPlans.activeLabel')}</Label>
                <Switch
                  id="isActive"
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
                {saving ? t('admin:subscriptionPlans.saving') : editingPlan ? t('admin:subscriptionPlans.updatePlan') : t('admin:subscriptionPlans.createPlan')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deletePlan !== null}
        onOpenChange={(open) => { if (!open) setDeletePlan(null); }}
        title={t('admin:subscriptionPlans.deleteTitle')}
        description={t('admin:subscriptionPlans.deleteConfirm', { name: deletePlan?.name ?? '' })}
        confirmLabel={t('common:delete')}
        variant="destructive"
        onConfirm={() => {
          if (deletePlan) return handleDelete(deletePlan);
        }}
      />
    </div>
  );
}
