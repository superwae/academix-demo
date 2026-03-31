import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { conversationService } from '../services/conversationService';

// Poll every 30 seconds - reduces API load (was 10s)
const POLL_INTERVAL = 30000;

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const conversations = await conversationService.getConversations();
      const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Failed to fetch unread message count:', error);
      // Don't reset to 0 on error to avoid flickering
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and set up polling
  useEffect(() => {
    fetchUnreadCount();
    
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL);
    
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Refetch when navigating to/from messages page (to update after reading)
  useEffect(() => {
    // Small delay to allow markAsRead to complete
    const timeout = setTimeout(fetchUnreadCount, 500);
    return () => clearTimeout(timeout);
  }, [location.pathname, fetchUnreadCount]);

  // Same event as NotificationBell / Messages — updates sidebar badge when SignalR gets new messages
  useEffect(() => {
    const onRefresh = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void fetchUnreadCount();
      }, 250);
    };
    window.addEventListener('notificationUpdate', onRefresh);
    return () => {
      window.removeEventListener('notificationUpdate', onRefresh);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchUnreadCount]);

  return { unreadCount, loading, refetch: fetchUnreadCount };
}
