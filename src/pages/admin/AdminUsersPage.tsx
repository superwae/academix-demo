import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Download,
  Upload,
  Eye,
  Pencil,
  Ban,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  MessageSquare,
  Loader2,
  CheckCircle,
  UserX,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { cn } from "../../lib/cn";
import { adminService, type AdminUserDto } from "../../services/adminService";
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { ResponsiveTable, type ResponsiveTableColumn } from "../../components/ui/responsive-table";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function AdminUsersPage() {
  const { t } = useTranslation(['admin', 'common', 'errors']);
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<AdminUserDto | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUserDto | null>(null);
  const pageSize = 10;

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const result = await adminService.getUsers({
          pageNumber: currentPage,
          pageSize,
          searchTerm: search || undefined,
        });
        setUsers(result.items);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        toast.error(t('admin:users.errors.loadFailed'), {
          description: error instanceof Error ? error.message : t('admin:users.toasts.errorOccurred'),
        });
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timer = setTimeout(fetchUsers, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [currentPage, search]);

  // Filter users client-side for role and status
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const userRole = user.roles[0]?.toLowerCase() || "student";
      const matchesRole = filterRole === "all" || userRole === filterRole.toLowerCase();

      const status = user.isActive ? "active" : "suspended";
      const matchesStatus = filterStatus === "all" || status === filterStatus;

      return matchesRole && matchesStatus;
    });
  }, [users, filterRole, filterStatus]);

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "superadmin":
      case "admin": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "instructor": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "student": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "accountant": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "secretary": return "bg-pink-500/10 text-pink-500 border-pink-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    }
    return "bg-red-500/10 text-red-500 border-red-500/20";
  };

  const handleSuspend = async (user: AdminUserDto) => {
    try {
      setActionLoading(user.id);
      if (user.isActive) {
        await adminService.suspendUser(user.id);
        toast.success(t('admin:users.toasts.suspended', { name: user.fullName }));
      } else {
        await adminService.activateUser(user.id);
        toast.success(t('admin:users.toasts.activated', { name: user.fullName }));
      }
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: !u.isActive } : u
        )
      );
    } catch (error) {
      console.error("Failed to update user status:", error);
      toast.error(t('admin:users.errors.updateStatusFailed'), {
        description: error instanceof Error ? error.message : t('admin:users.toasts.errorOccurred'),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (user: AdminUserDto) => {
    try {
      setActionLoading(user.id);
      await adminService.deleteUser(user.id);
      toast.success(t('admin:users.toasts.deleted', { name: user.fullName }));
      // Remove from local state
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setTotalCount((prev) => prev - 1);
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error(t('admin:users.errors.deleteFailed'), {
        description: error instanceof Error ? error.message : t('admin:users.toasts.errorOccurred'),
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('admin:users.title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {t('admin:users.subtitle', { count: totalCount })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Upload className="me-2 h-4 w-4" />
            {t('admin:users.import')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await adminService.exportUsersCsv();
                toast.success(t('admin:users.toasts.exported'), { description: t('admin:users.toasts.exportedDesc') });
              } catch (err) {
                toast.error(t('admin:users.toasts.exportFailed'), { description: err instanceof Error ? err.message : t('admin:users.toasts.exportFailedDesc') });
              }
            }}
          >
            <Download className="me-2 h-4 w-4" />
            {t('admin:users.export')}
          </Button>
          <Button size="sm">
            <Plus className="me-2 h-4 w-4" />
            {t('admin:users.addUser')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('admin:users.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="ps-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="all">{t('admin:users.filters.allRoles')}</option>
            <option value="admin">{t('admin:users.filters.admin')}</option>
            <option value="instructor">{t('admin:users.filters.instructor')}</option>
            <option value="student">{t('admin:users.filters.student')}</option>
            <option value="accountant">{t('admin:users.filters.accountant')}</option>
            <option value="secretary">{t('admin:users.filters.secretary')}</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="all">{t('admin:users.filters.allStatus')}</option>
            <option value="active">{t('admin:users.filters.active')}</option>
            <option value="suspended">{t('admin:users.filters.suspended')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center overflow-hidden rounded-xl border border-border py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        (() => {
          const columns: ResponsiveTableColumn<AdminUserDto>[] = [
            {
              id: 'user',
              header: t('admin:users.table.user'),
              cell: (user) => (
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                    {user.firstName?.[0] || ""}{user.lastName?.[0] || ""}
                  </div>
                  <div className="min-w-0 text-start">
                    <p className="truncate font-medium">{user.fullName}</p>
                    <p className="break-all text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              ),
            },
            {
              id: 'role',
              header: t('admin:users.table.role'),
              cell: (user) => (
                <div className="flex flex-wrap gap-1 justify-end md:justify-start">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                        getRoleBadgeColor(role)
                      )}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              ),
            },
            {
              id: 'status',
              header: t('admin:users.table.status'),
              cell: (user) => (
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                  getStatusBadge(user.isActive)
                )}>
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    user.isActive ? "bg-emerald-500" : "bg-red-500"
                  )} />
                  {user.isActive ? t('admin:users.statusActive') : t('admin:users.statusSuspended')}
                </span>
              ),
            },
            {
              id: 'created',
              header: t('admin:users.table.created'),
              hiddenOnMobile: true,
              cell: (user) => (
                <span className="text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              ),
            },
            {
              id: 'lastLogin',
              header: t('admin:users.table.lastLogin'),
              hiddenOnMobile: true,
              cell: (user) => (
                <span className="text-sm text-muted-foreground">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : t('admin:users.never')}
                </span>
              ),
            },
            {
              id: 'actions',
              header: t('admin:users.table.actions'),
              className: 'text-end',
              cell: (user) => (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => {
                      navigate(`/admin/messages?user=${user.id}`);
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {t('admin:users.message')}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-lg p-1.5 hover:bg-accent" disabled={actionLoading === user.id}>
                        {actionLoading === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedUser(user); setViewDialogOpen(true); }}>
                        <Eye className="me-2 h-4 w-4" />
                        {t('admin:users.viewDetails')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedUser(user); setEditDialogOpen(true); }}>
                        <Pencil className="me-2 h-4 w-4" />
                        {t('admin:users.editAction')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleSuspend(user)}>
                        {user.isActive ? (
                          <>
                            <Ban className="me-2 h-4 w-4" />
                            {t('admin:users.suspend')}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="me-2 h-4 w-4" />
                            {t('admin:users.activate')}
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteUser(user)} className="text-destructive">
                        <UserX className="me-2 h-4 w-4" />
                        {t('admin:users.deleteAction')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ),
            },
          ];
          return (
            <ResponsiveTable
              data={filteredUsers}
              columns={columns}
              rowKey={(user) => user.id}
              empty={
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center text-sm text-muted-foreground">
                  {t('admin:users.empty')}
                </div>
              }
            />
          );
        })()
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('admin:users.pagination.showing', {
              from: (currentPage - 1) * pageSize + 1,
              to: Math.min(currentPage * pageSize, totalCount),
              total: totalCount,
            })}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="rounded-lg p-2 hover:bg-accent disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm">{t('admin:users.pagination.page', { current: currentPage, total: totalPages })}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="rounded-lg p-2 hover:bg-accent disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin:users.userDetails')}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                  {selectedUser.firstName?.[0] || ""}{selectedUser.lastName?.[0] || ""}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.fullName}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{t('admin:users.roles')}</span>
                  <span className="font-medium capitalize">{selectedUser.roles.join(", ")}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{t('admin:users.statusLabel')}</span>
                  <span className="font-medium">{selectedUser.isActive ? t('admin:users.statusActive') : t('admin:users.statusSuspended')}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{t('admin:users.emailVerified')}</span>
                  <span className="font-medium">{selectedUser.isEmailVerified ? t('admin:users.yes') : t('admin:users.no')}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{t('admin:users.phone')}</span>
                  <span className="font-medium">{selectedUser.phoneNumber || t('admin:users.notProvided')}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{t('admin:users.created')}</span>
                  <span className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('admin:users.lastLogin')}</span>
                  <span className="font-medium">{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleDateString() : t('admin:users.never')}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteUser !== null}
        onOpenChange={(open) => { if (!open) setDeleteUser(null); }}
        title={t('admin:users.deleteTitle')}
        description={t('admin:users.deleteConfirm', { name: deleteUser?.fullName ?? '' })}
        confirmLabel={t('common:delete')}
        variant="destructive"
        onConfirm={() => {
          if (deleteUser) return handleDelete(deleteUser);
        }}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin:users.editAction')}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              try {
                await adminService.updateUser(selectedUser.id, {
                  firstName: formData.get("firstName") as string,
                  lastName: formData.get("lastName") as string,
                  phoneNumber: formData.get("phoneNumber") as string || undefined,
                });
                toast.success(t('admin:users.toasts.updated'));
                setEditDialogOpen(false);
                // Refresh user list
                const result = await adminService.getUsers({ pageNumber: currentPage, pageSize });
                setUsers(result.items);
              } catch (error) {
                toast.error(t('admin:users.errors.updateFailed'), {
                  description: error instanceof Error ? error.message : t('admin:users.toasts.errorOccurred'),
                });
              }
            }}>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin:users.firstNameLabel')}</label>
                <Input name="firstName" defaultValue={selectedUser.firstName} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin:users.lastNameLabel')}</label>
                <Input name="lastName" defaultValue={selectedUser.lastName} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin:users.emailLabel')}</label>
                <Input type="email" value={selectedUser.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">{t('admin:users.emailCannotChange')}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('admin:users.phoneLabel')}</label>
                <Input name="phoneNumber" type="tel" defaultValue={selectedUser.phoneNumber || ""} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>{t('common:cancel')}</Button>
                <Button type="submit">{t('admin:users.saveChanges')}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
