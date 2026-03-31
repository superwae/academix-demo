"use client";

import React, { useEffect } from "react";
import { useAdminStore, AdminTheme } from "@/store/useAdminStore";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme } = useAdminStore();

  useEffect(() => {
    // Remove all theme classes
    document.documentElement.classList.remove("light", "dark", "corporate");

    // Add the current theme class
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "corporate") {
      document.documentElement.classList.add("corporate");
    }

    // Also set the color-scheme for native elements
    if (theme === "dark") {
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.style.colorScheme = "light";
    }
  }, [theme]);

  return <>{children}</>;
}
