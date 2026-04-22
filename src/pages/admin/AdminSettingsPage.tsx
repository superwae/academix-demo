import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Settings,
  Flag,
  Mail,
  Bell,
  Shield,
  AlertTriangle,
  Check,
  Palette,
  Globe,
  Database,
  Key,
  Users,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Clock,
  Server,
  Zap,
  FileText,
  CreditCard,
  Building,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  Save,
  RotateCcw,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { cn } from "../../lib/cn";
import { useAppStore } from "../../store/useAppStore";
import { THEMES, type ThemeId } from "../../theme/themes";
import { toast } from "sonner";
import { ColorPicker } from "../../components/ui/color-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

// Settings tabs
type SettingsTab = "general" | "appearance" | "security" | "email" | "notifications" | "integrations" | "backup" | "advanced";

const SETTINGS_TABS: { id: SettingsTab; labelKey: string; icon: React.ElementType; descKey: string }[] = [
  { id: "general", labelKey: "admin:settings.tabs.general", icon: Settings, descKey: "admin:settings.tabs.generalDesc" },
  { id: "appearance", labelKey: "admin:settings.tabs.appearance", icon: Palette, descKey: "admin:settings.tabs.appearanceDesc" },
  { id: "security", labelKey: "admin:settings.tabs.security", icon: Shield, descKey: "admin:settings.tabs.securityDesc" },
  { id: "email", labelKey: "admin:settings.tabs.email", icon: Mail, descKey: "admin:settings.tabs.emailDesc" },
  { id: "notifications", labelKey: "admin:settings.tabs.notifications", icon: Bell, descKey: "admin:settings.tabs.notificationsDesc" },
  { id: "integrations", labelKey: "admin:settings.tabs.integrations", icon: Zap, descKey: "admin:settings.tabs.integrationsDesc" },
  { id: "backup", labelKey: "admin:settings.tabs.backup", icon: Database, descKey: "admin:settings.tabs.backupDesc" },
  { id: "advanced", labelKey: "admin:settings.tabs.advanced", icon: Server, descKey: "admin:settings.tabs.advancedDesc" },
];

// Mock Feature Flags
const initialFeatureFlags = [
  { id: "ff1", nameKey: "admin:settings.advanced.flags.newDashboard", descKey: "admin:settings.advanced.flags.newDashboardDesc", enabled: true, category: "general" },
  { id: "ff2", nameKey: "admin:settings.advanced.flags.aiRecommendations", descKey: "admin:settings.advanced.flags.aiRecommendationsDesc", enabled: false, category: "experimental" },
  { id: "ff3", nameKey: "admin:settings.advanced.flags.liveStreaming", descKey: "admin:settings.advanced.flags.liveStreamingDesc", enabled: true, category: "beta" },
  { id: "ff4", nameKey: "admin:settings.advanced.flags.paymentInstallments", descKey: "admin:settings.advanced.flags.paymentInstallmentsDesc", enabled: false, category: "beta" },
  { id: "ff5", nameKey: "admin:settings.advanced.flags.twoFactor", descKey: "admin:settings.advanced.flags.twoFactorDesc", enabled: true, category: "security" },
  { id: "ff6", nameKey: "admin:settings.advanced.flags.apiRateLimiting", descKey: "admin:settings.advanced.flags.apiRateLimitingDesc", enabled: true, category: "security" },
  { id: "ff7", nameKey: "admin:settings.advanced.flags.courseAnalytics", descKey: "admin:settings.advanced.flags.courseAnalyticsDesc", enabled: true, category: "general" },
  { id: "ff8", nameKey: "admin:settings.advanced.flags.socialLogin", descKey: "admin:settings.advanced.flags.socialLoginDesc", enabled: false, category: "beta" },
];

