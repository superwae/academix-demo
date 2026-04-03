import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2,
  Tag,
  ShoppingCart,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { courseService, type CourseDto } from "../../services/courseService";
import { paymentService } from "../../services/paymentService";
import { discountService, type ValidateDiscountResponse } from "../../services/discountService";

export function CheckoutPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState<{
    code: string;
    discountedPrice: number;
    discountAmount: number;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        const data = await courseService.getCourseById(courseId);
        setCourse(data);
      } catch (error) {
        console.error("Failed to fetch course:", error);
        toast.error("Failed to load course", {
          description: error instanceof Error ? error.message : "An error occurred",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim() || !courseId) return;

    try {
      setValidating(true);
      const result = await discountService.validateDiscount(courseId, discountCode.trim());
      if (!result.isValid) {
        toast.error("Invalid discount code", {
          description: result.message || "The code is not valid or has expired",
        });
        setDiscountApplied(null);
        return;
      }
      const discountedPrice = result.discountedPrice ?? originalPrice;
      const discountAmt = originalPrice - discountedPrice;
      setDiscountApplied({
        code: discountCode.trim(),
        discountedPrice,
        discountAmount: discountAmt,
      });
      toast.success("Discount applied", {
        description: `You saved $${discountAmt.toFixed(2)}`,
      });
    } catch (error) {
      toast.error("Failed to validate discount", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
      setDiscountApplied(null);
    } finally {
      setValidating(false);
    }
  };

  const originalPrice = course?.price ?? 0;
  const discountAmount = discountApplied?.discountAmount ?? 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  const handlePay = async () => {
    if (!courseId) return;

    try {
      setPaying(true);
      const result = await paymentService.initializeCoursePayment({
        courseId,
        discountCode: discountApplied?.code,
      });

      // Redirect to Lahza payment page
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      } else {
        toast.error("Payment initialization failed", {
          description: "No redirect URL received from payment provider",
        });
      }
    } catch (error) {
      toast.error("Failed to initialize payment", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Course not found.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Checkout</h1>
        <p className="mt-1 text-muted-foreground">
          Complete your purchase to enroll in this course
        </p>
      </div>

      {/* Course Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Course Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            {course.thumbnailUrl && (
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="h-20 w-32 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{course.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{course.category}</p>
              <p className="text-sm text-muted-foreground">{course.level}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discount Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Discount Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="Enter discount code"
                disabled={discountApplied !== null}
              />
            </div>
            {discountApplied ? (
              <Button
                variant="outline"
                onClick={() => {
                  setDiscountApplied(null);
                  setDiscountCode("");
                }}
              >
                Remove
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleApplyDiscount}
                disabled={validating || !discountCode.trim()}
              >
                {validating ? "Validating..." : "Apply"}
              </Button>
            )}
          </div>
          {discountApplied && (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              Discount "{discountApplied.code}" applied - saving ${discountApplied.discountAmount.toFixed(2)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Original price</span>
            <span>${originalPrice.toFixed(2)}</span>
          </div>
          {discountApplied && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discount ({discountApplied.code})</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-3">
            <div className="flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold">${finalPrice.toFixed(2)}</span>
            </div>
          </div>

          <Button
            className="w-full mt-4"
            size="lg"
            onClick={handlePay}
            disabled={paying}
          >
            {paying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay $${finalPrice.toFixed(2)}`
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
