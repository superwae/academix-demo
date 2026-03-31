"use client";

import React, { useState } from "react";
import {
  Plus,
  Download,
  Upload,
  Eye,
  Pencil,
  Ban,
  UserCheck,
  Filter,
} from "lucide-react";
import { PageHeader, DataTable, StatusBadge, Column, RowAction } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { mockUsers, User } from "@/lib/admin/mockData";
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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredUsers = users.filter((user) => {
    if (filterRole !== "all" && user.role !== filterRole) return false;
    if (filterStatus !== "all" && user.status !== filterStatus) return false;
    return true;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "instructor":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "student":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "accountant":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "secretary":
        return "bg-pink-500/10 text-pink-500 border-pink-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (user) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
            getRoleBadgeColor(user.role)
          )}
        >
          {user.role}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (user) => (
        <StatusBadge
          status={
            user.status === "active"
              ? "success"
              : user.status === "suspended"
              ? "error"
              : "pending"
          }
          label={user.status.charAt(0).toUpperCase() + user.status.slice(1)}
        />
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (user) => (
        <span className="text-muted-foreground">
          {new Date(user.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "lastLogin",
      header: "Last Login",
      sortable: true,
      render: (user) => (
        <span className="text-muted-foreground">
          {user.lastLogin
            ? new Date(user.lastLogin).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "Never"}
        </span>
      ),
    },
  ];

  const actions: RowAction<User>[] = [
    {
      label: "View Details",
      icon: Eye,
      onClick: (user) => {
        setSelectedUser(user);
        setViewDialogOpen(true);
      },
    },
    {
      label: "Edit User",
      icon: Pencil,
      onClick: (user) => {
        setSelectedUser(user);
        setEditDialogOpen(true);
      },
    },
    {
      label: "Suspend User",
      icon: Ban,
      onClick: (user) => {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? { ...u, status: u.status === "suspended" ? "active" : "suspended" }
              : u
          )
        );
      },
      destructive: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users Management"
        description="Manage all platform users and their access"
      >
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Import
        </Button>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
        {(filterRole !== "all" || filterStatus !== "all") && (
          <button
            onClick={() => {
              setFilterRole("all");
              setFilterStatus("all");
            }}
            className="text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Users Table */}
      <DataTable
        data={filteredUsers}
        columns={columns}
        actions={actions}
        searchable
        searchPlaceholder="Search users by name or email..."
        searchKeys={["name", "email"]}
        pageSize={10}
        emptyMessage="No users found"
      />

      {/* View User Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>View user information</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                  {selectedUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <div className="grid gap-4">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium capitalize">{selectedUser.role}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge
                    status={
                      selectedUser.status === "active"
                        ? "success"
                        : selectedUser.status === "suspended"
                        ? "error"
                        : "pending"
                    }
                    label={selectedUser.status}
                  />
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Login</span>
                  <span className="font-medium">
                    {selectedUser.lastLogin
                      ? new Date(selectedUser.lastLogin).toLocaleDateString()
                      : "Never"}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input defaultValue={selectedUser.name} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" defaultValue={selectedUser.email} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select
                  defaultValue={selectedUser.role}
                  className="h-10 w-full rounded-xl border-2 border-input bg-background/50 px-4 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="admin">Admin</option>
                  <option value="instructor">Instructor</option>
                  <option value="student">Student</option>
                  <option value="accountant">Accountant</option>
                  <option value="secretary">Secretary</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  defaultValue={selectedUser.status}
                  className="h-10 w-full rounded-xl border-2 border-input bg-background/50 px-4 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </form>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setEditDialogOpen(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
