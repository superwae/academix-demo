"use client";

import React, { useState } from "react";
import { Shield, Users, Pencil, Plus, Check, X } from "lucide-react";
import { PageHeader } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { mockRoles, allPermissions, Role, Permission } from "@/lib/admin/mockData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);

  // Group permissions by module
  const permissionsByModule = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setEditedPermissions(role.permissions.map((p) => p.id));
    setEditDialogOpen(true);
  };

  const togglePermission = (permId: string) => {
    setEditedPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId]
    );
  };

  const handleSaveRole = () => {
    if (!selectedRole) return;

    setRoles((prev) =>
      prev.map((r) =>
        r.id === selectedRole.id
          ? {
              ...r,
              permissions: allPermissions.filter((p) =>
                editedPermissions.includes(p.id)
              ),
            }
          : r
      )
    );
    setEditDialogOpen(false);
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case "admin":
        return "from-purple-500/20 to-purple-500/5 border-purple-500/20";
      case "instructor":
        return "from-blue-500/20 to-blue-500/5 border-blue-500/20";
      case "student":
        return "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20";
      case "accountant":
        return "from-amber-500/20 to-amber-500/5 border-amber-500/20";
      case "secretary":
        return "from-pink-500/20 to-pink-500/5 border-pink-500/20";
      default:
        return "from-muted to-muted/50 border-border";
    }
  };

  const getRoleIconColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case "admin":
        return "text-purple-500";
      case "instructor":
        return "text-blue-500";
      case "student":
        return "text-emerald-500";
      case "accountant":
        return "text-amber-500";
      case "secretary":
        return "text-pink-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Manage user roles and their access permissions"
      >
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Role
        </Button>
      </PageHeader>

      {/* Roles Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <div
            key={role.id}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-gradient-to-br p-6 transition-all duration-300 hover:shadow-lg",
              getRoleColor(role.name)
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl bg-background/80",
                    getRoleIconColor(role.name)
                  )}
                >
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{role.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{role.usersCount} users</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleEditRole(role)}
                className="rounded-lg p-2 opacity-0 transition-all hover:bg-background/80 group-hover:opacity-100"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {role.description}
            </p>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {role.permissions.length} Permissions
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {role.permissions.slice(0, 4).map((perm) => (
                  <span
                    key={perm.id}
                    className="rounded-full bg-background/60 px-2 py-0.5 text-xs"
                  >
                    {perm.name}
                  </span>
                ))}
                {role.permissions.length > 4 && (
                  <span className="rounded-full bg-background/60 px-2 py-0.5 text-xs text-muted-foreground">
                    +{role.permissions.length - 4} more
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Permission Matrix */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-6 text-lg font-semibold">Permission Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-4 pr-4 text-left text-sm font-medium text-muted-foreground">
                  Permission
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className="pb-4 px-4 text-center text-sm font-medium"
                  >
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <React.Fragment key={module}>
                  <tr>
                    <td
                      colSpan={roles.length + 1}
                      className="bg-muted/30 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {module}
                    </td>
                  </tr>
                  {perms.map((perm) => (
                    <tr key={perm.id} className="hover:bg-muted/50">
                      <td className="py-3 pr-4 text-sm">{perm.name}</td>
                      {roles.map((role) => {
                        const hasPermission = role.permissions.some(
                          (p) => p.id === perm.id
                        );
                        return (
                          <td key={role.id} className="px-4 py-3 text-center">
                            {hasPermission ? (
                              <Check className="mx-auto h-5 w-5 text-emerald-500" />
                            ) : (
                              <X className="mx-auto h-5 w-5 text-muted-foreground/30" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role: {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              Configure permissions for this role
            </DialogDescription>
          </DialogHeader>
          {selectedRole && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role Name</label>
                <Input defaultValue={selectedRole.name} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input defaultValue={selectedRole.description} />
              </div>
              <div className="space-y-4">
                <label className="text-sm font-medium">Permissions</label>
                {Object.entries(permissionsByModule).map(([module, perms]) => (
                  <div key={module} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {module}
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {perms.map((perm) => {
                        const isChecked = editedPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                              isChecked
                                ? "border-primary/50 bg-primary/5"
                                : "border-border hover:bg-muted/50"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(perm.id)}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="text-sm">{perm.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
