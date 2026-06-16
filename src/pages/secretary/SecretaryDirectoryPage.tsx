import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { DemoDataBadge } from "../../components/admin/finance/DemoDataBadge";

type RoleKey = "student" | "guardian" | "instructor";
type CohortKey = "spring2026" | "fall2025" | "faculty" | "none";

const PEOPLE: { name: string; roleKey: RoleKey; cohortKey: CohortKey; email: string }[] = [
  { name: "Dana Rahman", roleKey: "student", cohortKey: "spring2026", email: "dana.r@…" },
  { name: "Chris Park", roleKey: "guardian", cohortKey: "none", email: "c.park@…" },
  { name: "Mira Haddad", roleKey: "student", cohortKey: "fall2025", email: "mira.h@…" },
  { name: "Oliver Stone", roleKey: "instructor", cohortKey: "faculty", email: "oliver.s@…" },
];

export function SecretaryDirectoryPage() {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">{t('admin:secretary.directory.title')} <DemoDataBadge /></h1>
        <p className="text-muted-foreground mt-1">
          {t('admin:secretary.directory.subtitle')}
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t('admin:secretary.directory.searchPlaceholder')} className="ps-10 h-11" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PEOPLE.map((p, i) => (
          <motion.div
            key={p.email}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <CardDescription>
                  {t(`admin:secretary.directory.roles.${p.roleKey}`)} · {t(`admin:secretary.directory.cohorts.${p.cohortKey}`)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground font-mono">{p.email}</span>
                <Button variant="secondary" size="sm">
                  {t('admin:secretary.directory.profile')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
