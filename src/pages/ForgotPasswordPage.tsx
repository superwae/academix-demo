import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { authService } from '../services/authService';
import { toast } from 'sonner';
import { GraduationCap, Loader2, Mail } from 'lucide-react';

export function ForgotPasswordPage() {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email?.trim()) {
      toast.error(t('auth:forgotPassword.missingEmail'));
      return;
    }
    try {
      setLoading(true);
      await authService.forgotPassword(email.trim());
      setSent(true);
      toast.success(t('auth:forgotPassword.successToastTitle'), {
        description: t('auth:forgotPassword.successToastDescription'),
      });
    } catch (error) {
      const raw = error instanceof Error ? error.message.trim() : ''
      const message = raw.length > 200 ? `${raw.slice(0, 197)}…` : raw || t('auth:forgotPassword.genericError')
      toast.error(message, { duration: 5200 })
    } finally {
      setLoading(false);
    }
  };

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
                  <Mail className="h-8 w-8" />
                </div>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">{t('auth:forgotPassword.title')}</CardTitle>
              <CardDescription className="mt-2">
                {t('auth:forgotPassword.subtitle')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  <Trans
                    i18nKey="auth:forgotPassword.emailSentDetails"
                    values={{ email }}
                    components={{ 1: <strong /> }}
                  />
                </p>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/login">{t('auth:forgotPassword.backToLogin')}</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth:forgotPassword.emailLabel')}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t('auth:forgotPassword.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t('auth:forgotPassword.submitting')}
                    </>
                  ) : (
                    t('auth:forgotPassword.submit')
                  )}
                </Button>
              </form>
            )}
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t('auth:forgotPassword.rememberPassword')} </span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                {t('auth:forgotPassword.signIn')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
