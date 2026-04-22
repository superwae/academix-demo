import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';
import { GraduationCap, Loader2, BookOpen, UserCircle } from 'lucide-react';

export function RegisterPage() {
  const { t } = useTranslation(['auth', 'common', 'errors']);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'Student' as 'Student' | 'Instructor',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      toast.error(t('auth:register.missingFields'));
      return;
    }

    if (formData.password.length < 8) {
      toast.error(t('errors:passwordTooShort'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('errors:passwordsDoNotMatch'));
      return;
    }

    try {
      setLoading(true);
      await register(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        formData.phoneNumber || undefined,
        formData.role === 'Instructor' ? 'Instructor' : undefined
      );

      // Get user from store to check roles
      const { user } = useAuthStore.getState();

      // Check if user has Instructor role
      const isInstructor = user?.roles?.includes('Instructor') || user?.roles?.includes('instructor');

      toast.success(t('auth:register.successToast'));

      // Redirect based on role - use portal-specific paths
      if (isInstructor) {
        navigate('/teacher/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (error) {
      const raw = error instanceof Error ? error.message.trim() : ''
      const message =
        raw.length > 200 ? `${raw.slice(0, 197)}…` : raw || t('auth:register.failureFallback')
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
                  <GraduationCap className="h-8 w-8" />
                </div>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">{t('auth:register.title')}</CardTitle>
              <CardDescription className="mt-2">
                {t('auth:register.subtitle')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('auth:register.roleLabel')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                      formData.role === 'Student'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="Student"
                      checked={formData.role === 'Student'}
                      onChange={() => setFormData((p) => ({ ...p, role: 'Student' }))}
                      className="sr-only"
                    />
                    <UserCircle className="h-5 w-5 shrink-0" />
                    <span className="font-medium">{t('auth:register.roleStudent')}</span>
                  </label>
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 transition-colors ${
                      formData.role === 'Instructor'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="Instructor"
                      checked={formData.role === 'Instructor'}
                      onChange={() => setFormData((p) => ({ ...p, role: 'Instructor' }))}
                      className="sr-only"
                    />
                    <BookOpen className="h-5 w-5 shrink-0" />
                    <span className="font-medium">{t('auth:register.roleTeacher')}</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('auth:register.firstNameLabel')}</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder={t('auth:register.firstNamePlaceholder')}
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('auth:register.lastNameLabel')}</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder={t('auth:register.lastNamePlaceholder')}
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth:register.emailLabel')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('auth:register.emailPlaceholder')}
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">{t('auth:register.phoneOptional')}</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  placeholder={t('auth:register.phonePlaceholder')}
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth:register.passwordLabel')}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={t('auth:register.passwordPlaceholder')}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  {t('auth:register.passwordHint')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth:register.confirmPasswordLabel')}</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder={t('auth:register.passwordPlaceholder')}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t('auth:register.submitting')}
                  </>
                ) : (
                  t('auth:register.submit')
                )}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t('auth:register.loginHint')} </span>
              <Link to="/login" className="text-primary hover:underline font-medium">
                {t('auth:register.loginCta')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

