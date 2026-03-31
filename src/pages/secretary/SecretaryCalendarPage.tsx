import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/cn";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BLOCKS = [
  { day: 1, label: "Office hours", span: 2 },
  { day: 3, label: "Registrar sync", span: 1 },
  { day: 4, label: "Certificates", span: 2 },
];

export function SecretaryCalendarPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground mt-1">
          Week-at-a-glance for front-office commitments — integrate with a real calendar later.
        </p>
      </div>

      <Card className="border-border/60 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            March 2026 — week 12
          </CardTitle>
          <CardDescription>Visual grid (read-only demo).</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground mb-3">
            {WEEK.map((d) => (
              <div key={d}>{d}</div>
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
                    "rounded-xl border border-border/50 bg-muted/20 p-2 min-h-[88px] text-left",
                    block && "bg-primary/10 border-primary/25"
                  )}
                >
                  <span className="text-[10px] font-mono text-muted-foreground">{24 + i}</span>
                  {block && (
                    <p className="text-[11px] font-medium leading-tight mt-1 text-primary">
                      {block.label}
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
