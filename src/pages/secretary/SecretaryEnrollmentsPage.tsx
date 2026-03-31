import { motion } from "framer-motion";
import { Mail, Phone } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

const ROWS = [
  { id: "ENR-8821", name: "Haya Al-Masri", course: "Data Literacy 101", channel: "Web", status: "pending" },
  { id: "ENR-8820", name: "Marcus Lee", course: "UX Fundamentals", channel: "Referral", status: "review" },
  { id: "ENR-8819", name: "Sofia Ivanova", course: "Python Basics", channel: "Web", status: "approved" },
];

export function SecretaryEnrollmentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Enrollments</h1>
        <p className="text-muted-foreground mt-1">
          Intake queue for new registrations — triage, verify, and route to academic teams.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active queue</CardTitle>
            <CardDescription>Demo records for UI preview.</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Export
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {ROWS.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex flex-col gap-3 rounded-xl border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-xs text-muted-foreground">{r.id}</p>
                <p className="font-semibold">{r.name}</p>
                <p className="text-sm text-muted-foreground">{r.course}</p>
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> email on file
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> optional
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{r.channel}</Badge>
                <Badge
                  variant={
                    r.status === "approved"
                      ? "secondary"
                      : r.status === "review"
                        ? "default"
                        : "outline"
                  }
                >
                  {r.status}
                </Badge>
                <Button size="sm">Open</Button>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
