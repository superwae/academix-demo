import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Loader2,
  CheckCircle,
  XCircle,
  BookOpen,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { paymentService } from "../../services/paymentService";

export function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference");
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setLoading(false);
        setErrorMessage("No payment reference found. Please contact support.");
        return;
      }

      try {
        const result = await paymentService.verifyPayment(reference);
        setSuccess(true);
        setCourseId(result.payment?.courseId ?? null);
      } catch (error) {
        console.error("Payment verification failed:", error);
        setSuccess(false);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Payment verification failed. Please contact support if you were charged."
        );
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [reference]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-lg font-medium">Verifying your payment...</p>
          <p className="text-sm text-muted-foreground">Please wait while we confirm your transaction</p>
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
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold">Enrolled!</h2>
              <p className="text-muted-foreground">
                Your payment was successful. You are now enrolled in the course.
              </p>
              <div className="flex flex-col gap-2 pt-4">
                {courseId && (
                  <Button asChild>
                    <Link to={`/student/my-classes/${courseId}/lessons`}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Go to Course
                    </Link>
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <Link to="/student/my-classes">View My Classes</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mx-auto">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold">Payment Failed</h2>
              <p className="text-muted-foreground">
                {errorMessage}
              </p>
              <div className="flex flex-col gap-2 pt-4">
                <Button variant="outline" asChild>
                  <Link to="/student/catalog">Browse Courses</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/student/dashboard">Back to Dashboard</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
