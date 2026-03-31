import * as signalR from '@microsoft/signalr';
import { normalizeConversationMessageDto, type ConversationMessageDto } from './conversationService';
import { notificationService } from './notificationService';
import type { ApiNotification } from './notificationApiService';

const HUB_URL = '/hubs/messaging';

let connection: signalR.HubConnection | null = null;

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export type MessageReceivedHandler = (message: ConversationMessageDto) => void;
export type ConversationUpdatedHandler = (conversation: unknown) => void;
export type NotificationReceivedHandler = (notification: ApiNotification) => void;

const messageHandlers = new Set<MessageReceivedHandler>();
const conversationUpdatedHandlers = new Set<ConversationUpdatedHandler>();
const notificationReceivedHandlers = new Set<NotificationReceivedHandler>();

export function onMessageReceived(handler: MessageReceivedHandler): () => void {
  messageHandlers.add(handler);
  return () => messageHandlers.delete(handler);
}

export function onConversationUpdated(handler: ConversationUpdatedHandler): () => void {
  conversationUpdatedHandlers.add(handler);
  return () => conversationUpdatedHandlers.delete(handler);
}

function notifyMessageReceived(message: ConversationMessageDto & { SenderIsStaff?: boolean }) {
  const normalized = normalizeConversationMessageDto(message);
  messageHandlers.forEach((h) => h(normalized));
}

function notifyConversationUpdated(conversation: unknown) {
  conversationUpdatedHandlers.forEach((h) => h(conversation));
}

function notifyNotificationReceived(notification: ApiNotification) {
  notificationReceivedHandlers.forEach((h) => h(notification));
}

export function onNotificationReceived(handler: NotificationReceivedHandler): () => void {
  notificationReceivedHandlers.add(handler);
  return () => notificationReceivedHandlers.delete(handler);
}

export async function connectMessagingHub(): Promise<signalR.HubConnection | null> {
  const token = getAccessToken();
  if (!token || token.startsWith('mock-')) return null;

  if (connection?.state === signalR.HubConnectionState.Connected) {
    return connection;
  }

  if (connection) {
    await connection.stop();
  }

  // Use LongPolling to avoid WebSocket proxy issues (Vite proxy can block WebSocket upgrades)
  connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: () => getAccessToken() ?? '',
      transport: signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .withServerTimeout(30000)
    .build();

  connection.on('MessageReceived', (message: ConversationMessageDto) => {
    notifyMessageReceived(message);
  });

  connection.on('ConversationUpdated', (conversation: unknown) => {
    notifyConversationUpdated(conversation);
  });

  connection.on('NotificationReceived', (payload: ApiNotification) => {
    notificationService.applyRealtimeNotification(payload);
    notifyNotificationReceived(payload);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('notificationUpdate', { detail: { source: 'realtime' as const } })
      );
    }
  });

  connection.onreconnecting(() => {
    console.log('[MessagingHub] Reconnecting...');
  });

  connection.onreconnected(() => {
    console.log('[MessagingHub] Reconnected');
  });

  try {
    await connection.start();
    console.log('[MessagingHub] Connected');
    return connection;
  } catch (err) {
    // "Connection stopped during negotiation" / AbortError often means backend down or proxy - avoid console spam
    const msg = err instanceof Error ? err.message : String(err);
    const isExpected = /AbortError|negotiation|ECONNREFUSED|Failed to fetch/i.test(msg);
    if (!isExpected) console.warn('[MessagingHub] Connection failed:', msg);
    connection = null;
    return null;
  }
}

export async function disconnectMessagingHub(): Promise<void> {
  if (connection) {
    await connection.stop();
    connection = null;
    console.log('[MessagingHub] Disconnected');
  }
}

export async function joinConversation(conversationId: string): Promise<boolean> {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
    return false;
  }
  try {
    await connection.invoke('JoinConversation', conversationId);
    return true;
  } catch (err) {
    console.error('[MessagingHub] Failed to join conversation:', err);
    return false;
  }
}

export async function leaveConversation(conversationId: string): Promise<void> {
  if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
  try {
    await connection.invoke('LeaveConversation', conversationId);
  } catch (err) {
    console.error('[MessagingHub] Failed to leave conversation:', err);
  }
}

export function isConnected(): boolean {
  return connection?.state === signalR.HubConnectionState.Connected;
}
