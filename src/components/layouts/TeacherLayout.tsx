import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { LanguagePicker } from "../LanguagePicker";
import { OrgSwitcher } from "../OrgSwitcher";
import { HelpButton } from "../HelpButton";
import {
  GraduationCap,
  CalendarDays,
  BookOpen,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  Settings,
  User,
  Menu,
  Search,
  Sparkles,
  LogOut,
  X,
  Moon,
  Sun,
  PlusCircle,
  FileText,
  Users,
  Video,
  Crown,
  Radio,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/cn";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
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
import { THEMES, type ThemeId } from "../../theme/themes";
import { normalizeAccentTheme } from "../../theme/themePresets";
import { useAppStore } from "../../store/useAppStore";
import { useAuthStore } from "../../store/useAuthStore";
import { toast } from "sonner";
import { AnimatedBackground } from "../AnimatedBackground";
import { Input } from "../ui/input";
import { teacherService } from "../../services/teacherService";
import { assignmentService, type AssignmentDto } from "../../services/assignmentService";
import { ColorPicker } from "../ui/color-picker";
import { NotificationBell } from "../NotificationBell";
import { useUnreadMessages } from "../../hooks/useUnreadMessages";
import { Badge } from "../ui/badge";
import { MobileSearchDialog, type MobileSearchRow } from "./MobileSearchDialog";
import { getAccountRoleLabel, isPlatformAdminAccount } from "../../lib/userRoles";

type NavItem = {
  to: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
};

// Teacher navigation - ALL paths use /teacher/* prefix
const TEACHER_NAV: NavItem[] = [
  { to: "/teacher/dashboard", labelKey: "nav:dashboard", icon: LayoutDashboard },
  { to: "/teacher/courses", labelKey: "nav:myCourses", icon: BookOpen },
  { to: "/teacher/calendar", labelKey: "nav:mySchedule", icon: CalendarDays },
  { to: "/teacher/live-sessions", labelKey: "nav:liveSessions", icon: Radio },
  { to: "/teacher/create-course", labelKey: "nav:createCourse", icon: PlusCircle },
  { to: "/teacher/lessons", labelKey: "nav:lessonsContent", icon: Video },
  { to: "/teacher/assignments", labelKey: "nav:assignments", icon: ClipboardList },
  { to: "/teacher/exams", labelKey: "nav:examsQuizzes", icon: FileText },
  { to: "/teacher/students", labelKey: "nav:students", icon: Users },
  { to: "/teacher/earnings", labelKey: "teacher:earnings.title", icon: Wallet },
  { to: "/teacher/subscription", labelKey: "nav:subscription", icon: Crown },
  { to: "/teacher/messages", labelKey: "nav:messages", icon: Inbox },
  { to: "/teacher/profile", labelKey: "nav:profile", icon: User },
  { to: "/teacher/settings", labelKey: "nav:settings", icon: Settings },
];

interface SearchResult {
  type: 'course' | 'assignment' | 'message';
  id: string;
  title: string;
  description?: string;
  url: string;
}

export function TeacherLayout() {
  const { t } = useTranslation(['nav', 'common', 'auth']);
  const colorMode = useAppStore((s) => s.data.colorMode);
  const setColorMode = useAppStore((s) => s.setColorMode);
  const theme = useAppStore((s) => s.data.theme);
  const customThemeColor = useAppStore((s) => s.data.customThemeColor);
  const setTheme = useAppStore((s) => s.setTheme);
  const setCustomThemeColor = useAppStore((s) => s.setCustomThemeColor);
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { unreadCount: unreadMessages } = useUnreadMessages();

  const handleLogout = () => {
    logout();
    toast.success(t('auth:logoutSuccess'));
    navigate("/");
  };

  const isDarkMode = colorMode === 'dark';

  const toggleDarkMode = () => {
    const next = isDarkMode ? 'light' : 'dark';
    setColorMode(next);
    toast.success(next === 'dark' ? t('common:switchedToDarkMode') : t('common:switchedToLightMode'));
  };

  // Handle search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (search.trim().length === 0) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (search.trim().length < 2) {
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      await performSearch(search.trim());
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const performSearch = async (query: string) => {
    try {
      const results: SearchResult[] = [];
      
      // Search courses
      try {
        const courses = await teacherService.getMyCourses({ pageSize: 50 });
        const courseMatches = courses.items
          .filter(c => 
            c.title.toLowerCase().includes(query.toLowerCase()) ||
            c.description?.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 5)
          .map(c => ({
            type: 'course' as const,
            id: c.id,
            title: c.title,
            description: c.description,
            url: `/teacher/courses`, // Teacher courses page
          }));
        results.push(...courseMatches);
      } catch (error) {
        console.error('Course search error:', error);
      }

      // Search assignments
      try {
        const assignments = await assignmentService.getMyAssignments({ pageSize: 50 });
        const assignmentMatches = assignments.items
          .filter(a => 
            a.title.toLowerCase().includes(query.toLowerCase()) ||
            a.prompt?.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 3)
          .map(a => ({
            type: 'assignment' as const,
            id: a.id,
            title: a.title,
            description: a.prompt,
            url: `/teacher/assignments`,
          }));
        results.push(...assignmentMatches);
      } catch (error) {
        console.error('Assignment search error:', error);
      }

      setSearchResults(results.slice(0, 10));
      setShowResults(results.length > 0);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim().length === 0) return;

    if (searchResults.length > 0) {
      navigate(searchResults[0].url);
      setSearch("");
      setShowResults(false);
      setMobileSearchOpen(false);
    } else {
      navigate(`/teacher/courses?search=${encodeURIComponent(search)}`);
      setSearch("");
      setShowResults(false);
      setMobileSearchOpen(false);
    }
  };

  const handleResultClick = (result: SearchResult | MobileSearchRow) => {
    navigate(result.url);
    setSearch("");
    setShowResults(false);
    setMobileSearchOpen(false);
  };

  const themeLabel = useMemo(
    () => THEMES.find((th) => th.id === theme)?.label ?? t('common:theme'),
    [theme, t]
  );

  const accountRoleLabel = useMemo(
    () => getAccountRoleLabel(user?.roles),
    [user?.roles]
  );
  const showTeacherPortalHint = isPlatformAdminAccount(user?.roles);

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground flex flex-col">
      <AnimatedBackground />

      {/* Skip to content link for accessibility */}
      <a href="#main-content" className="skip-to-content">
        {t('common:skipToContent')}
      </a>

      {/* Premium Header */}
      <header
        className="shrink-0 z-50 border-b border-border/50 glass-strong pt-[env(safe-area-inset-top,0px)]"
        role="banner"
      >
        <div className="mx-auto flex h-16 max-w-[1920px] items-center gap-2 px-3 sm:h-20 sm:gap-4 sm:px-6">
          {/* Logo & Mobile Menu */}
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
                <div className="max-h-[min(70dvh,520px)] overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-2">
                  <TeacherNavList onNavigate={() => setMobileOpen(false)} unreadMessages={unreadMessages} hideSubscription={showTeacherPortalHint} />
                </div>
              </DialogContent>
            </Dialog>

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
                    ease: "linear",
                  }}
                  className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary via-primary/80 to-primary blur-sm opacity-50"
                />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-card border-2 border-background shadow-md"
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                </motion.div>
              </div>
              <div className="hidden min-w-0 leading-tight sm:block">
                <div className="text-base font-bold tracking-tight gradient-text sm:text-lg">
                  AcademiX
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {t('nav:teacherPortal')}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Search Bar */}
          <div ref={searchContainerRef} className="ms-auto hidden w-[400px] max-w-[35vw] items-center lg:flex relative">
            <form onSubmit={handleSearchSubmit} className="relative w-full group">
              <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setShowResults(true);
                  }
                }}
                placeholder={t('common:searchTeacherPlaceholder')}
                className="h-12 ps-11 pe-10 rounded-xl border-2 border-border/50 bg-background/50 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSearchResults([]);
                    setShowResults(false);
                  }}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={t('common:clearSearch')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              
              {/* Search Results Dropdown */}
              {showResults && search.trim().length >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-2 w-full max-h-[400px] overflow-y-auto glass-strong rounded-xl border border-border/60 shadow-xl z-50"
                >
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {t('common:searching')}
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="p-2">
                      {searchResults.map((result) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          type="button"
                          onClick={() => handleResultClick(result)}
                          className="w-full text-start p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {result.type === 'course' && (
                                <BookOpen className="h-4 w-4 text-primary" />
                              )}
                              {result.type === 'assignment' && (
                                <ClipboardList className="h-4 w-4 text-primary" />
                              )}
                              {result.type === 'message' && (
                                <Inbox className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm group-hover:text-primary transition-colors">
                                {result.title}
                              </div>
                              {result.description && (
                                <div className="text-xs text-muted-foreground mt-1 truncate">
                                  {result.description}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1 capitalize">
                                {result.type}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {t('common:noResultsFound')}
                    </div>
                  )}
                </motion.div>
              )}
            </form>
          </div>

          <MobileSearchDialog
            open={mobileSearchOpen}
            onOpenChange={setMobileSearchOpen}
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setShowResults(true);
            }}
            onSubmit={handleSearchSubmit}
            isSearching={isSearching}
            results={searchResults}
            onSelectResult={handleResultClick}
            placeholder={t('common:searchTeacherPlaceholder')}
            renderIcon={(type) => {
              switch (type) {
                case "course":
                  return <BookOpen className="h-4 w-4" />;
                case "assignment":
                  return <ClipboardList className="h-4 w-4" />;
                case "message":
                  return <Inbox className="h-4 w-4" />;
                default:
                  return <Search className="h-4 w-4 opacity-60" />;
              }
            }}
          />

          {/* User Menu & Theme Switcher */}
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 lg:hidden"
              aria-label={t('common:openSearch')}
              onClick={() => setMobileSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
            {showTeacherPortalHint && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5 shrink-0 h-9 px-2 sm:px-3"
                onClick={() => navigate("/admin/dashboard")}
                title={t('nav:returnToAdmin')}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline font-medium">{t('nav:adminDashboard')}</span>
              </Button>
            )}
            {/* Notifications */}
            <NotificationBell />

            {/* Profile Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-9 px-2 rounded-xl">
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
                  <span className="hidden lg:block text-sm font-medium leading-none">
                    {user?.firstName}
                  </span>
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
                <DropdownMenuItem onClick={() => navigate("/teacher/profile")}>
                  <User className="me-2 h-4 w-4" />
                  {t('common:profile')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/teacher/settings")}>
                  <Settings className="me-2 h-4 w-4" />
                  {t('common:settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="me-2 h-4 w-4" />
                  {t('common:logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {theme === 'custom' ? (
              <div className="hidden sm:block">
                <ColorPicker
                  value={customThemeColor || 'hsl(222, 84%, 60%)'}
                  onChange={(color) => {
                    setCustomThemeColor(color);
                  }}
                />
              </div>
            ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="hidden h-10 gap-2 rounded-xl border-2 px-2.5 sm:flex sm:h-11 sm:px-3"
                  title={t('common:theme')}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border-2 border-border shadow-sm"
                    style={{ background: "hsl(var(--primary))" }}
                  />
                  <span className="hidden sm:inline font-medium">
                    {themeLabel}
                  </span>
                  <span className="sm:hidden">{t('common:theme')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-40 glass-strong rounded-xl"
              >
                <DropdownMenuLabel className="font-semibold">
                  {t('common:chooseTheme')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={(v) => {
                    const next = normalizeAccentTheme(v as ThemeId);
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
                    {THEMES.filter(th => th.id !== 'custom' && th.id !== 'dark').map((th) => (
                    <DropdownMenuRadioItem
                      key={th.id}
                      value={th.id}
                      className="rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "h-4 w-4 rounded-full border-2 border-border shadow-sm",
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
                        <span className="font-medium">{th.label}</span>
                      </div>
                    </DropdownMenuRadioItem>
                  ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioItem
                      value="custom"
                      className="rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-4 w-4 rounded-full border-2 border-border shadow-sm"
                          style={{
                            background: customThemeColor || 'hsl(222, 84%, 60%)'
                          }}
                        />
                        <span className="font-medium">{t('common:customColor')}</span>
                      </div>
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            )}
            
            {/* Dark Mode Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDarkMode}
              className="hidden h-11 gap-2 rounded-xl border-2 sm:inline-flex"
              title={isDarkMode ? t('common:switchToLightMode') : t('common:switchToDarkMode')}
            >
              {isDarkMode ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span className="hidden sm:inline font-medium">{t('common:lightMode')}</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span className="hidden sm:inline font-medium">{t('common:darkMode')}</span>
                </>
              )}
            </Button>

            {/* Language Picker */}
            <LanguagePicker compact />

            {/* Org portal entry (only when user has org memberships) */}
            <OrgSwitcher />

            {/* Contact support */}
            <div className="hidden lg:block">
              <HelpButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
      <div className="mx-auto grid w-full max-w-[1920px] grid-cols-1 gap-4 px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[280px_1fr] lg:gap-8 lg:px-6 lg:py-8">
        {/* Premium Sidebar */}
        <aside className="hidden lg:block" role="complementary" aria-label="Navigation sidebar">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="sticky top-0 glass-strong rounded-2xl border border-border/60 p-4 shadow-xl"
          >
            {/* User Profile Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="mb-4 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30">
                  {user?.profilePictureUrl ? (
                    <img
                      src={user.profilePictureUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : user?.firstName ? (
                    <span className="text-sm font-bold">
                      {user.firstName[0]}{user.lastName?.[0] ?? ''}
                    </span>
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {accountRoleLabel}
                  </div>
                  <div className="mt-0.5 truncate text-base font-bold">
                    {user ? `${user.firstName} ${user.lastName}` : t('nav:instructor')}
                  </div>
                  {showTeacherPortalHint && (
                    <p className="mt-1 text-[10px] font-medium text-muted-foreground/90">
                      {t('nav:teacherPortalView')}
                    </p>
                  )}
                  {showTeacherPortalHint && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-2 w-full gap-2 h-8 text-xs"
                      onClick={() => navigate("/admin/dashboard")}
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                      {t('nav:adminDashboard')}
                    </Button>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary/50"
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('nav:activeSemester')}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="mt-3 w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                {t('common:logout')}
              </Button>
            </motion.div>

            {/* Navigation */}
            <TeacherNavList unreadMessages={unreadMessages} hideSubscription={showTeacherPortalHint} />
          </motion.div>
        </aside>

        {/* Main Content Area */}
        <main id="main-content" className="min-w-0" role="main" tabIndex={-1}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-strong min-w-0 rounded-2xl border border-border/60 p-4 pb-24 shadow-xl sm:p-6 sm:pb-24 md:p-8 md:pb-28"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      </div>
    </div>
  );
}

