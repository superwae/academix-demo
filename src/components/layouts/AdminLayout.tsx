import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { LanguagePicker } from "../LanguagePicker";
import { OrgSwitcher } from "../OrgSwitcher";
import { HelpButton } from "../HelpButton";
import {
  LayoutDashboard,
  Users,
  Settings,
  Menu,
  LogOut,
  GraduationCap,
  BookOpen,
  DollarSign,
  FileText,
  ScrollText,
  Search,
  ChevronDown,
  Moon,
  Sun,
  CreditCard,
  Wallet,
  PieChart,
  MessageSquare,
  Crown,
  Inbox,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { THEMES, type ThemeId } from "../../theme/themes";
import { applyTheme } from "../../theme/applyTheme";
import { useAppStore } from "../../store/useAppStore";
import { useAuthStore } from "../../store/useAuthStore";
import { toast } from "sonner";
import { AnimatedBackground } from "../AnimatedBackground";
import { ColorPicker } from "../ui/color-picker";
import { NotificationBell } from "../NotificationBell";
import { useUnreadMessages } from "../../hooks/useUnreadMessages";
import { Badge } from "../ui/badge";

type NavItem = {
  to: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
};

type NavSection = {
  titleKey: string;
  items: NavItem[];
};

// Admin navigation - ALL paths use /admin/* prefix
const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    titleKey: "nav:sectionOverview",
    items: [
      { to: "/admin/dashboard", labelKey: "nav:dashboard", icon: LayoutDashboard },
    ],
  },
  {
    titleKey: "nav:sectionManagement",
    items: [
      { to: "/admin/users", labelKey: "nav:users", icon: Users },
      { to: "/admin/messages", labelKey: "nav:messages", icon: MessageSquare },
      { to: "/admin/courses", labelKey: "nav:courses", icon: BookOpen, badge: 3 },
    ],
  },
  {
    titleKey: "nav:sectionFinance",
    items: [
      { to: "/admin/finance", labelKey: "nav:overview", icon: DollarSign },
      { to: "/admin/finance/transactions", labelKey: "nav:transactions", icon: CreditCard },
      { to: "/admin/finance/payouts", labelKey: "nav:payouts", icon: Wallet },
      { to: "/admin/finance/revenue-split", labelKey: "nav:revenueSplit", icon: PieChart },
    ],
  },
  {
    titleKey: "nav:sectionSubscriptions",
    items: [
      { to: "/admin/subscription-plans", labelKey: "nav:subscriptionPlans", icon: Crown },
      { to: "/admin/subscription", labelKey: "nav:subscription", icon: CreditCard },
    ],
  },
  {
    titleKey: "nav:sectionReportsSystem",
    items: [
      { to: "/admin/reports", labelKey: "nav:reports", icon: FileText },
      { to: "/admin/audit-logs", labelKey: "nav:auditLogs", icon: ScrollText },
      { to: "/admin/support-tickets", labelKey: "support:admin.title", icon: Inbox },
      { to: "/admin/settings", labelKey: "nav:settings", icon: Settings },
    ],
  },
];

