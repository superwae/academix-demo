import { useState, useEffect } from "react";
import {
  Crown,
  Loader2,
  BookOpen,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { cn } from "../../lib/cn";
import { toast } from "sonner";
import { subscriptionService, type SubscriptionDto } from "../../services/subscriptionService";
import { subscriptionPlanService, type SubscriptionPlanDto } from "../../services/subscriptionPlanService";
import { paymentService } from "../../services/paymentService";

export function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanDto[]>([]);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"Monthly" | "Yearly">("Monthly");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sub, allPlans] = await Promise.all([
          subscriptionService.getMySubscription().catch(() => null),
          subscriptionPlanService.getPlans(),
        ]);
        setSubscription(sub);
        setPlans(allPlans.filter((p: SubscriptionPlanDto) => p.isActive));
      } catch (error) {
        console.error("Failed to load subscription data:", error);
        toast.error("Failed to load subscription data", {
          description: error instanceof Error ? error.message : "An error occurred",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubscribe = async (planId: string) => {
    try {
      setSubscribing(planId);
      // Initialize payment via Lahza, then redirect to checkout page
      const result = await paymentService.initializeSubscriptionPayment({
        planId,
        billingInterval,
      });
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      } else {
        toast.error("Failed to start payment", {
          description: "No checkout URL received from payment provider",
        });
      }
    } catch (error) {
      toast.error("Failed to start subscription payment", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    try {
      await subscriptionService.cancelSubscription();
      toast.success("Subscription cancelled");
      setSubscription(null);
    } catch (error) {
      toast.error("Failed to cancel subscription", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Subscription</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your organization's subscription plan
        </p>
      </div>

      {subscription ? (
        <>
          {/* Current Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Current Plan: {subscription.planName}
              </CardTitle>
              <CardDescription>
                {subscription.billingInterval === "Monthly" ? "Monthly" : "Yearly"} billing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-semibold capitalize">{subscription.status}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                    <Calendar className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Period</p>
                    <p className="text-sm font-medium">
                      {new Date(subscription.currentPeriodStart).toLocaleDateString()} -{" "}
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                    <BookOpen className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Max Courses</p>
                    <p className="font-semibold">
                      {subscription.plan?.maxCourses ?? "Unlimited"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                    <Users className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Max Total Seats</p>
                    <p className="font-semibold">
                      {subscription.plan?.maxTotalSeats ?? "Unlimited"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Plan Limits */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Courses</span>
                  <span className="font-medium">{subscription.plan?.maxCourses ?? "Unlimited"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Seats Per Course</span>
                  <span className="font-medium">{subscription.plan?.maxSeatsPerCourse ?? "Unlimited"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Total Seats</span>
                  <span className="font-medium">{subscription.plan?.maxTotalSeats ?? "Unlimited"}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setBillingInterval("Monthly")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                billingInterval === "Monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("Yearly")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                billingInterval === "Yearly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <span className="ml-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600">
                Save 20%
              </span>
            </button>
          </div>

          {/* Pricing Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className="relative overflow-hidden">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-3xl font-bold">
                      ${billingInterval === "Monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                    </span>
                    <span className="text-muted-foreground">
                      /{billingInterval === "Monthly" ? "mo" : "yr"}
                    </span>
                  </div>

                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      {plan.maxCourses != null ? `Up to ${plan.maxCourses} courses` : "Unlimited courses"}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      {plan.maxSeatsPerCourse != null ? `${plan.maxSeatsPerCourse} seats per course` : "Unlimited seats per course"}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      {plan.maxTotalSeats != null ? `${plan.maxTotalSeats} total seats` : "Unlimited total seats"}
                    </li>
                  </ul>

                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscribing !== null}
                  >
                    {subscribing === plan.id ? "Subscribing..." : "Subscribe"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {plans.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No subscription plans available at this time.
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Subscription"
        description="Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period."
        confirmLabel="Cancel Subscription"
        variant="destructive"
        onConfirm={handleCancel}
      />
    </div>
  );
}
