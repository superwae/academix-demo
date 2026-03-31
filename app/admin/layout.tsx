"use client";

import React from "react";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminTopbar } from "@/components/admin/layout/AdminTopbar";
import { ThemeProvider, QueryProvider } from "@/components/providers";
import { useAdminStore } from "@/store/useAdminStore";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, theme } = useAdminStore();

  return (
    <div className={`min-h-screen bg-background text-foreground ${theme}`}>
      <AdminSidebar />
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <AdminTopbar />
        <main className="min-h-[calc(100vh-4rem)] p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </ThemeProvider>
    </QueryProvider>
  );
}
