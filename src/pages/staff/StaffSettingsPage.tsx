import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";

export function StaffSettingsPage() {
  const { pathname } = useLocation();
  const portal = pathname.startsWith("/accountant") ? "Finance" : "Operations";
  const [digestOn, setDigestOn] = useState(true);
  const [slaOn, setSlaOn] = useState(true);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          {portal} portal preferences — extend with profile and security when wired to API.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Control how we surface queue updates and handoffs.</CardDescription>
        </CardHeader>
        <CardContent className="space-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="desk-digest">Daily desk digest</Label>
              <p className="text-xs text-muted-foreground">Summary each morning</p>
            </div>
            <Switch
              id="desk-digest"
              checked={digestOn}
              onCheckedChange={setDigestOn}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="sla-alert">SLA breach alerts</Label>
              <p className="text-xs text-muted-foreground">In-app and email</p>
            </div>
            <Switch id="sla-alert" checked={slaOn} onCheckedChange={setSlaOn} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Session
          </CardTitle>
          <CardDescription>Managed by your organization&apos;s SSO policy.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Password changes and device trust will appear here once connected to auth services.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
