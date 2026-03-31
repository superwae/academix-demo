import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

const PEOPLE = [
  { name: "Dana Rahman", role: "Student", cohort: "2026 · Spring", email: "dana.r@…" },
  { name: "Chris Park", role: "Guardian", cohort: "—", email: "c.park@…" },
  { name: "Mira Haddad", role: "Student", cohort: "2025 · Fall", email: "mira.h@…" },
  { name: "Oliver Stone", role: "Instructor", cohort: "Faculty", email: "oliver.s@…" },
];

export function SecretaryDirectoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Directory</h1>
        <p className="text-muted-foreground mt-1">
          Lightweight CRM for callbacks — connect to your users API when ready.
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, email, or cohort…" className="pl-10 h-11" />
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
                  {p.role} · {p.cohort}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground font-mono">{p.email}</span>
                <Button variant="secondary" size="sm">
                  Profile
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
