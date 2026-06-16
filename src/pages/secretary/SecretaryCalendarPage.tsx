import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/cn";
import { DemoDataBadge } from "../../components/admin/finance/DemoDataBadge";

type BlockKey = "officeHours" | "registrarSync" | "certificates";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const BLOCKS: { day: number; labelKey: BlockKey; span: number }[] = [
  { day: 1, labelKey: "officeHours", span: 2 },
  { day: 3, labelKey: "registrarSync", span: 1 },
  { day: 4, labelKey: "certificates", span: 2 },
];

export function SecretaryCalendarPage() {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">{t('admin:secretary.calendar.title')} <DemoDataBadge /></h1>
        <p className="text-muted-foreground mt-1">
          {t('admin:secretary.calendar.subtitle')}
        </p>
      </div>

      <Card className="border-border/60 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            {t('admin:secretary.calendar.headerTitle')}
          </CardTitle>
          <CardDescription>{t('admin:secretary.calendar.headerDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground mb-3">
            {WEEKDAY_KEYS.map((d) => (
              <div key={d}>{t(`admin:secretary.calendar.weekdays.${d}`)}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 min-h-[200px]">
            {Array.from({ length: 7 }).map((_, i) => {
              const block = BLOCKS.find((b) => b.day === i);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "rounded-xl border border-border/50 bg-muted/20 p-2 min-h-[88px] text-start",
                    block && "bg-primary/10 border-primary/25"
                  )}
                >
                  <span className="text-[10px] font-mono text-muted-foreground">{24 + i}</span>
                  {block && (
                    <p className="text-[11px] font-medium leading-tight mt-1 text-primary">
                      {t(`admin:secretary.calendar.blocks.${block.labelKey}`)}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
