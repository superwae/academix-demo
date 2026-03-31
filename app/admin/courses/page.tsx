"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Users,
  DollarSign,
  Check,
  X,
  Eye,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  Column,
  RowAction,
} from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { mockCourses, Course } from "@/lib/admin/mockData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = Array.from(new Set(courses.map((c) => c.category)));

  const filteredCourses = courses.filter((course) => {
    if (filterStatus !== "all" && course.status !== filterStatus) return false;
    if (filterCategory !== "all" && course.category !== filterCategory) return false;
    return true;
  });

  const handleApprove = (courseId: string) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId ? { ...c, status: "published" } : c
      )
    );
    setDetailsDrawerOpen(false);
  };

  const handleReject = (courseId: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, status: "rejected" } : c))
    );
    setDetailsDrawerOpen(false);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "published":
        return { status: "success" as const, label: "Published" };
      case "pending":
        return { status: "pending" as const, label: "Pending Review" };
      case "draft":
        return { status: "info" as const, label: "Draft" };
      case "rejected":
        return { status: "error" as const, label: "Rejected" };
      default:
        return { status: "default" as const, label: status };
    }
  };

  const columns: Column<Course>[] = [
    {
      key: "title",
      header: "Course",
      sortable: true,
      render: (course) => (
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{course.title}</p>
            <p className="text-sm text-muted-foreground">{course.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: "instructor",
      header: "Instructor",
      sortable: true,
      render: (course) => (
        <span className="text-muted-foreground">{course.instructor}</span>
      ),
    },
    {
      key: "enrollments",
      header: "Enrollments",
      sortable: true,
      render: (course) => (
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{course.enrollments.toLocaleString()}</span>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      sortable: true,
      render: (course) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{course.price.toFixed(2)}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (course) => {
        const config = getStatusConfig(course.status);
        return <StatusBadge status={config.status} label={config.label} />;
      },
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      render: (course) => (
        <span className="text-muted-foreground">
          {new Date(course.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
  ];

  const actions: RowAction<Course>[] = [
    {
      label: "View Details",
      icon: Eye,
      onClick: (course) => {
        setSelectedCourse(course);
        setDetailsDrawerOpen(true);
      },
    },
    {
      label: "Approve",
      icon: CheckCircle,
      onClick: (course) => handleApprove(course.id),
    },
    {
      label: "Reject",
      icon: XCircle,
      onClick: (course) => handleReject(course.id),
      destructive: true,
    },
  ];

  // Stats
  const stats = {
    total: courses.length,
    published: courses.filter((c) => c.status === "published").length,
    pending: courses.filter((c) => c.status === "pending").length,
    totalEnrollments: courses.reduce((sum, c) => sum + c.enrollments, 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses Oversight"
        description="Review and manage all platform courses"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Courses</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.published}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {stats.totalEnrollments.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Total Enrollments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="pending">Pending</option>
          <option value="draft">Draft</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {(filterStatus !== "all" || filterCategory !== "all") && (
          <button
            onClick={() => {
              setFilterStatus("all");
              setFilterCategory("all");
            }}
            className="text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Courses Table */}
      <DataTable
        data={filteredCourses}
        columns={columns}
        actions={actions}
        searchable
        searchPlaceholder="Search courses..."
        searchKeys={["title", "instructor", "category"]}
        pageSize={10}
        emptyMessage="No courses found"
      />

      {/* Course Details Drawer */}
      <Dialog open={detailsDrawerOpen} onOpenChange={setDetailsDrawerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Course Details</DialogTitle>
            <DialogDescription>
              Review course information before approval
            </DialogDescription>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-6">
              {/* Course Header */}
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedCourse.title}</h3>
                  <p className="text-muted-foreground">{selectedCourse.category}</p>
                  <div className="mt-2">
                    {(() => {
                      const config = getStatusConfig(selectedCourse.status);
                      return <StatusBadge status={config.status} label={config.label} />;
                    })()}
                  </div>
                </div>
              </div>

              {/* Course Info */}
              <div className="grid gap-4">
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">Instructor</span>
                  <span className="font-medium">{selectedCourse.instructor}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">
                    ${selectedCourse.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">Enrollments</span>
                  <span className="font-medium">
                    {selectedCourse.enrollments.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(selectedCourse.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Course Description (Placeholder) */}
              <div>
                <h4 className="mb-2 font-medium">Description</h4>
                <p className="text-sm text-muted-foreground">
                  This is a comprehensive course covering all aspects of{" "}
                  {selectedCourse.title.toLowerCase()}. Students will learn
                  through hands-on projects and real-world examples.
                </p>
              </div>

              {/* Action Buttons */}
              {selectedCourse.status === "pending" && (
                <div className="flex gap-3 border-t border-border pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-500/20 text-red-500 hover:bg-red-500/10"
                    onClick={() => handleReject(selectedCourse.id)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => handleApprove(selectedCourse.id)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
