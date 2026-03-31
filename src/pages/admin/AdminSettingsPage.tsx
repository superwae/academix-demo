import { useState, useMemo } from "react";
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

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: "general", label: "General", icon: Settings, description: "Platform name, timezone, and basic settings" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Theme, colors, and branding" },
  { id: "security", label: "Security", icon: Shield, description: "Authentication, passwords, and access control" },
  { id: "email", label: "Email", icon: Mail, description: "SMTP configuration and email templates" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Alert preferences and channels" },
  { id: "integrations", label: "Integrations", icon: Zap, description: "Third-party services and APIs" },
  { id: "backup", label: "Backup & Data", icon: Database, description: "Data export, import, and backup" },
  { id: "advanced", label: "Advanced", icon: Server, description: "Feature flags and system config" },
];

// Mock Feature Flags
const initialFeatureFlags = [
  { id: "ff1", name: "New Dashboard", description: "Enable the redesigned admin dashboard", enabled: true, category: "general" },
  { id: "ff2", name: "AI Course Recommendations", description: "ML-powered course recommendations for students", enabled: false, category: "experimental" },
  { id: "ff3", name: "Live Streaming", description: "Allow instructors to live stream classes", enabled: true, category: "beta" },
  { id: "ff4", name: "Payment Installments", description: "Enable course payment in installments", enabled: false, category: "beta" },
  { id: "ff5", name: "Two-Factor Authentication", description: "Require 2FA for all admin accounts", enabled: true, category: "security" },
  { id: "ff6", name: "API Rate Limiting", description: "Enable advanced API rate limiting", enabled: true, category: "security" },
  { id: "ff7", name: "Course Analytics", description: "Advanced analytics for course performance", enabled: true, category: "general" },
  { id: "ff8", name: "Social Login", description: "Login with Google, Microsoft, and GitHub", enabled: false, category: "beta" },
];

