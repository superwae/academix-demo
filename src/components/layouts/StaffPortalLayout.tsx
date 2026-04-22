import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  LayoutDashboard,
  Menu,
  LogOut,
  Search,
  ChevronDown,
  Moon,
  Sun,
  CreditCard,
  Wallet,
  MessageSquare,
  Settings,
  Calculator,
  Building2,
  Receipt,
  FileText,
  UserPlus,
  Users,
  CalendarDays,
  GraduationCap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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
};

type NavSection = { titleKey: string; items: NavItem[] };

export type StaffPortalVariant = "accountant" | "secretary";

const ACCOUNTANT_NAV: NavSection[] = [
  {
    titleKey: "admin:staffLayout.nav.overview",
    items: [{ to: "/accountant/dashboard", labelKey: "admin:staffLayout.nav.dashboard", icon: LayoutDashboard }],
  },
  {
    titleKey: "admin:staffLayout.nav.finance",
    items: [
      { to: "/accountant/transactions", labelKey: "admin:staffLayout.nav.transactions", icon: CreditCard },
      { to: "/accountant/payouts", labelKey: "admin:staffLayout.nav.payouts", icon: Wallet },
      { to: "/accountant/invoices", labelKey: "admin:staffLayout.nav.invoices", icon: Receipt },
    ],
  },
  {
    titleKey: "admin:staffLayout.nav.compliance",
    items: [{ to: "/accountant/reports", labelKey: "admin:staffLayout.nav.reports", icon: FileText }],
  },
  {
    titleKey: "admin:staffLayout.nav.workspace",
    items: [{ to: "/accountant/messages", labelKey: "admin:staffLayout.nav.messages", icon: MessageSquare }],
  },
  {
    titleKey: "admin:staffLayout.nav.account",
    items: [{ to: "/accountant/settings", labelKey: "admin:staffLayout.nav.settings", icon: Settings }],
  },
];

const SECRETARY_NAV: NavSection[] = [
  {
    titleKey: "admin:staffLayout.nav.overview",
    items: [{ to: "/secretary/dashboard", labelKey: "admin:staffLayout.nav.dashboard", icon: LayoutDashboard }],
  },
  {
    titleKey: "admin:staffLayout.nav.operations",
    items: [
      { to: "/secretary/messages", labelKey: "admin:staffLayout.nav.messages", icon: MessageSquare },
      { to: "/secretary/enrollments", labelKey: "admin:staffLayout.nav.enrollments", icon: UserPlus },
      { to: "/secretary/directory", labelKey: "admin:staffLayout.nav.directory", icon: Users },
    ],
  },
  {
    titleKey: "admin:staffLayout.nav.scheduling",
    items: [{ to: "/secretary/calendar", labelKey: "admin:staffLayout.nav.calendar", icon: CalendarDays }],
  },
  {
    titleKey: "admin:staffLayout.nav.account",
    items: [{ to: "/secretary/settings", labelKey: "admin:staffLayout.nav.settings", icon: Settings }],
  },
];

const PORTAL_META: Record<
  StaffPortalVariant,
  {
    home: string;
    subtitleKey: string;
    badgeKey: string;
    BrandIcon: ComponentType<{ className?: string }>;
    nav: NavSection[];
    gradient: string;
  }
> = {
  accountant: {
    home: "/accountant/dashboard",
    subtitleKey: "admin:staffLayout.portals.financeSubtitle",
    badgeKey: "admin:staffLayout.portals.financeBadge",
    BrandIcon: Calculator,
    nav: ACCOUNTANT_NAV,
    gradient: "from-violet-600 to-indigo-600",
  },
  secretary: {
    home: "/secretary/dashboard",
    subtitleKey: "admin:staffLayout.portals.opsSubtitle",
    badgeKey: "admin:staffLayout.portals.opsBadge",
    BrandIcon: Building2,
    nav: SECRETARY_NAV,
    gradient: "from-sky-600 to-cyan-600",
  },
};

