import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { authService } from '../services/authService';
import { toast } from 'sonner';
import { GraduationCap, Loader2, CheckCircle, Mail } from 'lucide-react';

export function VerifyEmailPage() {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [loading, setLoading] = useState(!!token);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('auth:verifyEmail.invalidLink'));
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await authService.verifyEmail(token);
        if (!cancelled) {
          setSuccess(true);
          toast.success(t('auth:verifyEmail.success'));
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : t('auth:verifyEmail.failureFallback');
          setError(msg);
          toast.error(t('auth:verifyEmail.failure'), { description: msg });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, t]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail?.trim()) {
      toast.error(t('auth:verifyEmail.missingEmail'));
      return;
    }
    try {
      setResending(true);
      await authService.resendVerificationEmail(resendEmail.trim());
      toast.success(t('auth:verifyEmail.resendSuccessTitle'), {
        description: t('auth:verifyEmail.resendSuccessDescription'),
      });
    } catch (e) {
      toast.error(t('auth:verifyEmail.resendFailedTitle'), {
        description: e instanceof Error ? e.message : t('auth:verifyEmail.resendFailedFallback'),
      });
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-6 py-12">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('auth:verifyEmail.verifying')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-2">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary via-primary/80 to-primary blur-sm opacity-50" />
                <div className={`relative flex h-16 w-16 items-center justify-center rounded-xl shadow-lg ${
                  success ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {success ? <CheckCircle className="h-8 w-8" /> : <GraduationCap className="h-8 w-8" />}
                </div>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">
                {success
                  ? t('auth:verifyEmail.successCardTitle')
                  : error
                    ? t('auth:verifyEmail.failure')
                    : t('auth:verifyEmail.title')}
              </CardTitle>
              <CardDescription className="mt-2">
                {success
                  ? t('auth:verifyEmail.successCardBody')
                  : error ?? t('auth:verifyEmail.fallbackSubtitle')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link to="/login">
                {success ? t('auth:verifyEmail.goToSignIn') : t('auth:verifyEmail.signIn')}
              </Link>
            </Button>
            {error && (
              <form onSubmit={handleResend} className="space-y-3 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {t('auth:verifyEmail.expiredHint')}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="resend-email">{t('auth:verifyEmail.emailLabel')}</Label>
                  <Input
                    id="resend-email"
                    type="email"
                    placeholder={t('auth:verifyEmail.emailPlaceholder')}
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    disabled={resending}
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full" disabled={resending}>
                  {resending ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t('auth:verifyEmail.resending')}
                    </>
                  ) : (
                    <>
                      <Mail className="me-2 h-4 w-4" />
                      {t('auth:verifyEmail.resendCta')}
                    </>
                  )}
                </Button>
              </form>
            )}
            {!token && !error && (
              <p className="text-center text-sm text-muted-foreground">
                {t('auth:verifyEmail.checkInboxNote')}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
