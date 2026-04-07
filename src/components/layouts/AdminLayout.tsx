import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, type ComponentType } from "react";
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
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

// Admin navigation - ALL paths use /admin/* prefix
const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Management",
    items: [
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/messages", label: "Messages", icon: MessageSquare },
      { to: "/admin/courses", label: "Courses", icon: BookOpen, badge: 3 },
    ],
  },
  {
    title: "Finance",
    items: [
      { to: "/admin/finance", label: "Overview", icon: DollarSign },
      { to: "/admin/finance/transactions", label: "Transactions", icon: CreditCard },
      { to: "/admin/finance/payouts", label: "Payouts", icon: Wallet },
      { to: "/admin/finance/revenue-split", label: "Revenue Split", icon: PieChart },
    ],
  },
  {
    title: "Subscriptions",
    items: [
      { to: "/admin/subscription-plans", label: "Subscription Plans", icon: Crown },
      { to: "/admin/subscription", label: "Subscription", icon: CreditCard },
    ],
  },
  {
    title: "Reports & System",
    items: [
      { to: "/admin/reports", label: "Reports", icon: FileText },
      { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminLayout() {
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
    toast.success("Logged out successfully");
    navigate("/");
  };

  const toggleDarkMode = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    setTheme(newTheme);
    toast.success(`Switched to ${newTheme} mode`);
  };

  const themeLabel = useMemo(
    () => THEMES.find((t) => t.id === theme)?.label ?? "Theme",
    [theme]
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
                  aria-label="Open navigation"
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
                  Admin Portal
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search users, courses, reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted/50 border-transparent focus:border-primary/30 focus:bg-background"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* Search button for mobile */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 md:hidden"
              aria-label="Open search"
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
                    Choose Theme
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
                        toast.success("Custom theme enabled", {
                          description: "Use the color picker to choose your color",
                        });
                      } else {
                        setTheme(next);
                        toast.success("Theme updated", {
                          description: `Switched to ${THEMES.find((t) => t.id === next)?.label}`,
                        });
                      }
                    }}
                  >
                    {THEMES.filter(t => t.id !== 'custom').map((t) => (
                      <DropdownMenuRadioItem
                        key={t.id}
                        value={t.id}
                        className="text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-3 w-3 rounded-full border border-border shadow-sm",
                              t.id === "light" && "bg-white",
                              t.id === "dark" && "bg-black",
                              t.id === "purple" && "bg-[#a855f7]",
                              t.id === "sky" && "bg-[#06b6d4]",
                              t.id === "green" && "bg-[#22c55e]",
                              t.id === "emerald" && "bg-[#10b981]",
                              t.id === "orange" && "bg-[#f97316]",
                              t.id === "amber" && "bg-[#f59e0b]",
                              t.id === "red" && "bg-[#ef4444]",
                              t.id === "rose" && "bg-[#f43f5e]",
                              t.id === "pink" && "bg-[#ec4899]",
                              t.id === "indigo" && "bg-[#6366f1]"
                            )}
                          />
                          <span>{t.label}</span>
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
                        <span>Custom Color</span>
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
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

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
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium leading-none">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {user?.roles?.[0] || "Admin"}
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
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/audit-logs")}>
                  <ScrollText className="mr-2 h-4 w-4" />
                  Activity Log
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <DialogContent className="max-w-md gap-4">
          <DialogHeader>
            <DialogTitle>Search admin</DialogTitle>
            <DialogDescription>
              Search users, courses, or reports — same as the bar on larger screens.
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
              placeholder="Search users, courses, reports…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 text-base"
              autoComplete="off"
            />
            <Button type="submit" className="w-full h-11">
              Search
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
  return (
    <nav className="flex flex-col gap-4" aria-label="Main navigation">
      {ADMIN_NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
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
                    <span className="flex-1 truncate">{item.label}</span>
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
