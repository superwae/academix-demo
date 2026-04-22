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
import { GraduationCap, Loader2, KeyRound } from 'lucide-react';

export function ResetPasswordPage() {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) toast.error(t('auth:resetPassword.invalidToken'));
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error(t('auth:resetPassword.missingToken'));
      return;
    }
    if (password.length < 8) {
      toast.error(t('errors:passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('errors:passwordsDoNotMatch'));
      return;
    }
    try {
      setLoading(true);
      await authService.resetPassword(token, password);
      setSuccess(true);
      toast.success(t('auth:resetPassword.success'));
    } catch (error) {
      toast.error(t('auth:resetPassword.failedTitle'), {
        description: error instanceof Error ? error.message : t('auth:resetPassword.linkExpiredDescription'),
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-6 py-12">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t('auth:resetPassword.invalidLinkBody')}</p>
            <Button asChild className="mt-4">
              <Link to="/forgot-password">{t('auth:resetPassword.requestNewLinkCta')}</Link>
            </Button>
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
                <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30">
                  <KeyRound className="h-8 w-8" />
                </div>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">{t('auth:resetPassword.title')}</CardTitle>
              <CardDescription className="mt-2">
                {t('auth:resetPassword.subtitle')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">{t('auth:resetPassword.successBody')}</p>
                <Button asChild className="w-full">
                  <Link to="/login">{t('auth:resetPassword.signInCta')}</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth:resetPassword.newPasswordLabel')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('auth:resetPassword.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">{t('auth:resetPassword.passwordHint')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth:resetPassword.confirmPasswordLabel')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder={t('auth:resetPassword.passwordPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t('auth:resetPassword.submitting')}
                    </>
                  ) : (
                    t('auth:resetPassword.submit')
                  )}
                </Button>
              </form>
            )}
            <div className="mt-6 text-center text-sm">
              <Link to="/login" className="text-primary hover:underline font-medium">
                {t('auth:resetPassword.backToLogin')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
