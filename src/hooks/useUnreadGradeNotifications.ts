import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { notificationApiService } from '../services/notificationApiService';

const POLL_INTERVAL_MS = 30000;

/**
 * Unread notifications of type `grade` (assignment graded by instructor).
 * Updates on navigation and `notificationUpdate` (same as Notification bell).
 */
export function useUnreadGradeNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCount = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token || token.startsWith('mock-')) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    try {
      const n = await notificationApiService.getUnreadCount('grade');
      setUnreadCount(typeof n === 'number' ? n : 0);
    } catch {
      // keep prior count on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCount();
    const interval = setInterval(() => void fetchCount(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    const t = setTimeout(() => void fetchCount(), 400);
    return () => clearTimeout(t);
  }, [location.pathname, fetchCount]);

  useEffect(() => {
    const onRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void fetchCount();
      }, 250);
    };
    window.addEventListener('notificationUpdate', onRefresh);
    return () => {
      window.removeEventListener('notificationUpdate', onRefresh);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchCount]);

  return { unreadCount, loading, refetch: fetchCount };
}