function TeacherNavList({ onNavigate, unreadMessages = 0, hideSubscription = false }: { onNavigate?: () => void; unreadMessages?: number; hideSubscription?: boolean }) {
  const { t } = useTranslation(['nav']);
  const navItems = hideSubscription
    ? TEACHER_NAV.filter((item) => item.to !== "/teacher/subscription")
    : TEACHER_NAV;

  return (
    <nav className="flex flex-col gap-1.5" aria-label="Main navigation">
      {navItems.map((item) => {
        const isMessages = item.to === "/teacher/messages";
        const showBadge = isMessages && unreadMessages > 0;
        
        return (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 min-h-[44px] touch-manipulation",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              isActive
                ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-md shadow-primary/10 border border-primary/30"
                : "text-foreground/70 hover:text-foreground hover:bg-accent/50 hover:translate-x-1"
            )
          }
        >
          {({ isActive }) => (
            <>
              <motion.div
                animate={
                  isActive ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}
                }
                transition={{ duration: 0.3 }}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive && "text-primary"
                  )}
                />
              </motion.div>
              <span className="flex-1">{t(item.labelKey)}</span>
              {showBadge && (
                <Badge
                  variant="destructive"
                  className="h-5 min-w-5 shrink-0 justify-center px-1.5 text-xs tabular-nums"
                >
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </Badge>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute end-0 top-1 bottom-1 w-1 rounded-l-full bg-primary shadow-sm shadow-primary/50"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </>
          )}
        </NavLink>
        );
      })}
    </nav>
  );
}
