import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, MessageSquare, Shield, X } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { notificationService, type Notification } from '../services/notificationService';
import { useAuthStore } from '../store/useAuthStore';
import {
  connectMessagingHub,
  onConversationUpdated,
  onMessageReceived,
  onNotificationReceived,
} from '../services/messagingHubService';
import {
  normalizeConversationMessageDto,
  type ConversationDto,
  type ConversationMessageDto,
} from '../services/conversationService';
import { getOpenConversationId } from '../lib/messagesUi';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '../lib/cn';

function getInitialPushPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

function formatMessagePreviewForToast(content: string | undefined | null): string {
  const t = (content ?? '').trim();
  if (!t) return 'New message';
  return t.length > 120 ? `${t.slice(0, 117)}…` : t;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(getInitialPushPermission);
  const navigate = useNavigate();
  const unsubConversationRef = useRef<(() => void) | null>(null);
  const unsubMessageRef = useRef<(() => void) | null>(null);
  const unsubNotificationRef = useRef<(() => void) | null>(null);
  const seenMessageToastIdsRef = useRef(new Set<string>());

  const syncPushPermission = () => {
    setPushPermission(notificationService.getBrowserPushPermission());
  };

  useEffect(() => {
    const loadAllNotifications = async () => {
      const userEmail = useAuthStore.getState().user?.email;
      if (userEmail) {
        notificationService.loadPendingNotificationsForUser(userEmail);
      }
      await notificationService.loadFromApi();
      loadNotifications();
    };

    loadAllNotifications();

    // Connect SignalR so we receive ConversationUpdated (new messages) even when not on Messages page
    // Small delay lets the page settle and avoids "connection stopped during negotiation" on fast navigations
    const getMessagesPath = (roles: string[] | undefined) => {
      const r = (roles ?? []).map((x) => x.toLowerCase());
      if (r.some((x) => x === 'admin' || x === 'superadmin')) return '/admin/messages';
      if (r.some((x) => x === 'instructor' || x === 'teacher')) return '/teacher/messages';
      if (r.some((x) => x === 'accountant')) return '/accountant/messages';
      if (r.some((x) => x === 'secretary')) return '/secretary/messages';
      return '/student/messages';
    };

    const showIncomingMessageToast = (rawMessage: ConversationMessageDto) => {
      const message = normalizeConversationMessageDto(rawMessage);
      const me = useAuthStore.getState().user;
      if (!me || message.senderId === me.id) return;
      if (seenMessageToastIdsRef.current.has(message.id)) return;
      if (getOpenConversationId() === message.conversationId) return;

      seenMessageToastIdsRef.current.add(message.id);
      if (seenMessageToastIdsRef.current.size > 200) {
        seenMessageToastIdsRef.current = new Set([...seenMessageToastIdsRef.current].slice(-120));
      }

      const preview = formatMessagePreviewForToast(message.content);
      const path = getMessagesPath(me.roles);

      toast.message(`Message from ${message.senderName}`, {
        description: preview,
        duration: 10_000,
        position: 'bottom-right',
        icon: (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <MessageSquare className="h-4 w-4" aria-hidden />
          </span>
        ),
        classNames: {
          toast:
            '!items-start border-l-[3px] border-l-primary bg-card shadow-xl shadow-black/5 ring-1 ring-border/50',
          title: 'text-[13px] font-semibold tracking-tight',
          description: 'text-[13px] text-muted-foreground line-clamp-2',
          actionButton:
            '!rounded-lg !bg-primary !px-3 !py-2 !text-xs !font-semibold !text-primary-foreground',
        },
        action: {
          label: 'Open',
          onClick: () => navigate(`${path}?conversation=${message.conversationId}`),
        },
      });

      notificationService.notifyBrowserIfPermitted(
        `Message from ${message.senderName}`,
        preview
      );
    };

    const t = setTimeout(() => {
      connectMessagingHub().then(() => {
        unsubConversationRef.current = onConversationUpdated((raw) => {
          window.dispatchEvent(new Event('notificationUpdate'));
          const conv = raw as ConversationDto & { lastMessage?: ConversationMessageDto; LastMessage?: ConversationMessageDto };
          const last = conv.lastMessage ?? conv.LastMessage;
          if (!last) return;
          showIncomingMessageToast(last);
        });

        unsubMessageRef.current = onMessageReceived((msg) => {
          showIncomingMessageToast(msg);
        });

        unsubNotificationRef.current = onNotificationReceived((n) => {
          notificationService.notifyBrowserIfPermitted(n.title, n.message);
          toast.message(n.title, {
            description: n.message?.length ? (n.message.length > 140 ? `${n.message.slice(0, 137)}…` : n.message) : undefined,
            duration: 8000,
            position: 'bottom-right',
          });
        });
      });
    }, 300);

    // Listen for notification updates (full reload unless from SignalR cache merge)
    const handleNotificationUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ source?: string }>).detail;
      if (detail?.source === 'realtime') {
        loadNotifications();
        return;
      }
      void loadAllNotifications();
    };
    window.addEventListener('notificationUpdate', handleNotificationUpdate);
    window.addEventListener('focus', syncPushPermission);
    document.addEventListener('visibilitychange', syncPushPermission);

    // Fallback sync if a SignalR push was missed (tab background, reconnect gap)
    const interval = setInterval(loadAllNotifications, 120000);

    let prevEmail = useAuthStore.getState().user?.email;
    const unsubscribe = useAuthStore.subscribe((state) => {
      const e = state.user?.email;
      if (e !== prevEmail) {
        prevEmail = e;
        loadAllNotifications();
      }
    });

    return () => {
      clearTimeout(t);
      clearInterval(interval);
      window.removeEventListener('notificationUpdate', handleNotificationUpdate);
      window.removeEventListener('focus', syncPushPermission);
      document.removeEventListener('visibilitychange', syncPushPermission);
      unsubConversationRef.current?.();
      unsubConversationRef.current = null;
      unsubMessageRef.current?.();
      unsubMessageRef.current = null;
      unsubNotificationRef.current?.();
      unsubNotificationRef.current = null;
      unsubscribe();
    };
  }, []);

  const handleEnablePushNotifications = async () => {
    const ok = await notificationService.requestPermission();
    syncPushPermission();
    if (ok) {
      toast.success('Browser notifications enabled', {
        description: 'You will get alerts when new notifications arrive.',
      });
      notificationService.notifyBrowserIfPermitted(
        'Academix',
        'Notifications have been enabled.'
      );
    } else if (notificationService.getBrowserPushPermission() === 'denied') {
      toast.error('Notifications blocked', {
        description: 'Open your browser site settings and allow notifications for this site.',
      });
    }
  };

  const loadNotifications = () => {
    const all = notificationService.getAllNotifications();
    const unread = notificationService.getUnreadCount();
    setNotifications(all);
    setUnreadCount(unread);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      notificationService.markAsRead(notification.id);
      loadNotifications();
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead();
    loadNotifications();
    toast.success('All notifications marked as read');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    notificationService.deleteNotification(id);
    loadNotifications();
  };

  const isPlatformStaffNotification = (type: Notification['type']) =>
    type === 'system' || type === 'admin';

  const getNotificationIcon = (type: Notification['type']) => {
    if (isPlatformStaffNotification(type)) {
      return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/15">
          <Shield className="h-4 w-4 text-amber-800 dark:text-amber-300" aria-hidden />
        </span>
      );
    }
    switch (type) {
      case 'assignment':
        return <span className="text-2xl">📝</span>;
      case 'exam':
        return <span className="text-2xl">📋</span>;
      case 'announcement':
        return <span className="text-2xl">📢</span>;
      case 'grade':
        return <span className="text-2xl">⭐</span>;
      case 'message':
        return <span className="text-2xl">💬</span>;
      case 'deadline':
        return <span className="text-2xl">⏰</span>;
      default:
        return <span className="text-2xl">🔔</span>;
    }
  };

  const showEnablePushButton = pushPermission !== 'granted';

  return (
    <div className="flex items-center gap-1.5">
      {showEnablePushButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs shrink-0 hidden sm:inline-flex"
          onClick={handleEnablePushNotifications}
          disabled={pushPermission === 'denied'}
          title={
            pushPermission === 'denied'
              ? 'Notifications are blocked — enable them in your browser site settings'
              : 'Show desktop alerts when new notifications arrive'
          }
        >
          <BellRing className="h-3.5 w-3.5" />
          <span className="max-w-[9rem] truncate">Enable notifications</span>
        </Button>
      )}
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive flex items-center justify-center"
            >
              <span className="text-xs font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </motion.div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {showEnablePushButton && (
          <div className="p-3 border-b bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">
              {pushPermission === 'denied'
                ? 'Notifications are blocked by the browser. Open site settings and allow notifications.'
                : 'Enable browser alerts so you get notifications even when this tab is in the background.'}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full gap-2 h-9 text-xs"
              onClick={(e) => {
                e.preventDefault();
                void handleEnablePushNotifications();
              }}
              disabled={pushPermission === 'denied'}
            >
              <BellRing className="h-4 w-4" />
              Enable browser notifications
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between p-4 border-b">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-8 text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          <AnimatePresence>
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <DropdownMenuItem
                    className={cn(
                      'flex items-start gap-3 p-4 cursor-pointer border-l-4',
                      isPlatformStaffNotification(notification.type)
                        ? 'border-amber-500 bg-amber-500/[0.06]'
                        : 'border-transparent',
                      !notification.read && !isPlatformStaffNotification(notification.type) && 'bg-muted/50',
                      !notification.read && isPlatformStaffNotification(notification.type) && 'bg-amber-500/10'
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          {isPlatformStaffNotification(notification.type) && (
                            <p className="mb-0.5 inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:text-amber-200" title="Official notice from platform administrators">
                              <Shield className="h-3 w-3 shrink-0" aria-hidden />
                              System admin
                            </p>
                          )}
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={(e) => handleDelete(notification.id, e)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </DropdownMenuItem>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
}

