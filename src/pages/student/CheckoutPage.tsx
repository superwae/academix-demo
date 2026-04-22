import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  Tag,
  ShoppingCart,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import { courseService, type CourseDto } from "../../services/courseService";
import { paymentService } from "../../services/paymentService";
import { discountService } from "../../services/discountService";

export function CheckoutPage() {
  const { t } = useTranslation(['student', 'common', 'errors']);
  const { courseId } = useParams<{ courseId: string }>();
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
        toast.error(t('student:checkout.errors.failedLoadCourse'), {
          description: error instanceof Error ? error.message : t('student:checkout.errors.unknownError'),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, t]);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim() || !courseId) return;

    try {
      setValidating(true);
      const result = await discountService.validateDiscount(courseId, discountCode.trim());
      if (!result.isValid) {
        toast.error(t('student:checkout.errors.invalidCode'), {
          description: result.message || t('student:checkout.errors.codeNotValid'),
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
      toast.success(t('student:checkout.discountAppliedTitle'), {
        description: t('student:checkout.discountSaved', { amount: discountAmt.toFixed(2) }),
      });
    } catch (error) {
      toast.error(t('student:checkout.errors.failedValidate'), {
        description: error instanceof Error ? error.message : t('student:checkout.errors.unknownError'),
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
        toast.error(t('student:checkout.errors.paymentInitFailed'), {
          description: t('student:checkout.errors.noRedirectUrl'),
        });
      }
    } catch (error) {
      toast.error(t('student:checkout.errors.failedInitPayment'), {
        description: error instanceof Error ? error.message : t('student:checkout.errors.unknownError'),
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
        {t('student:checkout.courseNotFound')}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('student:checkout.title')}</h1>
        <p className="mt-1 text-muted-foreground">
          {t('student:checkout.subtitle')}
        </p>
      </div>

      {/* Course Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {t('student:checkout.courseDetails')}
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
            {t('student:checkout.discountCode')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder={t('student:checkout.enterDiscountCode')}
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
                {t('student:checkout.remove')}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleApplyDiscount}
                disabled={validating || !discountCode.trim()}
              >
                {validating ? t('student:checkout.validating') : t('student:checkout.apply')}
              </Button>
            )}
          </div>
          {discountApplied && (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              {t('student:checkout.discountApplied', {
                code: discountApplied.code,
                amount: discountApplied.discountAmount.toFixed(2),
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t('student:checkout.orderSummary')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('student:checkout.originalPrice')}</span>
            <span>${originalPrice.toFixed(2)}</span>
          </div>
          {discountApplied && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>{t('student:checkout.discount', { code: discountApplied.code })}</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-3">
            <div className="flex justify-between">
              <span className="font-semibold">{t('student:checkout.total')}</span>
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
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t('student:checkout.processing')}
              </>
            ) : (
              t('student:checkout.pay', { amount: finalPrice.toFixed(2) })
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