// Mock Integrations
const INTEGRATIONS = [
  { id: "stripe", name: "Stripe", description: "Payment processing", connected: true, icon: CreditCard },
  { id: "google", name: "Google Analytics", description: "Website analytics", connected: true, icon: Globe },
  { id: "slack", name: "Slack", description: "Team notifications", connected: false, icon: Bell },
  { id: "zoom", name: "Zoom", description: "Video conferencing", connected: true, icon: Monitor },
  { id: "mailchimp", name: "Mailchimp", description: "Email marketing", connected: false, icon: Mail },
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
    toast.success("Feature flag updated");
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
    () => THEMES.find((t) => t.id === theme)?.label ?? "Theme",
    [theme]
  );

  const handleSaveSettings = () => {
    toast.success("Settings saved successfully", {
      description: "Your changes have been applied",
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="space-y-6">
            <SettingSection title="Platform Identity" description="Basic platform information" icon={Building}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform Name</label>
                  <Input
                    value={generalSettings.platformName}
                    onChange={(e) => setGeneralSettings((p) => ({ ...p, platformName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tagline</label>
                  <Input
                    value={generalSettings.tagline}
                    onChange={(e) => setGeneralSettings((p) => ({ ...p, tagline: e.target.value }))}
                  />
                </div>
              </div>
            </SettingSection>

            <SettingSection title="Regional Settings" description="Localization preferences" icon={Globe}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Timezone</label>
                  <select
                    value={generalSettings.timezone}
                    onChange={(e) => setGeneralSettings((p) => ({ ...p, timezone: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Asia/Dubai">Dubai</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Language</label>
                  <select
                    value={generalSettings.language}
                    onChange={(e) => setGeneralSettings((p) => ({ ...p, language: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Format</label>
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
                  <label className="text-sm font-medium">Currency</label>
                  <select
                    value={generalSettings.currency}
                    onChange={(e) => setGeneralSettings((p) => ({ ...p, currency: e.target.value }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                  </select>
                </div>
              </div>
            </SettingSection>

            <SettingSection title="Maintenance Mode" description="Restrict platform access" icon={AlertTriangle}>
              <SettingRow
                label="Enable Maintenance Mode"
                description="Only administrators can access the platform when enabled"
              >
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </SettingRow>
              {maintenanceMode && (
                <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Maintenance mode is active</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Users will see a maintenance page. Only admin accounts can access the platform.
                  </p>
                </div>
              )}
            </SettingSection>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <SettingSection title="Theme" description="Choose your preferred color scheme" icon={Palette}>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium w-24">Mode</span>
                  <div className="flex gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                      className="gap-2"
                    >
                      <Sun className="h-4 w-4" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      className="gap-2"
                    >
                      <Moon className="h-4 w-4" />
                      Dark
                    </Button>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Color Theme</p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                    {THEMES.filter(t => t.id !== 'custom' && t.id !== 'light' && t.id !== 'dark').map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id);
                          toast.success(`Theme changed to ${t.label}`);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all",
                          theme === t.id
                            ? "border-primary bg-primary/5"
                            : "border-transparent hover:border-border hover:bg-muted/50"
                        )}
                      >
                        <span
                          className={cn(
                            "h-8 w-8 rounded-full border-2 border-white shadow-md",
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
                        <span className="text-[10px] font-medium">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Custom Color</p>
                      <p className="text-xs text-muted-foreground">Pick your own brand color</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <ColorPicker
                        value={customThemeColor || 'hsl(222, 84%, 60%)'}
                        onChange={(color) => {
                          setCustomThemeColor(color);
                          setTheme('custom');
                          toast.success("Custom color applied");
                        }}
                      />
                      {theme === 'custom' && (
                        <span className="text-xs text-primary font-medium">Active</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </SettingSection>

            <SettingSection title="Branding" description="Logo and brand assets" icon={Building}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platform Logo</label>
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <Button variant="outline" size="sm">Upload Logo</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Favicon</label>
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <Button variant="outline" size="sm">Upload Favicon</Button>
                  </div>
                </div>
              </div>
            </SettingSection>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <SettingSection title="Authentication" description="Login and session settings" icon={Lock}>
              <div className="space-y-4">
                <SettingRow label="Force HTTPS" description="Redirect all HTTP traffic to HTTPS">
                  <Switch
                    checked={securitySettings.forceHttps}
                    onCheckedChange={(v) => setSecuritySettings((p) => ({ ...p, forceHttps: v }))}
                  />
                </SettingRow>
                <SettingRow label="Two-Factor Authentication" description="Require 2FA for all admin accounts">
                  <Switch
                    checked={securitySettings.twoFactorRequired}
                    onCheckedChange={(v) => setSecuritySettings((p) => ({ ...p, twoFactorRequired: v }))}
                  />
                </SettingRow>
                <SettingRow label="Remember Me Option" description="Allow users to stay logged in">
                  <Switch
                    checked={securitySettings.allowRememberMe}
                    onCheckedChange={(v) => setSecuritySettings((p) => ({ ...p, allowRememberMe: v }))}
                  />
                </SettingRow>
              </div>
            </SettingSection>

            <SettingSection title="Session Management" description="Session timeout and security" icon={Clock}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Session Timeout (minutes)</label>
                  <Input
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings((p) => ({ ...p, sessionTimeout: parseInt(e.target.value) || 30 }))}
                  />
                  <p className="text-xs text-muted-foreground">Auto-logout after inactivity</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Login Attempts</label>
                  <Input
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings((p) => ({ ...p, maxLoginAttempts: parseInt(e.target.value) || 5 }))}
                  />
                  <p className="text-xs text-muted-foreground">Before account lockout</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lockout Duration (minutes)</label>
                  <Input
                    type="number"
                    value={securitySettings.lockoutDuration}
                    onChange={(e) => setSecuritySettings((p) => ({ ...p, lockoutDuration: parseInt(e.target.value) || 15 }))}
                  />
                  <p className="text-xs text-muted-foreground">Time before unlock</p>
                </div>
              </div>
            </SettingSection>

            <SettingSection title="Password Policy" description="Password strength requirements" icon={Key}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Minimum Password Length</label>
                  <Input
                    type="number"
                    value={securitySettings.passwordMinLength}
                    onChange={(e) => setSecuritySettings((p) => ({ ...p, passwordMinLength: parseInt(e.target.value) || 8 }))}
                    className="max-w-32"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SettingRow label="Require Uppercase" description="At least one uppercase letter">
                    <Switch
                      checked={securitySettings.passwordRequireUppercase}
                      onCheckedChange={(v) => setSecuritySettings((p) => ({ ...p, passwordRequireUppercase: v }))}
                    />
                  </SettingRow>
                  <SettingRow label="Require Lowercase" description="At least one lowercase letter">
                    <Switch
                      checked={securitySettings.passwordRequireLowercase}
                      onCheckedChange={(v) => setSecuritySettings((p) => ({ ...p, passwordRequireLowercase: v }))}
                    />
                  </SettingRow>
                  <SettingRow label="Require Numbers" description="At least one numeric digit">
                    <Switch
                      checked={securitySettings.passwordRequireNumbers}
                      onCheckedChange={(v) => setSecuritySettings((p) => ({ ...p, passwordRequireNumbers: v }))}
                    />
                  </SettingRow>
                  <SettingRow label="Require Special Characters" description="At least one special character">
                    <Switch
                      checked={securitySettings.passwordRequireSpecial}
                      onCheckedChange={(v) => setSecuritySettings((p) => ({ ...p, passwordRequireSpecial: v }))}
                    />
                  </SettingRow>
                </div>
              </div>
            </SettingSection>

            <SettingSection title="IP Whitelist" description="Restrict admin access by IP" icon={Shield}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Allowed IP Addresses</label>
                <Input
                  placeholder="e.g., 192.168.1.1, 10.0.0.0/24"
                  value={securitySettings.ipWhitelist}
                  onChange={(e) => setSecuritySettings((p) => ({ ...p, ipWhitelist: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list of IPs or CIDR ranges. Leave empty to allow all.
                </p>
              </div>
            </SettingSection>
          </div>
        );

      case "email":
        return (
          <div className="space-y-6">
            <SettingSection title="SMTP Configuration" description="Email server settings" icon={Mail}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">SMTP Host</label>
                  <Input
                    value={emailSettings.smtpHost}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, smtpHost: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SMTP Port</label>
                  <Input
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, smtpPort: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <Input
                    value={emailSettings.smtpUsername}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, smtpUsername: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={emailSettings.smtpPassword}
                      onChange={(e) => setEmailSettings((p) => ({ ...p, smtpPassword: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <SettingRow label="Enable SSL/TLS" description="Secure email transmission" className="flex-1">
                  <Switch
                    checked={emailSettings.enableSsl}
                    onCheckedChange={(v) => setEmailSettings((p) => ({ ...p, enableSsl: v }))}
                  />
                </SettingRow>
              </div>
              <div className="mt-4">
                <Button variant="outline" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Send Test Email
                </Button>
              </div>
            </SettingSection>

            <SettingSection title="Sender Information" description="Email sender details" icon={Users}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sender Name</label>
                  <Input
                    value={emailSettings.senderName}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, senderName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sender Email</label>
                  <Input
                    type="email"
                    value={emailSettings.senderEmail}
                    onChange={(e) => setEmailSettings((p) => ({ ...p, senderEmail: e.target.value }))}
                  />
                </div>
              </div>
            </SettingSection>

            <SettingSection title="Email Templates" description="Customize system emails" icon={FileText}>
              <div className="space-y-2">
                {["Welcome Email", "Password Reset", "Course Enrollment", "Payment Receipt", "Account Verification"].map((template) => (
                  <div
                    key={template}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4"
                  >
                    <span className="font-medium">{template}</span>
                    <Button variant="ghost" size="sm" className="gap-1">
                      Edit
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
            <SettingSection title="Notification Channels" description="How notifications are delivered" icon={Bell}>
              <div className="space-y-4">
                <SettingRow label="Email Notifications" description="Receive notifications via email">
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, emailNotifications: v }))}
                  />
                </SettingRow>
                <SettingRow label="Push Notifications" description="Browser and mobile push alerts">
                  <Switch
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, pushNotifications: v }))}
                  />
                </SettingRow>
                <SettingRow label="SMS Notifications" description="Critical alerts via text message">
                  <Switch
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, smsNotifications: v }))}
                  />
                </SettingRow>
              </div>
            </SettingSection>

            <SettingSection title="Notification Types" description="What you get notified about" icon={Settings}>
              <div className="space-y-4">
                <SettingRow label="Course Updates" description="New lessons, materials, announcements">
                  <Switch
                    checked={notificationSettings.courseUpdates}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, courseUpdates: v }))}
                  />
                </SettingRow>
                <SettingRow label="Payment Alerts" description="Transactions, refunds, payouts">
                  <Switch
                    checked={notificationSettings.paymentAlerts}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, paymentAlerts: v }))}
                  />
                </SettingRow>
                <SettingRow label="Security Alerts" description="Login attempts, password changes">
                  <Switch
                    checked={notificationSettings.securityAlerts}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, securityAlerts: v }))}
                  />
                </SettingRow>
                <SettingRow label="Weekly Digest" description="Weekly summary of platform activity">
                  <Switch
                    checked={notificationSettings.weeklyDigest}
                    onCheckedChange={(v) => setNotificationSettings((p) => ({ ...p, weeklyDigest: v }))}
                  />
                </SettingRow>
                <SettingRow label="Marketing Emails" description="Promotional content and offers">
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
            <SettingSection title="Connected Services" description="Third-party integrations" icon={Zap}>
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
                        <p className="font-medium">{integration.name}</p>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {integration.connected ? (
                        <>
                          <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Connected
                          </span>
                          <Button variant="outline" size="sm">Configure</Button>
                        </>
                      ) : (
                        <Button size="sm">Connect</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SettingSection>

            <SettingSection title="API Keys" description="Manage API access" icon={Key}>
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-background/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Production API Key</p>
                      <p className="text-sm text-muted-foreground">For live environment</p>
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
                  Regenerate API Key
                </Button>
              </div>
            </SettingSection>

            <SettingSection title="Webhooks" description="Event notifications to external services" icon={ExternalLink}>
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                  <Zap className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">No webhooks configured</p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Add Webhook
                  </Button>
                </div>
              </div>
            </SettingSection>
          </div>
        );

      case "backup":
        return (
          <div className="space-y-6">
            <SettingSection title="Data Export" description="Download platform data" icon={Download}>
              <div className="grid gap-4 sm:grid-cols-2">
                {["Users", "Courses", "Enrollments", "Transactions", "Audit Logs", "Full Backup"].map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4"
                  >
                    <span className="font-medium">{item}</span>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </div>
                ))}
              </div>
            </SettingSection>

            <SettingSection title="Data Import" description="Import data from external sources" icon={Upload}>
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 font-medium">Drop files here or click to upload</p>
                <p className="text-sm text-muted-foreground">Supports CSV, JSON, and Excel files</p>
                <Button variant="outline" size="sm" className="mt-4">
                  Select Files
                </Button>
              </div>
            </SettingSection>

            <SettingSection title="Automated Backups" description="Schedule automatic backups" icon={Clock}>
              <div className="space-y-4">
                <SettingRow label="Enable Automated Backups" description="Daily backup at 3:00 AM UTC">
                  <Switch checked onCheckedChange={() => {}} />
                </SettingRow>
                <SettingRow label="Backup Retention" description="Keep backups for 30 days">
                  <select className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option>7 days</option>
                    <option>14 days</option>
                    <option selected>30 days</option>
                    <option>90 days</option>
                  </select>
                </SettingRow>
              </div>
            </SettingSection>

            <SettingSection title="Danger Zone" description="Irreversible actions" icon={Trash2}>
              <div className="space-y-4">
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-600 dark:text-red-400">Delete All Data</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete all platform data. This cannot be undone.
                      </p>
                    </div>
                    <Button variant="destructive" size="sm">
                      Delete All
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
            <SettingSection title="Feature Flags" description="Toggle experimental features" icon={Flag}>
              <div className="space-y-3">
                {featureFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{flag.name}</span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase",
                            getCategoryColor(flag.category)
                          )}
                        >
                          {flag.category}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{flag.description}</p>
                    </div>
                    <Switch checked={flag.enabled} onCheckedChange={() => toggleFeatureFlag(flag.id)} />
                  </div>
                ))}
              </div>
            </SettingSection>

            <SettingSection title="Performance" description="Caching and optimization" icon={Zap}>
              <div className="space-y-4">
                <SettingRow label="Enable Caching" description="Cache frequently accessed data">
                  <Switch checked onCheckedChange={() => {}} />
                </SettingRow>
                <SettingRow label="CDN for Assets" description="Serve static files via CDN">
                  <Switch checked onCheckedChange={() => {}} />
                </SettingRow>
                <SettingRow label="Lazy Load Images" description="Load images on demand">
                  <Switch checked onCheckedChange={() => {}} />
                </SettingRow>
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Clear All Caches
                  </Button>
                </div>
              </div>
            </SettingSection>

            <SettingSection title="Rate Limiting" description="API request limits" icon={Shield}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Requests per minute (authenticated)</label>
                  <Input type="number" defaultValue={100} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Requests per minute (anonymous)</label>
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
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage platform configuration and preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button size="sm" className="gap-2" onClick={handleSaveSettings}>
            <Save className="h-4 w-4" />
            Save Changes
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
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
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
