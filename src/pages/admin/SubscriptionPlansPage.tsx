import { useState, useEffect } from "react";
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
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlanDto | null>(null);
  const [deletePlan, setDeletePlan] = useState<SubscriptionPlanDto | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const result = await subscriptionPlanService.getPlans();
      setPlans(result);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      toast.error("Failed to load subscription plans", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
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
        toast.success("Plan updated successfully");
      } else {
        await subscriptionPlanService.createPlan(payload);
        toast.success("Plan created successfully");
      }
      setDialogOpen(false);
      fetchPlans();
    } catch (error) {
      toast.error(editingPlan ? "Failed to update plan" : "Failed to create plan", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: SubscriptionPlanDto) => {
    try {
      await subscriptionPlanService.deletePlan(plan.id);
      toast.success(`"${plan.name}" plan deleted`);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    } catch (error) {
      toast.error("Failed to delete plan", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Subscription Plans</h1>
          <p className="mt-1 text-muted-foreground">
            Manage subscription tiers and pricing
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
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
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Plan</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Monthly</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Yearly</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Courses</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Seats/Course</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Total Seats</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No subscription plans found. Create your first plan.
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
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
                    <td className="px-4 py-3 text-sm">${plan.monthlyPrice}/mo</td>
                    <td className="px-4 py-3 text-sm">${plan.yearlyPrice}/yr</td>
                    <td className="px-4 py-3 text-sm">{plan.maxCourses}</td>
                    <td className="px-4 py-3 text-sm">{plan.maxSeatsPerCourse}</td>
                    <td className="px-4 py-3 text-sm">{plan.maxTotalSeats}</td>
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
                        {plan.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => openEditDialog(plan)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
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
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="planName">Plan Name *</Label>
              <Input
                id="planName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Starter, Professional, Enterprise"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="planDescription">Description</Label>
              <Input
                id="planDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the plan"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="monthlyPrice">Monthly Price ($) *</Label>
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
                <Label htmlFor="yearlyPrice">Yearly Price ($) *</Label>
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
                <Label htmlFor="maxCourses">Max Courses *</Label>
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
                <Label htmlFor="maxSeatsPerCourse">Seats/Course *</Label>
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
                <Label htmlFor="maxTotalSeats">Total Seats *</Label>
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
                <Label htmlFor="sortOrder">Sort Order</Label>
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
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deletePlan !== null}
        onOpenChange={(open) => { if (!open) setDeletePlan(null); }}
        title="Delete Plan"
        description={`Are you sure you want to delete the "${deletePlan?.name}" plan? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deletePlan) return handleDelete(deletePlan);
        }}
      />
    </div>
  );
}