function StaffNavList({
  variant,
  onNavigate,
  unreadMessages,
}: {
  variant: StaffPortalVariant;
  onNavigate?: () => void;
  unreadMessages: number;
}) {
  const meta = PORTAL_META[variant];
  const { t } = useTranslation(["admin", "common"]);
  const messagesPath =
    variant === "accountant" ? "/accountant/messages" : "/secretary/messages";

  return (
    <nav className="flex flex-col gap-4" aria-label={t("admin:staffLayout.nav.mainNavigationLabel")}>
      {meta.nav.map((section) => (
        <div key={section.titleKey}>
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t(section.titleKey)}
          </div>
          <div className="mt-1 flex flex-col gap-0.5">
            {section.items.map((item) => {
              const isMessages = item.to === messagesPath;
              const showBadge = isMessages && unreadMessages > 0;
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
                      {showBadge && (
                        <Badge
                          variant="destructive"
                          className="h-5 min-w-5 shrink-0 justify-center px-1.5 text-xs tabular-nums"
                        >
                          {unreadMessages > 99 ? "99+" : unreadMessages}
                        </Badge>
                      )}
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

export function StaffPortalShell({
  variant,
  children,
}: {
  variant: StaffPortalVariant;
  children: ReactNode;
}) {
  const meta = PORTAL_META[variant];
  const theme = useAppStore((s) => s.data.theme);
  const customThemeColor = useAppStore((s) => s.data.customThemeColor);
  const mixTheme = useAppStore((s) => s.data.mixTheme);
  const setTheme = useAppStore((s) => s.setTheme);
  const setCustomThemeColor = useAppStore((s) => s.setCustomThemeColor);
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation(["admin", "common"]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { unreadCount: unreadMessages } = useUnreadMessages();

  const isDarkMode = theme === "dark";

  const handleLogout = () => {
    logout();
    toast.success(t("admin:staffLayout.menu.logoutToast"));
    navigate("/");
  };

  const toggleDarkMode = () => {
    const newTheme = isDarkMode ? "light" : "dark";
    setTheme(newTheme);
    toast.success(t("admin:staffLayout.menu.switchedToMode", { mode: newTheme }));
  };

  const themeLabel = useMemo(
    () => THEMES.find((th) => th.id === theme)?.label ?? t("admin:staffLayout.menu.themeLabelFallback"),
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
          <div className="flex items-center gap-3">
            <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label={t("admin:staffLayout.header.openNavigation")}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm p-0">
                <DialogHeader className="p-6 border-b">
                  <DialogTitle className="text-xl">{t("admin:staffLayout.appName")}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[min(70dvh,560px)] overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-2">
                  <StaffNavList
                    variant={variant}
                    onNavigate={() => setMobileOpen(false)}
                    unreadMessages={unreadMessages}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <NavLink to={meta.home} className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-md bg-gradient-to-br",
                  meta.gradient
                )}
              >
                <meta.BrandIcon className="h-5 w-5" />
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-base font-bold tracking-tight">{t("admin:staffLayout.appName")}</div>
                <div className="text-[10px] text-muted-foreground font-medium -mt-0.5">
                  {t(meta.subtitleKey)}
                </div>
              </div>
            </NavLink>

            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary border border-primary/15">
              {t(meta.badgeKey)}
            </div>
          </div>

          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={
                  variant === "accountant"
                    ? t("admin:staffLayout.search.placeholderAccountant")
                    : t("admin:staffLayout.search.placeholderSecretary")
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9 h-9 bg-muted/50 border-transparent focus:border-primary/30 focus:bg-background"
              />
            </div>
          </div>

          <div className="ms-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 md:hidden"
              aria-label={t("admin:staffLayout.header.openSearch")}
              onClick={() => setMobileSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>

            {theme === "custom" ? (
              <ColorPicker
                value={customThemeColor || "hsl(222, 84%, 60%)"}
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
                    {t("admin:staffLayout.menu.chooseTheme")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={(v) => {
                      const next = v as ThemeId;
                      if (next === "custom") {
                        if (!customThemeColor) {
                          const computed = getComputedStyle(
                            document.documentElement
                          )
                            .getPropertyValue("--primary")
                            .trim();
                          if (computed) {
                            const hslValues = computed.split(" ");
                            if (hslValues.length >= 3) {
                              const h = hslValues[0];
                              const s = hslValues[1];
                              const l = hslValues[2];
                              setCustomThemeColor(`hsl(${h} ${s} ${l})`);
                            }
                          }
                        }
                        setTheme("custom");
                        toast.success(t("admin:staffLayout.menu.customThemeEnabled"), {
                          description: t("admin:staffLayout.menu.customThemeEnabledDesc"),
                        });
                      } else {
                        setTheme(next);
                        toast.success(t("admin:staffLayout.menu.themeUpdated"), {
                          description: t("admin:staffLayout.menu.switchedToTheme", {
                            theme: THEMES.find((th) => th.id === next)?.label ?? "",
                          }),
                        });
                      }
                    }}
                  >
                    {THEMES.filter((th) => th.id !== "custom").map((th) => (
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
                              th.id === "emerald" && "bg-[#10b981]",
                              th.id === "sky" && "bg-[#06b6d4]",
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
                          style={{
                            background:
                              customThemeColor || "hsl(222, 84%, 60%)",
                          }}
                        />
                        <span>{t("admin:staffLayout.menu.customColor")}</span>
                      </div>
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              className="h-9 w-9"
              title={isDarkMode ? t("admin:staffLayout.menu.switchToLightMode") : t("admin:staffLayout.menu.switchToDarkMode")}
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-9 px-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </div>
                  <div className="hidden lg:block text-start max-w-[8rem]">
                    <p className="text-sm font-medium leading-none truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {t(meta.subtitleKey)}
                    </p>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground hidden lg:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(meta.home)}>
                  <GraduationCap className="me-2 h-4 w-4" />
                  {t("admin:staffLayout.menu.portalHome")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="me-2 h-4 w-4" />
                  {t("admin:staffLayout.menu.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <Dialog open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <DialogContent className="max-w-md gap-4">
          <DialogHeader>
            <DialogTitle>{t("common:search")}</DialogTitle>
            <DialogDescription>
              {variant === "accountant"
                ? t("admin:staffLayout.search.descriptionAccountant")
                : t("admin:staffLayout.search.descriptionSecretary")}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setMobileSearchOpen(false);
              const q = searchQuery.trim();
              const target =
                variant === "accountant"
                  ? "/accountant/transactions"
                  : "/secretary/directory";
              navigate(q.length > 0 ? `${target}?q=${encodeURIComponent(q)}` : target);
            }}
          >
            <Input
              type="search"
              placeholder={
                variant === "accountant"
                  ? t("admin:staffLayout.search.placeholderAccountant")
                  : t("admin:staffLayout.search.placeholderSecretary")
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 text-base"
              autoComplete="off"
            />
            <Button type="submit" className="h-11 w-full">
              {t("common:search")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mx-auto grid max-w-[1920px] grid-cols-1 gap-4 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[260px_1fr] lg:gap-6 lg:px-6 lg:py-6">
        <aside
          className="hidden lg:block"
          role="complementary"
          aria-label={t("admin:staffLayout.nav.sidebarLabel")}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="sticky top-[5.5rem] glass-strong rounded-2xl border border-border/60 p-3 shadow-xl max-h-[calc(100vh-6.5rem)] overflow-y-auto"
          >
            <StaffNavList variant={variant} unreadMessages={unreadMessages} />
          </motion.div>
        </aside>

        <main id="main-content" className="min-w-0" role="main" tabIndex={-1}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-strong min-w-0 rounded-2xl border border-border/60 p-4 shadow-xl sm:p-6 md:p-8"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export function AccountantLayout() {
  return (
    <StaffPortalShell variant="accountant">
      <Outlet />
    </StaffPortalShell>
  );
}

export function SecretaryLayout() {
  return (
    <StaffPortalShell variant="secretary">
      <Outlet />
    </StaffPortalShell>
  );
}
