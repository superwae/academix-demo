"use client";

import React, { useState } from "react";
import {
  Settings,
  Flag,
  Mail,
  Bell,
  Shield,
  Zap,
  AlertTriangle,
  Check,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { mockFeatureFlags, FeatureFlag } from "@/lib/admin/mockData";
import { cn } from "@/lib/cn";

export default function SystemPage() {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>(mockFeatureFlags);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: "smtp.academix.com",
    smtpPort: "587",
    smtpUsername: "noreply@academix.com",
    senderName: "AcademiX LMS",
  });
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    weeklyDigest: true,
  });
  const [rateLimits, setRateLimits] = useState({
    apiRequestsPerMinute: "100",
    loginAttemptsPerHour: "10",
    fileUploadsPerDay: "50",
  });

  const toggleFeatureFlag = (flagId: string) => {
    setFeatureFlags((prev) =>
      prev.map((flag) =>
        flag.id === flagId ? { ...flag, enabled: !flag.enabled } : flag
      )
    );
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "general":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "experimental":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "beta":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="System Settings"
        description="Configure platform settings, feature flags, and integrations"
      >
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Settings
        </Button>
        <Button size="sm">
          <Check className="mr-2 h-4 w-4" />
          Save All Changes
        </Button>
      </PageHeader>

      {/* Maintenance Mode Warning */}
      {maintenanceMode && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium text-red-500">Maintenance Mode Active</p>
              <p className="text-sm text-muted-foreground">
                The platform is currently in maintenance mode. Only administrators
                can access the system.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Feature Flags */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Flag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Feature Flags</h3>
              <p className="text-sm text-muted-foreground">
                Toggle platform features on or off
              </p>
            </div>
          </div>
          <div className="space-y-4">
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
                  <p className="mt-1 text-sm text-muted-foreground">
                    {flag.description}
                  </p>
                </div>
                <Switch
                  checked={flag.enabled}
                  onCheckedChange={() => toggleFeatureFlag(flag.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance & Rate Limits */}
        <div className="space-y-6">
          {/* Maintenance Mode */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Maintenance Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Restrict access during maintenance
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
              <div>
                <span className="font-medium">Enable Maintenance Mode</span>
                <p className="text-sm text-muted-foreground">
                  Only admins can access the platform
                </p>
              </div>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={setMaintenanceMode}
              />
            </div>
          </div>

          {/* Rate Limits */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Rate Limits</h3>
                <p className="text-sm text-muted-foreground">
                  Configure API and usage limits
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  API Requests / Minute
                </label>
                <Input
                  type="number"
                  value={rateLimits.apiRequestsPerMinute}
                  onChange={(e) =>
                    setRateLimits((prev) => ({
                      ...prev,
                      apiRequestsPerMinute: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Login Attempts / Hour
                </label>
                <Input
                  type="number"
                  value={rateLimits.loginAttemptsPerHour}
                  onChange={(e) =>
                    setRateLimits((prev) => ({
                      ...prev,
                      loginAttemptsPerHour: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  File Uploads / Day
                </label>
                <Input
                  type="number"
                  value={rateLimits.fileUploadsPerDay}
                  onChange={(e) =>
                    setRateLimits((prev) => ({
                      ...prev,
                      fileUploadsPerDay: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email & Notification Settings */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Email Settings */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Mail className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Email Configuration</h3>
              <p className="text-sm text-muted-foreground">
                SMTP and email delivery settings
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">SMTP Host</label>
                <Input
                  value={emailSettings.smtpHost}
                  onChange={(e) =>
                    setEmailSettings((prev) => ({
                      ...prev,
                      smtpHost: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">SMTP Port</label>
                <Input
                  value={emailSettings.smtpPort}
                  onChange={(e) =>
                    setEmailSettings((prev) => ({
                      ...prev,
                      smtpPort: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">SMTP Username</label>
              <Input
                value={emailSettings.smtpUsername}
                onChange={(e) =>
                  setEmailSettings((prev) => ({
                    ...prev,
                    smtpUsername: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sender Name</label>
              <Input
                value={emailSettings.senderName}
                onChange={(e) =>
                  setEmailSettings((prev) => ({
                    ...prev,
                    senderName: e.target.value,
                  }))
                }
              />
            </div>
            <Button variant="outline" className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              Send Test Email
            </Button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Bell className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Notification Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure notification channels
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
              <div>
                <span className="font-medium">Email Notifications</span>
                <p className="text-sm text-muted-foreground">
                  Send notifications via email
                </p>
              </div>
              <Switch
                checked={notificationSettings.emailNotifications}
                onCheckedChange={(checked) =>
                  setNotificationSettings((prev) => ({
                    ...prev,
                    emailNotifications: checked,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
              <div>
                <span className="font-medium">Push Notifications</span>
                <p className="text-sm text-muted-foreground">
                  Browser and mobile push alerts
                </p>
              </div>
              <Switch
                checked={notificationSettings.pushNotifications}
                onCheckedChange={(checked) =>
                  setNotificationSettings((prev) => ({
                    ...prev,
                    pushNotifications: checked,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
              <div>
                <span className="font-medium">SMS Notifications</span>
                <p className="text-sm text-muted-foreground">
                  Critical alerts via SMS
                </p>
              </div>
              <Switch
                checked={notificationSettings.smsNotifications}
                onCheckedChange={(checked) =>
                  setNotificationSettings((prev) => ({
                    ...prev,
                    smsNotifications: checked,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-4">
              <div>
                <span className="font-medium">Weekly Digest</span>
                <p className="text-sm text-muted-foreground">
                  Send weekly summary emails
                </p>
              </div>
              <Switch
                checked={notificationSettings.weeklyDigest}
                onCheckedChange={(checked) =>
                  setNotificationSettings((prev) => ({
                    ...prev,
                    weeklyDigest: checked,
                  }))
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
            <Shield className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Security Settings</h3>
            <p className="text-sm text-muted-foreground">
              Platform security configurations
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Force HTTPS</span>
              <Switch defaultChecked />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Redirect all HTTP requests to HTTPS
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Session Timeout</span>
              <span className="text-sm text-muted-foreground">30 min</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Auto-logout after inactivity
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Password Policy</span>
              <span className="text-sm text-emerald-500">Strong</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Min 12 chars, special, numbers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
