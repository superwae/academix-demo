import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { useAuthStore } from '../store/useAuthStore';
import { useAppStore } from '../store/useAppStore';
import { applyTheme } from '../theme/applyTheme';
import { AnimatedBackground } from './AnimatedBackground';
import { LanguagePicker } from './LanguagePicker';

export function PublicLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  // The landing page ships its own full-width mega footer.
  const hideFooter = location.pathname === '/';
  const mixTheme = useAppStore((s) => s.data.mixTheme);
  const { t } = useTranslation(['nav', 'common']);

  // Reset theme to default on public pages so a previous user's custom theme
  // doesn't bleed into login/register/etc.
  useEffect(() => {
    if (!isAuthenticated) {
      applyTheme('light');
    }
  }, [isAuthenticated]);

  const handleDashboardClick = () => {
    const isInstructor = user?.roles?.includes('Instructor') || user?.roles?.includes('instructor');
    navigate(isInstructor ? '/teacher/dashboard' : '/student/dashboard');
  };

  return (
    <div
      className={`relative min-h-dvh text-foreground ${mixTheme ? 'bg-transparent' : 'bg-background'}`}
    >
      <AnimatedBackground mixActive={!!mixTheme} />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 glass-strong" role="banner">
        <div className="mx-auto flex h-16 max-w-[1920px] items-center gap-3 px-4 sm:h-20 sm:gap-4 sm:px-6">
          {/* Logo — id for theme celebration firework target */}
          <Link to="/" id="academix-logo" className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary via-primary/80 to-primary blur-sm opacity-50"
                />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30">
                  <GraduationCap className="h-6 w-6" />
                </div>
              </div>
              <div className="hidden leading-tight sm:block">
                <div className="text-lg font-bold tracking-tight gradient-text">
                  AcademiX
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {t('common:lms')}
                </div>
              </div>
            </motion.div>
          </Link>

          {/* Navigation */}
          <nav className="ms-auto flex items-center gap-1 sm:gap-3">
            <Link
              to="/#how-it-works"
              className="hidden md:inline-flex text-sm font-medium text-foreground/70 hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
            >
              {t('nav:howItWorks')}
            </Link>
            <Link
              to="/#features"
              className="hidden lg:inline-flex text-sm font-medium text-foreground/70 hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
            >
              {t('nav:features')}
            </Link>
            <Link
              to="/#faq"
              className="hidden lg:inline-flex text-sm font-medium text-foreground/70 hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
            >
              {t('nav:faq')}
            </Link>
            <Link
              to="/courses"
              className="hidden text-sm font-medium text-foreground/70 hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50 sm:inline-flex"
            >
              {t('nav:courses')}
            </Link>
            <LanguagePicker compact />
            {isAuthenticated ? (
              <Button onClick={handleDashboardClick} variant="default">
                {t('nav:dashboard')}
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/login')}
                  variant="ghost"
                  className="hidden sm:inline-flex"
                >
                  {t('common:login')}
                </Button>
                <Button onClick={() => navigate('/register')} variant="default" className="h-9 px-3 sm:h-10 sm:px-4">
                  {t('common:signUp')}
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-5rem)]">
        <Outlet />
      </main>

      {/* Footer */}
      {!hideFooter && (
      <footer className="border-t border-border/50 bg-background/80 mt-auto" role="contentinfo">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <Link to="/" className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                <span className="font-semibold text-lg">{t('common:appName')}</span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t('common:footerTagline')}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">{t('common:product')}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/courses" className="hover:text-foreground transition-colors">{t('nav:courses')}</Link></li>
                <li><Link to="/register" className="hover:text-foreground transition-colors">{t('common:signUp')}</Link></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">{t('common:login')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {t('common:appName')}. {t('common:allRightsReserved')}
            </p>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}
