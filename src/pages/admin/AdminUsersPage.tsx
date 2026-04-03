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
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function AdminUsersPage() {
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
        toast.error("Failed to load users", {
          description: error instanceof Error ? error.message : "An error occurred",
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
        toast.success(`${user.fullName} has been suspended`);
      } else {
        await adminService.activateUser(user.id);
        toast.success(`${user.fullName} has been activated`);
      }
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: !u.isActive } : u
        )
      );
    } catch (error) {
      console.error("Failed to update user status:", error);
      toast.error("Failed to update user status", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (user: AdminUserDto) => {
    try {
      setActionLoading(user.id);
      await adminService.deleteUser(user.id);
      toast.success(`${user.fullName} has been deleted`);
      // Remove from local state
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setTotalCount((prev) => prev - 1);
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user", {
        description: error instanceof Error ? error.message : "An error occurred",
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
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Users Management</h1>
          <p className="mt-1 text-muted-foreground">
            Manage all platform users and their access ({totalCount} total)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await adminService.exportUsersCsv();
                toast.success('Users exported', { description: 'CSV file downloaded.' });
              } catch (err) {
                toast.error('Export failed', { description: err instanceof Error ? err.message : 'Please try again.' });
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
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
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="instructor">Instructor</option>
            <option value="student">Student</option>
            <option value="accountant">Accountant</option>
            <option value="secretary">Secretary</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Last Login</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="bg-card hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                          {user.firstName?.[0] || ""}{user.lastName?.[0] || ""}
                        </div>
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
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
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                        getStatusBadge(user.isActive)
                      )}>
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          user.isActive ? "bg-emerald-500" : "bg-red-500"
                        )} />
                        {user.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
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
                          Message
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
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedUser(user); setEditDialogOpen(true); }}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleSuspend(user)}>
                              {user.isActive ? (
                                <>
                                  <Ban className="mr-2 h-4 w-4" />
                                  Suspend
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteUser(user)} className="text-destructive">
                              <UserX className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} users
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="rounded-lg p-2 hover:bg-accent disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm">Page {currentPage} of {totalPages}</span>
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
            <DialogTitle>User Details</DialogTitle>
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
                  <span className="text-muted-foreground">Roles</span>
                  <span className="font-medium capitalize">{selectedUser.roles.join(", ")}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">{selectedUser.isActive ? "Active" : "Suspended"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Email Verified</span>
                  <span className="font-medium">{selectedUser.isEmailVerified ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{selectedUser.phoneNumber || "Not provided"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Login</span>
                  <span className="font-medium">{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleDateString() : "Never"}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteUser !== null}
        onOpenChange={(open) => { if (!open) setDeleteUser(null); }}
        title="Delete User"
        description={`Are you sure you want to delete ${deleteUser?.fullName}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteUser) return handleDelete(deleteUser);
        }}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
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
                toast.success("User updated successfully");
                setEditDialogOpen(false);
                // Refresh user list
                const result = await adminService.getUsers({ pageNumber: currentPage, pageSize });
                setUsers(result.items);
              } catch (error) {
                toast.error("Failed to update user", {
                  description: error instanceof Error ? error.message : "An error occurred",
                });
              }
            }}>
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <Input name="firstName" defaultValue={selectedUser.firstName} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input name="lastName" defaultValue={selectedUser.lastName} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={selectedUser.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input name="phoneNumber" type="tel" defaultValue={selectedUser.phoneNumber || ""} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
