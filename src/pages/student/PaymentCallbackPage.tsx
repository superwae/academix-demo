import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  CheckCircle,
  XCircle,
  BookOpen,
  Crown,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { paymentService } from "../../services/paymentService";
import { useAuthStore } from "../../store/useAuthStore";

export function PaymentCallbackPage() {
  const { t } = useTranslation(['student', 'common', 'errors']);
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<string>("CoursePurchase");
  const [errorMessage, setErrorMessage] = useState("");

  // Determine the user's portal base path so we can route them back to the right area
  const roles = user?.roles?.map((r) => r.toLowerCase()) || [];
  const isTeacher = roles.includes("instructor") || roles.includes("teacher");
  const isAdmin = roles.includes("admin") || roles.includes("superadmin");
  const portalBase = isAdmin ? "/admin" : isTeacher ? "/teacher" : "/student";

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setLoading(false);
        setErrorMessage(t('student:paymentCallback.noReference'));
        return;
      }

      try {
        const result = await paymentService.verifyPayment(reference);
        const isCompleted = result.payment?.status === "Completed";
        setSuccess(isCompleted);
        setCourseId(result.payment?.courseId ?? null);
        setPaymentType(result.payment?.type ?? "CoursePurchase");
        if (!isCompleted) {
          setErrorMessage(
            t('student:paymentCallback.paymentStatus', {
              status: result.payment?.status ?? t('student:paymentCallback.statusUnknown'),
            })
          );
        }
      } catch (error) {
        console.error("Payment verification failed:", error);
        setSuccess(false);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : t('student:paymentCallback.verificationFailed')
        );
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [reference, t]);

  const isSubscription = paymentType === "Subscription";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg font-medium">{t('student:paymentCallback.verifying')}</p>
          <p className="text-sm text-muted-foreground">{t('student:paymentCallback.pleaseWait')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mx-auto">
                {isSubscription ? (
                  <Crown className="h-8 w-8 text-emerald-500" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                )}
              </div>
              <h2 className="text-2xl font-bold">
                {isSubscription ? t('student:paymentCallback.subscriptionActive') : t('student:paymentCallback.enrolled')}
              </h2>
              <p className="text-muted-foreground">
                {isSubscription
                  ? t('student:paymentCallback.subscriptionSuccess')
                  : t('student:paymentCallback.enrolledSuccess')}
              </p>
              <div className="flex flex-col gap-2 pt-4">
                {isSubscription ? (
                  <Button asChild>
                    <Link to={`${portalBase}/subscription`}>
                      <Crown className="me-2 h-4 w-4" />
                      {t('student:paymentCallback.viewMySubscription')}
                    </Link>
                  </Button>
                ) : (
                  <>
                    {courseId && (
                      <Button asChild>
                        <Link to={`/student/my-classes/${courseId}/lessons`}>
                          <BookOpen className="me-2 h-4 w-4" />
                          {t('student:paymentCallback.goToCourse')}
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" asChild>
                      <Link to="/student/my-classes">{t('student:paymentCallback.viewMyClasses')}</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mx-auto">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold">{t('student:paymentCallback.paymentFailed')}</h2>
              <p className="text-muted-foreground">
                {errorMessage}
              </p>
              <div className="flex flex-col gap-2 pt-4">
                {isSubscription ? (
                  <Button variant="outline" asChild>
                    <Link to={`${portalBase}/subscription`}>{t('student:paymentCallback.backToPlans')}</Link>
                  </Button>
                ) : (
                  <Button variant="outline" asChild>
                    <Link to="/student/catalog">{t('student:paymentCallback.browseCourses')}</Link>
                  </Button>
                )}
                <Button variant="ghost" asChild>
                  <Link to={`${portalBase}/dashboard`}>{t('student:paymentCallback.backToDashboard')}</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
