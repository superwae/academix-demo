"use client";

import { useState, useCallback } from "react";
import { mockCourses, Course } from "@/lib/admin/mockData";

// This hook will be updated to use TanStack Query when API is available
export function useCourses() {
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCourses(mockCourses);
    } catch (err) {
      setError("Failed to fetch courses");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approveCourse = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCourses((prev) =>
        prev.map((course) =>
          course.id === id ? { ...course, status: "published" } : course
        )
      );
    } catch (err) {
      setError("Failed to approve course");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rejectCourse = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCourses((prev) =>
        prev.map((course) =>
          course.id === id ? { ...course, status: "rejected" } : course
        )
      );
    } catch (err) {
      setError("Failed to reject course");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateCourse = useCallback(
    async (id: string, courseData: Partial<Course>) => {
      setIsLoading(true);
      setError(null);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));
        setCourses((prev) =>
          prev.map((course) =>
            course.id === id ? { ...course, ...courseData } : course
          )
        );
      } catch (err) {
        setError("Failed to update course");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    courses,
    isLoading,
    error,
    fetchCourses,
    approveCourse,
    rejectCourse,
    updateCourse,
  };
}
