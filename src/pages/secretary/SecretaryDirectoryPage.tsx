import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Mail, Phone, Search, ShieldCheck, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { secretaryService } from "../../services/secretaryService";
import type { AdminUserDto } from "../../services/adminService";

const ROLE_LABEL_KEYS: Record<string, string> = {
  admin: "admin:users.filters.admin",
  accountant: "admin:users.filters.accountant",
  instructor: "admin:users.filters.instructor",
  secretary: "admin:users.filters.secretary",
  student: "admin:users.filters.student",
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function SecretaryDirectoryPage() {
  const { t } = useTranslation(["admin", "common", "errors"]);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await secretaryService.getDirectory({
          pageNumber: 1,
          pageSize: 60,
          searchTerm: searchTerm.trim() || undefined,
          sortBy: "name",
        });
        if (!cancelled) {
          setUsers(result.items);
          setTotalCount(result.totalCount);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("common:somethingWrong"));
          setUsers([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [searchTerm, refreshToken, t]);

  const activeCount = useMemo(() => users.filter((user) => user.isActive).length, [users]);

  const roleLabel = (role: string) => {
    const key = ROLE_LABEL_KEYS[role.toLowerCase()];
    return key ? t(key) : role;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("admin:secretary.directory.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("admin:secretary.directory.subtitle")}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
          <div className="rounded-lg border border-border/60 bg-card/70 p-3">
            <div className="text-xs text-muted-foreground">{t("admin:secretary.directory.totalPeople")}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{totalCount}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/70 p-3">
            <div className="text-xs text-muted-foreground">{t("admin:users.statusActive")}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{activeCount}</div>
          </div>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={t("admin:secretary.directory.searchPlaceholder")}
          className="h-11 ps-10"
        />
      </div>

      {error ? (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setRefreshToken((value) => value + 1)}>
              {t("common:retry")}
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {t("common:loading")}
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <UserRound className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h2 className="mt-4 text-lg font-semibold">{t("admin:secretary.directory.noPeople")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("admin:secretary.directory.noPeopleBody")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.025 }}
            >
              <Card className="h-full border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">{user.fullName || `${user.firstName} ${user.lastName}`.trim()}</CardTitle>
                      <CardDescription className="truncate">{user.email}</CardDescription>
                    </div>
                    <Badge variant={user.isActive ? "secondary" : "outline"}>
                      {user.isActive ? t("admin:users.statusActive") : t("admin:users.statusSuspended")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <Badge key={role} variant="outline" className="gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          {roleLabel(role)}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline">{t("admin:users.roles")}</Badge>
                    )}
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{user.phoneNumber || t("admin:users.notProvided")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      <span>{t("admin:users.created")}: {formatDate(user.createdAt)}</span>
                    </div>
                  </div>

                  <Button asChild variant="secondary" size="sm" className="w-full">
                    <a href={`mailto:${user.email}`}>
                      <Mail className="h-4 w-4" />
                      {t("admin:users.message")}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