// Mock Integrations
const INTEGRATIONS = [
  { id: "stripe", nameKey: "admin:settings.integrations.services.stripe", descKey: "admin:settings.integrations.services.stripeDesc", connected: true, icon: CreditCard },
  { id: "google", nameKey: "admin:settings.integrations.services.google", descKey: "admin:settings.integrations.services.googleDesc", connected: true, icon: Globe },
  { id: "slack", nameKey: "admin:settings.integrations.services.slack", descKey: "admin:settings.integrations.services.slackDesc", connected: false, icon: Bell },
  { id: "zoom", nameKey: "admin:settings.integrations.services.zoom", descKey: "admin:settings.integrations.services.zoomDesc", connected: true, icon: Monitor },
  { id: "mailchimp", nameKey: "admin:settings.integrations.services.mailchimp", descKey: "admin:settings.integrations.services.mailchimpDesc", connected: false, icon: Mail },
];

function SettingSection({ title, description, children, icon: Icon }: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
          <div>
            <h3 className="font-semibold">{title}</h3>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children, className }: {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-lg border border-border bg-background/50 p-4", className)}>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function AdminSettingsPage() {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [featureFlags, setFeatureFlags] = useState(initialFeatureFlags);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Theme settings
  const theme = useAppStore((s) => s.data.theme);
  const customThemeColor = useAppStore((s) => s.data.customThemeColor);
  const setTheme = useAppStore((s) => s.setTheme);
  const setCustomThemeColor = useAppStore((s) => s.setCustomThemeColor);

  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    platformName: "AcademiX LMS",
    tagline: "Learn Without Limits",
    timezone: "UTC",
    language: "en",
    dateFormat: "MM/DD/YYYY",
    currency: "USD",
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    forceHttps: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    passwordMinLength: 12,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecial: true,
    twoFactorRequired: false,
    allowRememberMe: true,
    ipWhitelist: "",
  });

  // Email settings
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: "smtp.academix.com",
    smtpPort: "587",
    smtpUsername: "noreply@academix.com",
    smtpPassword: "••••••••••••",
    senderName: "AcademiX LMS",
    senderEmail: "noreply@academix.com",
    enableSsl: true,
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    weeklyDigest: true,
    courseUpdates: true,
    paymentAlerts: true,
    securityAlerts: true,
    marketingEmails: false,
  });

  const toggleFeatureFlag = (flagId: string) => {
    setFeatureFlags((prev) =>
      prev.map((flag) =>
        flag.id === flagId ? { ...flag, enabled: !flag.enabled } : flag
      )
    );
    toast.success(t('admin:settings.flagUpdated'));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "general": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "experimental": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "beta": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "security": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const themeLabel = useMemo(
    () => THEMES.find((th) => th.id === theme)?.label ?? t('common:theme'),
    [theme, t]
  );

  const handleSaveSettings = () => {
    toast.success(t('admin:settings.saveToast'), {
      description: t('admin:settings.saveToastDesc'),
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="space-y-6">
            <SettingSection title={t('admin:settings.general.platformIdentity')} description={t('admin:settings.general.platformIdentityDesc')} icon={Building}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.general.platformName')}</label>
                  <Input
                    value={generalSettings.platformName}
                    onChange={(e) => setGeneralSettings((p) => ({ ...p, platformName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.general.tagline')}</label>
                  <Input
                    value={generalSettings.tagline}
                    onChange={(e) => setGeneralSettings((p) => ({ ...p, tagline: e.target.value }))}
                  />
                </div>
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.general.regional')} description={t('admin:settings.general.regionalDesc')} icon={Globe}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.general.timezone')}</label>
                  <select
                    value={generalSettings.timezone}
                    onChange={(e) => setGeneralSettings((p) => ({ ...p, timezone: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="UTC">{t('admin:settings.general.timezones.utc')}</option>
                    <option value="America/New_York">{t('admin:settings.general.timezones.eastern')}</option>
                    <option value="America/Los_Angeles">{t('admin:settings.general.timezones.pacific')}</option>
                    <option value="Europe/London">{t('admin:settings.general.timezones.london')}</option>
                    <option value="Asia/Dubai">{t('admin:settings.general.timezones.dubai')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.general.language')}</label>
                  <select
                    value={generalSettings.language}
                    onChange={(e) => setGeneralSettings((p) => ({ ...p, language: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="en">{t('admin:settings.general.languages.en')}</option>
                    <option value="ar">{t('admin:settings.general.languages.ar')}</option>
                    <option value="es">{t('admin:settings.general.languages.es')}</option>
                    <option value="fr">{t('admin:settings.general.languages.fr')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.general.dateFormat')}</label>
                  <select
                    value={generalSettings.dateFormat}
                    onChange={(e) => setGeneralSettings((p) => ({ ...p, dateFormat: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.general.currency')}</label>
                  <select
                    value={generalSettings.currency}
                    onChange={(e) => setGeneralSettings((p) => ({ ...p, currency: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="USD">{t('admin:settings.general.currencies.usd')}</option>
                    <option value="EUR">{t('admin:settings.general.currencies.eur')}</option>
                    <option value="GBP">{t('admin:settings.general.currencies.gbp')}</option>
                    <option value="AED">{t('admin:settings.general.currencies.aed')}</option>
                  </select>
                </div>
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.general.maintenance')} description={t('admin:settings.general.maintenanceDesc')} icon={AlertTriangle}>
              <SettingRow
                label={t('admin:settings.general.enableMaintenance')}
                description={t('admin:settings.general.enableMaintenanceDesc')}
              >
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </SettingRow>
              {maintenanceMode && (
                <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">{t('admin:settings.general.maintenanceActive')}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('admin:settings.general.maintenanceActiveDesc')}
                  </p>
                </div>
              )}
            </SettingSection>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <SettingSection title={t('admin:settings.appearance.theme')} description={t('admin:settings.appearance.themeDesc')} icon={Palette}>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium w-24">{t('admin:settings.appearance.mode')}</span>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                      className="gap-2"
                    >
                      <Sun className="h-4 w-4" />
                      {t('admin:settings.appearance.light')}
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      className="gap-2"
                    >
                      <Moon className="h-4 w-4" />
                      {t('admin:settings.appearance.dark')}
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">{t('admin:settings.appearance.colorTheme')}</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                    {THEMES.filter(th => th.id !== 'custom' && th.id !== 'light' && th.id !== 'dark').map((th) => (
                      <button
                        key={th.id}
                        onClick={() => {
                          setTheme(th.id);
                          toast.success(t('admin:settings.appearance.themeChanged', { theme: th.label }));
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all",
                          theme === th.id
                            ? "border-primary bg-primary/5"
                            : "border-transparent hover:border-border hover:bg-muted/50"
                        )}
                      >
                        <span
                          className={cn(
                            "h-8 w-8 rounded-full border-2 border-white shadow-md",
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
                        <span className="text-[10px] font-medium">{th.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t('admin:settings.appearance.customColor')}</p>
                      <p className="text-xs text-muted-foreground">{t('admin:settings.appearance.customColorDesc')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <ColorPicker
                        value={customThemeColor || 'hsl(222, 84%, 60%)'}
                        onChange={(color) => {
                          setCustomThemeColor(color);
                          setTheme('custom');
                          toast.success(t('admin:settings.appearance.customColorApplied'));
                        }}
                      />
                      {theme === 'custom' && (
                        <span className="text-xs text-primary font-medium">{t('admin:settings.appearance.active')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.appearance.branding')} description={t('admin:settings.appearance.brandingDesc')} icon={Building}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.appearance.platformLogo')}</label>
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <Button variant="outline" size="sm">{t('admin:settings.appearance.uploadLogo')}</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.appearance.favicon')}</label>
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <Button variant="outline" size="sm">{t('admin:settings.appearance.uploadFavicon')}</Button>
                  </div>
                </div>
              </div>
            </SettingSection>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <SettingSection title={t('admin:settings.security.authentication')} description={t('admin:settings.security.authenticationDesc')} icon={Lock}>
              <div className="space-y-4">
                <SettingRow label={t('admin:settings.security.forceHttps')} description={t('admin:settings.security.forceHttpsDesc')}>
                  <Switch
                    checked={securitySettings.forceHttps}
                    onCheckedChange={(v) => setSecuritySettings((p) => ({ ...p, forceHttps: v }))}
                  />
                </SettingRow>
                <SettingRow label={t('admin:settings.security.twoFactor')} description={t('admin:settings.security.twoFactorDesc')}>
                  <Switch
                    checked={securitySettings.twoFactorRequired}
                    onCheckedChange={(v) => setSecuritySettings((p) => ({ ...p, twoFactorRequired: v }))}
                  />
                </SettingRow>
                <SettingRow label={t('admin:settings.security.rememberMe')} description={t('admin:settings.security.rememberMeDesc')}>
                  <Switch
                    checked={securitySettings.allowRememberMe}
                    onCheckedChange={(v) => setSecuritySettings((p) => ({ ...p, allowRememberMe: v }))}
                  />
                </SettingRow>
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.security.session')} description={t('admin:settings.security.sessionDesc')} icon={Clock}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.security.sessionTimeout')}</label>
                  <Input
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings((p) => ({ ...p, sessionTimeout: parseInt(e.target.value) || 30 }))}
                  />
                  <p className="text-xs text-muted-foreground">{t('admin:settings.security.autoLogout')}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.security.maxLogin')}</label>
                  <Input
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings((p) => ({ ...p, maxLoginAttempts: parseInt(e.target.value) || 5 }))}
                  />
                  <p className="text-xs text-muted-foreground">{t('admin:settings.security.beforeLockout')}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.security.lockoutDuration')}</label>
                  <Input
                    type="number"
                    value={securitySettings.lockoutDuration}
                    onChange={(e) => setSecuritySettings((p) => ({ ...p, lockoutDuration: parseInt(e.target.value) || 15 }))}
                  />
                  <p className="text-xs text-muted-foreground">{t('admin:settings.security.timeBeforeUnlock')}</p>
                </div>
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.security.passwordPolicy')} description={t('admin:settings.security.passwordPolicyDesc')} icon={Key}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.security.minLength')}</label>
                  <Input
                    type="number"
                    value={securitySettings.passwordMinLength}
                    onChange={(e) => setSecuritySettings((p) => ({ ...p, passwordMinLength: parseInt(e.target.value) || 8 }))}
                    className="max-w-32"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SettingRow label={t('admin:settings.security.requireUppercase')} description={t('admin:settings.security.requireUppercaseDesc')}>
                    <Switch
                      checked={securitySettings.passwordRequireUppercase}
                      onCheckedChange={(v) => setSecuritySettings((p) => ({ ...p, passwordRequireUppercase: v }))}
                    />
                  </SettingRow>
                  <SettingRow label={t('admin:settings.security.requireLowercase')} description={t('admin:settings.security.requireLowercaseDesc')}>
                    <Switch
                      checked={securitySettings.passwordRequireLowercase}
                      onCheckedChange={(v) => setSecuritySettings((p) => ({ ...p, passwordRequireLowercase: v }))}
                    />
                  </SettingRow>
                  <SettingRow label={t('admin:settings.security.requireNumbers')} description={t('admin:settings.security.requireNumbersDesc')}>
                    <Switch
                      checked={securitySettings.passwordRequireNumbers}
                      onCheckedChange={(v) => setSecuritySettings((p) => ({ ...p, passwordRequireNumbers: v }))}
                    />
                  </SettingRow>
                  <SettingRow label={t('admin:settings.security.requireSpecial')} description={t('admin:settings.security.requireSpecialDesc')}>
                    <Switch
                      checked={securitySettings.passwordRequireSpecial}
                      onCheckedChange={(v) => setSecuritySettings((p) => ({ ...p, passwordRequireSpecial: v }))}
                    />
                  </SettingRow>
                </div>
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.security.ipWhitelist')} description={t('admin:settings.security.ipWhitelistDesc')} icon={Shield}>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin:settings.security.allowedIps')}</label>
                <Input
                  placeholder={t('admin:settings.security.ipPlaceholder')}
                  value={securitySettings.ipWhitelist}
                  onChange={(e) => setSecuritySettings((p) => ({ ...p, ipWhitelist: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin:settings.security.ipHelp')}
                </p>
              </div>
            </SettingSection>
          </div>
        );

      case "email":
        return (
          <div className="space-y-6">
            <SettingSection title={t('admin:settings.email.smtp')} description={t('admin:settings.email.smtpDesc')} icon={Mail}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.email.smtpHost')}</label>
                  <Input
                    value={emailSettings.smtpHost}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, smtpHost: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.email.smtpPort')}</label>
                  <Input
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, smtpPort: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.email.username')}</label>
                  <Input
                    value={emailSettings.smtpUsername}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, smtpUsername: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.email.password')}</label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={emailSettings.smtpPassword}
                      onChange={(e) => setEmailSettings((p) => ({ ...p, smtpPassword: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <SettingRow label={t('admin:settings.email.enableSsl')} description={t('admin:settings.email.enableSslDesc')} className="flex-1">
                  <Switch
                    checked={emailSettings.enableSsl}
                    onCheckedChange={(v) => setEmailSettings((p) => ({ ...p, enableSsl: v }))}
                  />
                </SettingRow>
              </div>
              <div className="mt-4">
                <Button variant="outline" className="gap-2">
                  <Mail className="h-4 w-4" />
                  {t('admin:settings.email.sendTest')}
                </Button>
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.email.senderInfo')} description={t('admin:settings.email.senderInfoDesc')} icon={Users}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.email.senderName')}</label>
                  <Input
                    value={emailSettings.senderName}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, senderName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.email.senderEmail')}</label>
                  <Input
                    type="email"
                    value={emailSettings.senderEmail}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, senderEmail: e.target.value }))}
                  />
                </div>
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.email.templates')} description={t('admin:settings.email.templatesDesc')} icon={FileText}>
              <div className="space-y-2">
                {[
                  { key: 'welcome', label: t('admin:settings.email.templateNames.welcome') },
                  { key: 'passwordReset', label: t('admin:settings.email.templateNames.passwordReset') },
                  { key: 'courseEnrollment', label: t('admin:settings.email.templateNames.courseEnrollment') },
                  { key: 'paymentReceipt', label: t('admin:settings.email.templateNames.paymentReceipt') },
                  { key: 'accountVerification', label: t('admin:settings.email.templateNames.accountVerification') },
                ].map((template) => (
                  <div
                    key={template.key}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4"
                  >
                    <span className="font-medium">{template.label}</span>
                    <Button variant="ghost" size="sm" className="gap-1">
                      {t('common:edit')}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </SettingSection>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <SettingSection title={t('admin:settings.notifications.channels')} description={t('admin:settings.notifications.channelsDesc')} icon={Bell}>
              <div className="space-y-4">
                <SettingRow label={t('admin:settings.notifications.email')} description={t('admin:settings.notifications.emailDesc')}>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, emailNotifications: v }))}
                  />
                </SettingRow>
                <SettingRow label={t('admin:settings.notifications.push')} description={t('admin:settings.notifications.pushDesc')}>
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, pushNotifications: v }))}
                  />
                </SettingRow>
                <SettingRow label={t('admin:settings.notifications.sms')} description={t('admin:settings.notifications.smsDesc')}>
                  <Switch
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, smsNotifications: v }))}
                  />
                </SettingRow>
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.notifications.types')} description={t('admin:settings.notifications.typesDesc')} icon={Settings}>
              <div className="space-y-4">
                <SettingRow label={t('admin:settings.notifications.courseUpdates')} description={t('admin:settings.notifications.courseUpdatesDesc')}>
                  <Switch
                    checked={notificationSettings.courseUpdates}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, courseUpdates: v }))}
                  />
                </SettingRow>
                <SettingRow label={t('admin:settings.notifications.paymentAlerts')} description={t('admin:settings.notifications.paymentAlertsDesc')}>
                  <Switch
                    checked={notificationSettings.paymentAlerts}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, paymentAlerts: v }))}
                  />
                </SettingRow>
                <SettingRow label={t('admin:settings.notifications.securityAlerts')} description={t('admin:settings.notifications.securityAlertsDesc')}>
                  <Switch
                    checked={notificationSettings.securityAlerts}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, securityAlerts: v }))}
                  />
                </SettingRow>
                <SettingRow label={t('admin:settings.notifications.weeklyDigest')} description={t('admin:settings.notifications.weeklyDigestDesc')}>
                  <Switch
                    checked={notificationSettings.weeklyDigest}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, weeklyDigest: v }))}
                  />
                </SettingRow>
                <SettingRow label={t('admin:settings.notifications.marketing')} description={t('admin:settings.notifications.marketingDesc')}>
                  <Switch
                    checked={notificationSettings.marketingEmails}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, marketingEmails: v }))}
                  />
                </SettingRow>
              </div>
            </SettingSection>
          </div>
        );

      case "integrations":
        return (
          <div className="space-y-6">
            <SettingSection title={t('admin:settings.integrations.connected')} description={t('admin:settings.integrations.connectedDesc')} icon={Zap}>
              <div className="space-y-4">
                {INTEGRATIONS.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <integration.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{t(integration.nameKey)}</p>
                        <p className="text-sm text-muted-foreground">{t(integration.descKey)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {integration.connected ? (
                        <>
                          <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            {t('admin:settings.integrations.statusConnected')}
                          </span>
                          <Button variant="outline" size="sm">{t('admin:settings.integrations.configure')}</Button>
                        </>
                      ) : (
                        <Button size="sm">{t('admin:settings.integrations.connect')}</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.integrations.apiKeys')} description={t('admin:settings.integrations.apiKeysDesc')} icon={Key}>
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-background/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t('admin:settings.integrations.prodKey')}</p>
                      <p className="text-sm text-muted-foreground">{t('admin:settings.integrations.prodKeyDesc')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                        {showApiKey ? "sk_live_abc123xyz789..." : "sk_live_••••••••••••"}
                      </code>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowApiKey(!showApiKey)}>
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t('admin:settings.integrations.regenerate')}
                </Button>
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.integrations.webhooks')} description={t('admin:settings.integrations.webhooksDesc')} icon={ExternalLink}>
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                  <Zap className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">{t('admin:settings.integrations.noWebhooks')}</p>
                  <Button variant="outline" size="sm" className="mt-4">
                    {t('admin:settings.integrations.addWebhook')}
                  </Button>
                </div>
              </div>
            </SettingSection>
          </div>
        );

      case "backup":
        return (
          <div className="space-y-6">
            <SettingSection title={t('admin:settings.backup.export')} description={t('admin:settings.backup.exportDesc')} icon={Download}>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { key: 'users', label: t('admin:settings.backup.items.users') },
                  { key: 'courses', label: t('admin:settings.backup.items.courses') },
                  { key: 'enrollments', label: t('admin:settings.backup.items.enrollments') },
                  { key: 'transactions', label: t('admin:settings.backup.items.transactions') },
                  { key: 'auditLogs', label: t('admin:settings.backup.items.auditLogs') },
                  { key: 'fullBackup', label: t('admin:settings.backup.items.fullBackup') },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4"
                  >
                    <span className="font-medium">{item.label}</span>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      {t('admin:users.export')}
                    </Button>
                  </div>
                ))}
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.backup.import')} description={t('admin:settings.backup.importDesc')} icon={Upload}>
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 font-medium">{t('admin:settings.backup.dropFiles')}</p>
                <p className="text-sm text-muted-foreground">{t('admin:settings.backup.dropFilesDesc')}</p>
                <Button variant="outline" size="sm" className="mt-4">
                  {t('admin:settings.backup.selectFiles')}
                </Button>
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.backup.automated')} description={t('admin:settings.backup.automatedDesc')} icon={Clock}>
              <div className="space-y-4">
                <SettingRow label={t('admin:settings.backup.enableAutomated')} description={t('admin:settings.backup.enableAutomatedDesc')}>
                  <Switch checked onCheckedChange={() => {}} />
                </SettingRow>
                <SettingRow label={t('admin:settings.backup.retention')} description={t('admin:settings.backup.retentionDesc')}>
                  <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" defaultValue="30">
                    <option value="7">{t('admin:settings.backup.retentionOptions.7days')}</option>
                    <option value="14">{t('admin:settings.backup.retentionOptions.14days')}</option>
                    <option value="30">{t('admin:settings.backup.retentionOptions.30days')}</option>
                    <option value="90">{t('admin:settings.backup.retentionOptions.90days')}</option>
                  </select>
                </SettingRow>
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.backup.dangerZone')} description={t('admin:settings.backup.dangerZoneDesc')} icon={Trash2}>
              <div className="space-y-4">
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-600 dark:text-red-400">{t('admin:settings.backup.deleteAll')}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('admin:settings.backup.deleteAllDesc')}
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">
                      {t('admin:settings.backup.deleteAllButton')}
                    </Button>
                  </div>
                </div>
              </div>
            </SettingSection>
          </div>
        );

      case "advanced":
        return (
          <div className="space-y-6">
            <SettingSection title={t('admin:settings.advanced.featureFlags')} description={t('admin:settings.advanced.featureFlagsDesc')} icon={Flag}>
              <div className="space-y-3">
                {featureFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t(flag.nameKey)}</span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase",
                            getCategoryColor(flag.category)
                          )}
                        >
                          {t(`admin:settings.advanced.categories.${flag.category}`)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{t(flag.descKey)}</p>
                    </div>
                    <Switch checked={flag.enabled} onCheckedChange={() => toggleFeatureFlag(flag.id)} />
                  </div>
                ))}
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.advanced.performance')} description={t('admin:settings.advanced.performanceDesc')} icon={Zap}>
              <div className="space-y-4">
                <SettingRow label={t('admin:settings.advanced.enableCaching')} description={t('admin:settings.advanced.enableCachingDesc')}>
                  <Switch checked onCheckedChange={() => {}} />
                </SettingRow>
                <SettingRow label={t('admin:settings.advanced.cdn')} description={t('admin:settings.advanced.cdnDesc')}>
                  <Switch checked onCheckedChange={() => {}} />
                </SettingRow>
                <SettingRow label={t('admin:settings.advanced.lazyLoad')} description={t('admin:settings.advanced.lazyLoadDesc')}>
                  <Switch checked onCheckedChange={() => {}} />
                </SettingRow>
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {t('admin:settings.advanced.clearCaches')}
                  </Button>
                </div>
              </div>
            </SettingSection>

            <SettingSection title={t('admin:settings.advanced.rateLimiting')} description={t('admin:settings.advanced.rateLimitingDesc')} icon={Shield}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.advanced.requestsAuth')}</label>
                  <Input type="number" defaultValue={100} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin:settings.advanced.requestsAnon')}</label>
                  <Input type="number" defaultValue={20} />
                </div>
              </div>
            </SettingSection>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('admin:settings.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('admin:settings.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t('admin:settings.reset')}
          </Button>
          <Button size="sm" className="gap-2" onClick={handleSaveSettings}>
            <Save className="h-4 w-4" />
            {t('admin:settings.saveChanges')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <nav className="lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-24 space-y-1">
            {SETTINGS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm transition-colors",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t(tab.labelKey)}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{renderTabContent()}</div>
      </div>
    </div>
  );
}