export function AdminLayout() {
  const { t } = useTranslation(['nav', 'common', 'auth']);
  const theme = useAppStore((s) => s.data.theme);
  const customThemeColor = useAppStore((s) => s.data.customThemeColor);
  const mixTheme = useAppStore((s) => s.data.mixTheme);
  const setTheme = useAppStore((s) => s.setTheme);
  const setCustomThemeColor = useAppStore((s) => s.setCustomThemeColor);
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { unreadCount: unreadMessages } = useUnreadMessages();

  const isDarkMode = theme === 'dark';

  const handleLogout = () => {
    logout();
    toast.success(t('auth:logoutSuccess'));
    navigate("/");
  };

  const toggleDarkMode = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setTheme(newTheme);
    toast.success(newTheme === 'dark' ? t('common:switchedToDarkMode') : t('common:switchedToLightMode'));
  };

  const themeLabel = useMemo(
    () => THEMES.find((th) => th.id === theme)?.label ?? t('common:theme'),
    [theme, t]
  );

  useEffect(() => {
    applyTheme(theme, customThemeColor, mixTheme);
  }, [theme, customThemeColor, mixTheme]);

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <AnimatedBackground />

      <header
        className="sticky top-0 z-50 border-b border-border/50 glass-strong pt-[env(safe-area-inset-top,0px)]"
        role="banner"
      >
        <div className="mx-auto flex h-16 max-w-[1920px] items-center gap-3 px-3 sm:gap-4 sm:px-4 lg:px-6">
          {/* Left: Logo & Mobile Menu */}
          <div className="flex items-center gap-3">
            <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label={t('common:openNavigation')}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm p-0">
                <DialogHeader className="p-6 border-b">
                  <DialogTitle className="text-xl">AcademiX</DialogTitle>
                </DialogHeader>
                <div className="max-h-[min(70dvh,560px)] overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-2">
                  <AdminNavList
                    onNavigate={() => setMobileOpen(false)}
                    unreadMessages={unreadMessages}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <NavLink to="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-base font-bold tracking-tight">AcademiX</div>
                <div className="text-[10px] text-muted-foreground font-medium -mt-0.5">
                  {t('nav:adminPortal')}
                </div>
              </div>
            </NavLink>

            {/* Environment Badge */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              DEV
            </div>
          </div>

          {/* Center: Global Search */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('common:searchAdminPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9 h-9 bg-muted/50 border-transparent focus:border-primary/30 focus:bg-background"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="ms-auto flex items-center gap-2">
            {/* Search button for mobile */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 md:hidden"
              aria-label={t('common:openSearch')}
              onClick={() => setMobileSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Theme Switcher */}
            {theme === 'custom' ? (
              <ColorPicker
                value={customThemeColor || 'hsl(222, 84%, 60%)'}
                onChange={(color) => {
                  setCustomThemeColor(color);
                }}
              />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 hidden sm:flex"
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-border shadow-sm"
                      style={{ background: "hsl(var(--primary))" }}
                    />
                    <span className="hidden md:inline text-xs font-medium">
                      {themeLabel}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel className="text-xs font-semibold">
                    {t('common:chooseTheme')}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={(v) => {
                      const next = v as ThemeId;
                      if (next === 'custom') {
                        if (!customThemeColor) {
                          const computed = getComputedStyle(document.documentElement)
                            .getPropertyValue('--primary')
                            .trim();
                          if (computed) {
                            const hslValues = computed.split(' ');
                            if (hslValues.length >= 3) {
                              const h = hslValues[0];
                              const s = hslValues[1];
                              const l = hslValues[2];
                              setCustomThemeColor(`hsl(${h} ${s} ${l})`);
                            }
                          }
                        }
                        setTheme('custom');
                        toast.success(t('common:customThemeEnabled'), {
                          description: t('common:customThemeEnabledDesc'),
                        });
                      } else {
                        setTheme(next);
                        toast.success(t('common:themeUpdated'), {
                          description: t('common:switchedToTheme', {
                            theme: THEMES.find((th) => th.id === next)?.label,
                          }),
                        });
                      }
                    }}
                  >
                    {THEMES.filter(th => th.id !== 'custom').map((th) => (
                      <DropdownMenuRadioItem
                        key={th.id}
                        value={th.id}
                        className="text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-3 w-3 rounded-full border border-border shadow-sm",
                              th.id === "light" && "bg-white",
                              th.id === "dark" && "bg-black",
                              th.id === "purple" && "bg-[#a855f7]",
                              th.id === "sky" && "bg-[#06b6d4]",
                              th.id === "green" && "bg-[#22c55e]",
                              th.id === "emerald" && "bg-[#10b981]",
                              th.id === "orange" && "bg-[#f97316]",
                              th.id === "amber" && "bg-[#f59e0b]",
                              th.id === "red" && "bg-[#ef4444]",
                              th.id === "rose" && "bg-[#f43f5e]",
                              th.id === "pink" && "bg-[#ec4899]",
                              th.id === "indigo" && "bg-[#6366f1]"
                            )}
                          />
                          <span>{th.label}</span>
                        </div>
                      </DropdownMenuRadioItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem value="custom" className="text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full border border-border shadow-sm"
                          style={{ background: customThemeColor || 'hsl(222, 84%, 60%)' }}
                        />
                        <span>{t('common:customColor')}</span>
                      </div>
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Dark Mode Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              className="h-9 w-9"
              title={isDarkMode ? t('common:switchToLightMode') : t('common:switchToDarkMode')}
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Language Picker */}
            <LanguagePicker compact />

            {/* Org portal entry (when the admin is a member of any org) */}
            <OrgSwitcher />

            {/* Contact support */}
            <HelpButton />

            <NotificationBell />

            {/* Admin Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-9 px-2">
                  {user?.profilePictureUrl ? (
                    <img
                      src={user.profilePictureUrl}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                  )}
                  <div className="hidden lg:block text-start">
                    <p className="text-sm font-medium leading-none">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {user?.roles?.[0] || t('nav:admin')}
                    </p>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground hidden lg:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
                  <Settings className="me-2 h-4 w-4" />
                  {t('common:settings')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/audit-logs")}>
                  <ScrollText className="me-2 h-4 w-4" />
                  {t('nav:activityLog')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="me-2 h-4 w-4" />
                  {t('common:logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <DialogContent className="max-w-md gap-4">
          <DialogHeader>
            <DialogTitle>{t('common:searchAdminTitle')}</DialogTitle>
            <DialogDescription>
              {t('common:searchAdminDescription')}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setMobileSearchOpen(false);
              const q = searchQuery.trim();
              if (q.length > 0) {
                navigate(`/admin/users?q=${encodeURIComponent(q)}`);
              } else {
                navigate("/admin/users");
              }
            }}
          >
            <Input
              type="search"
              placeholder={t('common:searchAdminPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 text-base"
              autoComplete="off"
            />
            <Button type="submit" className="w-full h-11">
              {t('common:search')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mx-auto grid max-w-[1920px] grid-cols-1 gap-4 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[260px_1fr] lg:gap-6 lg:px-6 lg:py-6">
        <aside className="hidden lg:block" role="complementary" aria-label="Navigation sidebar">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="sticky top-[5.5rem] glass-strong rounded-2xl border border-border/60 p-3 shadow-xl max-h-[calc(100vh-6.5rem)] overflow-y-auto"
          >
            <AdminNavList unreadMessages={unreadMessages} />
          </motion.div>
        </aside>

        <main id="main-content" className="min-w-0" role="main" tabIndex={-1}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="min-w-0 rounded-2xl border border-border/60 bg-card p-4 shadow-xl sm:p-6 md:p-8"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function AdminNavList({
  onNavigate,
  unreadMessages = 0,
}: {
  onNavigate?: () => void;
  unreadMessages?: number;
}) {
  const { t } = useTranslation(['nav']);
  return (
    <nav className="flex flex-col gap-4" aria-label="Main navigation">
      {ADMIN_NAV_SECTIONS.map((section) => (
        <div key={section.titleKey}>
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t(section.titleKey)}
          </div>
          <div className="mt-1 flex flex-col gap-0.5">
            {section.items.map((item) => {
              const isMessages = item.to === "/admin/messages";
              const showMessagesBadge = isMessages && unreadMessages > 0;
              return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 min-h-[40px]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span className="flex-1 truncate">{t(item.labelKey)}</span>
                    {showMessagesBadge && (
                      <Badge
                        variant="destructive"
                        className="h-5 min-w-5 shrink-0 justify-center px-1.5 text-xs tabular-nums"
                      >
                        {unreadMessages > 99 ? "99+" : unreadMessages}
                      </Badge>
                    )}
                    {!showMessagesBadge && item.badge ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/10 px-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        {item.badge}
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
