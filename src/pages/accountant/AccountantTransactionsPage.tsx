import { motion } from "framer-motion";
import { Download, Filter } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";

const ROWS = [
  { id: "TXN-9821", party: "Amira H.", amount: 129.0, type: "Sale", status: "settled", when: "Today · 09:12" },
  { id: "TXN-9820", party: "Leo K.", amount: 79.99, type: "Refund", status: "pending", when: "Today · 08:44" },
  { id: "TXN-9819", party: "Nora S.", amount: 199.0, type: "Sale", status: "settled", when: "Yesterday" },
  { id: "TXN-9818", party: "Omar F.", amount: 49.0, type: "Fee", status: "settled", when: "Yesterday" },
  { id: "TXN-9817", party: "Rina M.", amount: 0, type: "Chargeback", status: "review", when: "Mar 22" },
];

export function AccountantTransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Ledger-style feed with filters for audit and reconciliation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Demo data — connect to your finance API when ready.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ROWS.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell>{r.party}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.amount === 0 ? "—" : `$${r.amount.toFixed(2)}`}
                    </TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "settled"
                            ? "secondary"
                            : r.status === "pending"
                              ? "outline"
                              : "destructive"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">{r.when}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
