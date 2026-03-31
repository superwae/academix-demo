"use client";

import { useState, useCallback } from "react";
import { mockUsers, User } from "@/lib/admin/mockData";

// This hook will be updated to use TanStack Query when API is available
export function useUsers() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setUsers(mockUsers);
    } catch (err) {
      setError("Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createUser = useCallback(async (userData: Partial<User>) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      const newUser: User = {
        id: crypto.randomUUID(),
        name: userData.name || "",
        email: userData.email || "",
        role: userData.role || "student",
        status: "pending",
        createdAt: new Date().toISOString().split("T")[0],
      };
      setUsers((prev) => [...prev, newUser]);
      return newUser;
    } catch (err) {
      setError("Failed to create user");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (id: string, userData: Partial<User>) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, ...userData } : user))
      );
    } catch (err) {
      setError("Failed to update user");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const suspendUser = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setUsers((prev) =>
        prev.map((user) =>
          user.id === id
            ? {
                ...user,
                status: user.status === "suspended" ? "active" : "suspended",
              }
            : user
        )
      );
    } catch (err) {
      setError("Failed to suspend user");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (err) {
      setError("Failed to delete user");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    users,
    isLoading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    suspendUser,
    deleteUser,
  };
}
