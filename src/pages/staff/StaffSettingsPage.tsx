import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";

export function StaffSettingsPage() {
  const { pathname } = useLocation();
  const { t } = useTranslation(["admin"]);
  const portalLabel = pathname.startsWith("/accountant")
    ? t("admin:staff.settings.portalFinance")
    : t("admin:staff.settings.portalOperations");
  const [digestOn, setDigestOn] = useState(true);
  const [slaOn, setSlaOn] = useState(true);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("admin:staff.settings.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("admin:staff.settings.subtitle", { portal: portalLabel })}
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            {t("admin:staff.settings.notificationsTitle")}
          </CardTitle>
          <CardDescription>{t("admin:staff.settings.notificationsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="desk-digest">{t("admin:staff.settings.dailyDigest")}</Label>
              <p className="text-xs text-muted-foreground">{t("admin:staff.settings.dailyDigestDesc")}</p>
            </div>
            <Switch
              id="desk-digest"
              checked={digestOn}
              onCheckedChange={setDigestOn}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="sla-alert">{t("admin:staff.settings.slaBreachAlerts")}</Label>
              <p className="text-xs text-muted-foreground">{t("admin:staff.settings.slaBreachAlertsDesc")}</p>
            </div>
            <Switch id="sla-alert" checked={slaOn} onCheckedChange={setSlaOn} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            {t("admin:staff.settings.sessionTitle")}
          </CardTitle>
          <CardDescription>{t("admin:staff.settings.sessionDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("admin:staff.settings.sessionBody")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
