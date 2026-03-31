import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuthStore } from '../store/useAuthStore';
import { AlertCircle, GraduationCap, Loader2 } from 'lucide-react';

function formatLoginErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message.trim() : ''
  if (raw.length > 280) return `${raw.slice(0, 277)}…`
  return raw || 'Couldn’t sign in. Check your email and password.'
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please enter both your email and password.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      
      // Get user from store to check roles
      const { user } = useAuthStore.getState();
      const userRoles = user?.roles || [];
      
      // Check roles (case-insensitive)
      const isAdmin = userRoles.some(r => 
        r.toLowerCase() === 'admin' || r.toLowerCase() === 'superadmin'
      );
      const isInstructor = userRoles.some(r => 
        r.toLowerCase() === 'instructor' || r.toLowerCase() === 'teacher'
      );
      const isAccountant = userRoles.some((r) => r.toLowerCase() === 'accountant');
      const isSecretary = userRoles.some((r) => r.toLowerCase() === 'secretary');
      
      console.log('[Login] User roles:', userRoles, { isAdmin, isInstructor, isAccountant, isSecretary });
      
      // Redirect — no corner toast; success is the new page
      // Redirect based on role - use portal-specific paths
      if (isAdmin) {
        navigate('/admin/dashboard');
      } else if (isInstructor) {
        navigate('/teacher/dashboard');
      } else if (isAccountant) {
        navigate('/accountant/dashboard');
      } else if (isSecretary) {
        navigate('/secretary/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (error) {
      setFormError(formatLoginErrorMessage(error))
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
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription className="mt-2">
                Sign in to your AcademiX account
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
              aria-describedby={formError ? 'login-form-error' : undefined}
            >
              <AnimatePresence mode="wait">
                {formError ? (
                  <motion.div
                    key={formError}
                    id="login-form-error"
                    role="alert"
                    aria-live="polite"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-3 rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3.5 py-3 text-left shadow-sm"
                  >
                    <AlertCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium text-destructive">Unable to sign in</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{formError}</p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="username"
                  type="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setFormError(null)
                  }}
                  required
                  disabled={loading}
                  autoComplete="username"
                  aria-invalid={!!formError}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setFormError(null)
                  }}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  aria-invalid={!!formError}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
              <div className="text-center">
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </form>
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/register" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

