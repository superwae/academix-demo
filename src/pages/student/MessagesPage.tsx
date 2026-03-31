import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { conversationService, type ConversationDto, type ConversationMessageDto, type ConversationRequestDto } from '../../services/conversationService'
import { connectMessagingHub, joinConversation, leaveConversation, onMessageReceived, onConversationUpdated, isConnected } from '../../services/messagingHubService'
import { useAuthStore } from '../../store/useAuthStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { cn } from '../../lib/cn'
import { setOpenConversationId } from '../../lib/messagesUi'
import { 
  MessageSquare, 
  Send, 
  UserPlus, 
  UserX, 
  Flag, 
  Check, 
  X,
  Users,
  BookOpen,
  Loader2,
  Shield,
  ChevronLeft,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { toast } from 'sonner'

type ViewMode = 'conversations' | 'requests'

// Polling interval when SignalR is disconnected (fallback)
const POLLING_INTERVAL = 5000
// Backup polling when SignalR is connected
const POLLING_INTERVAL_WITH_SIGNALR = 10000

export function MessagesPage() {
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetUserIdParam = searchParams.get('user') || searchParams.get('student')
  const conversationIdParam = searchParams.get('conversation')
  const processedTargetUserRef = useRef<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  
  const [viewMode, setViewMode] = useState<ViewMode>('conversations')
  const [conversations, setConversations] = useState<ConversationDto[]>([])
  const [requests, setRequests] = useState<ConversationRequestDto[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationDto | null>(null)
  const [messages, setMessages] = useState<ConversationMessageDto[]>([])
  const [messageContent, setMessageContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [targetUserId, setTargetUserId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  // Load conversations
  const loadConversations = useCallback(async (selectFirst = false) => {
    try {
      const data = await conversationService.getConversations()
      setConversations(data)
      if (selectFirst && data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0])
      }
      return data
    } catch (error) {
      console.error('Failed to load conversations:', error)
      return []
    }
  }, [selectedConversation])

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const data = await conversationService.getConversationMessages(conversationId)
      setMessages(data)
      // Scroll to bottom after loading
      setTimeout(scrollToBottom, 100)
      return data
    } catch (error) {
      console.error('Failed to load messages:', error)
      return []
    }
  }, [scrollToBottom])

  // Connect to SignalR for real-time messages
  useEffect(() => {
    if (!user) return
    connectMessagingHub()
  }, [user])

  // Join/leave conversation group when selection changes
  useEffect(() => {
    if (!selectedConversation) return
    joinConversation(selectedConversation.id)
    return () => {
      leaveConversation(selectedConversation.id)
    }
  }, [selectedConversation?.id])

  // Handle real-time messages from SignalR
  useEffect(() => {
    const unsubscribe = onMessageReceived((message) => {
      if (!selectedConversation || message.conversationId !== selectedConversation.id) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        return [...prev, message]
      })
      scrollToBottom()
      // Refresh notification bell (new message creates a notification)
      window.dispatchEvent(new Event('notificationUpdate'))
    })
    return unsubscribe
  }, [selectedConversation?.id, scrollToBottom])

  // Handle conversation list updates from SignalR
  useEffect(() => {
    const unsubscribe = onConversationUpdated(() => {
      loadConversations(false)
      window.dispatchEvent(new Event('notificationUpdate'))
    })
    return unsubscribe
  }, [loadConversations])

  // Initial load
  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true)
      if (viewMode === 'conversations') {
        await loadConversations(true)
      } else {
        await loadRequests()
      }
      setLoading(false)
    }
    initialLoad()
  }, [viewMode])

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id)
      markAsRead(selectedConversation.id)
    }
  }, [selectedConversation?.id])

  // Track open thread so global message toasts don't fire while user is viewing this chat
  useEffect(() => {
    if (selectedConversation?.id) {
      setOpenConversationId(selectedConversation.id)
    } else {
      setOpenConversationId(null)
    }
    return () => {
      setOpenConversationId(null)
    }
  }, [selectedConversation?.id])

  // Open conversation from ?conversation=<uuid> (e.g. from toast "open chat")
  useEffect(() => {
    if (!conversationIdParam || conversations.length === 0) return
    const found = conversations.find((c) => c.id === conversationIdParam)
    if (found) {
      setSelectedConversation(found)
      setSearchParams({}, { replace: true })
    }
  }, [conversationIdParam, conversations, setSearchParams])

  // Polling fallback for new messages (when SignalR disconnected or as backup)
  useEffect(() => {
    if (!selectedConversation) return

    const pollMessages = () => loadMessages(selectedConversation.id)
    const intervalMs = isConnected() ? POLLING_INTERVAL_WITH_SIGNALR : POLLING_INTERVAL
    const interval = setInterval(pollMessages, intervalMs)
    return () => clearInterval(interval)
  }, [selectedConversation?.id, loadMessages])

  // Poll for new conversations
  useEffect(() => {
    if (viewMode !== 'conversations') return

    const pollConversations = async () => {
      await loadConversations(false)
    }

    const interval = setInterval(pollConversations, POLLING_INTERVAL * 2) // Poll less frequently
    return () => clearInterval(interval)
  }, [viewMode, loadConversations])

  // Open or create direct chat with user from URL (?user= or ?student=)
  useEffect(() => {
    const handleTargetUserParam = async () => {
      if (!targetUserIdParam || processedTargetUserRef.current === targetUserIdParam) return

      processedTargetUserRef.current = targetUserIdParam

      try {
        const existingConversations = await conversationService.getConversations()
        const existingConv = existingConversations.find(
          (conv) => conv.type === 'Direct' && conv.otherParticipant?.userId === targetUserIdParam
        )

        if (existingConv) {
          setConversations(existingConversations)
          setSelectedConversation(existingConv)
          setSearchParams({})
          return
        }

        const newConversation = await conversationService.createConversation({
          type: 'Direct',
          otherUserId: targetUserIdParam,
        })

        const updatedConversations = await conversationService.getConversations()
        setConversations(updatedConversations)
        setSelectedConversation(newConversation)
        setSearchParams({})

        toast.success('Conversation started', {
          description: 'You can now send messages',
        })
      } catch (error) {
        console.error('Failed to start conversation:', error)
        toast.error('Failed to start conversation', {
          description: error instanceof Error ? error.message : 'An error occurred',
        })
        setSearchParams({})
      }
    }

    handleTargetUserParam()
  }, [targetUserIdParam, setSearchParams])

  const loadRequests = async () => {
    try {
      const data = await conversationService.getPendingRequests()
      setRequests(data)
    } catch (error) {
      toast.error('Failed to load requests')
    }
  }

  const markAsRead = async (conversationId: string) => {
    try {
      await conversationService.markAsRead(conversationId)
      loadConversations(false)
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const sendMessage = async () => {
    if (!selectedConversation || !messageContent.trim()) return

    try {
      setSending(true)
      const newMessage = await conversationService.sendMessage({
        conversationId: selectedConversation.id,
        content: messageContent.trim(),
      })
      setMessages(prev => [...prev, newMessage])
      setMessageContent('')
      scrollToBottom()
      // Refresh conversation list in background (don't block UI)
      void loadConversations(false)
    } catch (error) {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const conversation = await conversationService.acceptRequest(requestId)
      toast.success('Request accepted')
      setViewMode('conversations')
      setSelectedConversation(conversation)
      loadRequests()
      loadConversations(false)
    } catch (error) {
      toast.error('Failed to accept request')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      await conversationService.rejectRequest(requestId)
      toast.success('Request rejected')
      loadRequests()
    } catch (error) {
      toast.error('Failed to reject request')
    }
  }

  const handleBlockUser = async () => {
    if (!targetUserId) return
    try {
      await conversationService.blockUser({ userId: targetUserId })
      toast.success('User blocked')
      setShowBlockDialog(false)
      setTargetUserId(null)
      loadConversations(false)
    } catch (error) {
      toast.error('Failed to block user')
    }
  }

  const handleReportUser = async () => {
    if (!targetUserId || !reportReason.trim()) return
    try {
      await conversationService.reportUser({
        userId: targetUserId,
        reason: reportReason.trim(),
        details: reportDetails.trim() || undefined,
      })
      toast.success('User reported')
      setShowReportDialog(false)
      setTargetUserId(null)
      setReportReason('')
      setReportDetails('')
    } catch (error) {
      toast.error('Failed to report user')
    }
  }

  const otherParticipant = selectedConversation?.otherParticipant
  const isDirectConversation = selectedConversation?.type === 'Direct'
  const isCourseConversation = selectedConversation?.type === 'Course'
  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
  const pendingRequestsCount = requests.length

  return (
    <div className="flex min-h-0 w-full max-w-full flex-col gap-3 pb-[env(safe-area-inset-bottom,0px)] sm:gap-4 lg:min-h-[min(760px,calc(100dvh-10rem))]">
      {/* Header */}
      <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold sm:text-2xl">Messages</h1>
          <p className="text-sm text-muted-foreground">Chat with students and instructors</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant={viewMode === 'conversations' ? 'default' : 'outline'}
            onClick={() => setViewMode('conversations')}
            size="sm"
            className="flex-1 sm:flex-initial"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Conversations</span>
            <span className="sm:hidden">Chats</span>
            {totalUnread > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                {totalUnread}
              </Badge>
            )}
          </Button>
          <Button
            variant={viewMode === 'requests' ? 'default' : 'outline'}
            onClick={() => setViewMode('requests')}
            size="sm"
            className="flex-1 sm:flex-initial"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Requests</span>
            <span className="sm:hidden">Req</span>
            {pendingRequestsCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                {pendingRequestsCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {viewMode === 'conversations' ? (
        <div className="grid min-h-0 flex-1 gap-4 lg:min-h-[min(640px,calc(100dvh-12rem))] lg:grid-cols-[minmax(0,320px)_1fr]">
          {/* Conversations List — full width on mobile; hidden when a chat is open (mobile only) */}
          <Card
            className={`flex min-h-0 flex-col max-lg:min-h-[40dvh] ${
              selectedConversation ? 'max-lg:hidden' : ''
            }`}
          >
            <CardHeader className="flex-shrink-0 py-3">
              <CardTitle className="text-base">Inbox</CardTitle>
              <CardDescription className="text-xs">
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
              <div className="h-full max-h-[min(42dvh,380px)] overflow-y-auto overscroll-contain scroll-fancy lg:max-h-[min(60vh,520px)]">
                <div className="space-y-1 p-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No conversations yet
                    </div>
                  ) : (
                    conversations.map((conv) => {
                      const isActive = conv.id === selectedConversation?.id
                      const convIsDirectConversation = conv.type === 'Direct'
                      const convIsCourseConversation = conv.type === 'Course'
                      const displayName = convIsDirectConversation && conv.otherParticipant
                        ? conv.otherParticipant.userName
                        : convIsCourseConversation
                        ? conv.courseTitle || conv.title || 'Course Chat'
                        : conv.title || 'Conversation'

                      return (
                        <button
                          key={conv.id}
                          className={cn(
                            'w-full rounded-lg px-3 py-2.5 text-left text-sm transition-all',
                            'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isActive && 'bg-accent border border-primary/30'
                          )}
                          onClick={() => setSelectedConversation(conv)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {convIsCourseConversation ? (
                                  <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                                ) : (
                                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                                )}
                                <span className={cn(
                                  'truncate font-medium text-sm',
                                  conv.unreadCount > 0 && 'text-foreground font-semibold'
                                )}>
                                  {displayName}
                                </span>
                                {convIsDirectConversation &&
                                  conv.otherParticipant?.isInstructor &&
                                  conv.otherParticipant.userId === conv.lastMessage?.senderId && (
                                    <span
                                      className="inline-flex shrink-0 rounded-full border border-amber-500/35 bg-amber-500/10 px-1.5 py-px text-[9px] font-semibold text-amber-800 dark:text-amber-300"
                                      title="Official / staff account"
                                    >
                                      Official
                                    </span>
                                  )}
                              </div>
                              {conv.lastMessage && (
                                <p className="truncate text-xs text-muted-foreground mt-1 ml-6">
                                  {conv.lastMessage.senderName}: {conv.lastMessage.content}
                                </p>
                              )}
                            </div>
                            {conv.unreadCount > 0 && (
                              <Badge variant="destructive" className="shrink-0 h-5 min-w-5 px-1.5 text-xs">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                          </p>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversation View — on mobile, only when a thread is selected */}
          <Card
            className={`min-h-0 ${
              !selectedConversation
                ? 'hidden lg:flex lg:flex-col'
                : 'flex flex-col max-lg:min-h-[calc(100dvh-11rem)] lg:min-h-[min(640px,calc(100dvh-14rem))]'
            }`}
          >
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="flex-shrink-0 border-b py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mt-0.5 shrink-0 lg:hidden"
                        aria-label="Back to inbox"
                        onClick={() => setSelectedConversation(null)}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                    <div className="min-w-0">
                      <CardTitle className="text-base flex flex-wrap items-center gap-2">
                        {isCourseConversation ? (
                          <BookOpen className="h-4 w-4 shrink-0" />
                        ) : (
                          <Users className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate">
                          {isCourseConversation
                            ? selectedConversation.courseTitle || selectedConversation.title || 'Course Chat'
                            : otherParticipant?.userName || 'Conversation'}
                        </span>
                        {isDirectConversation && otherParticipant?.isInstructor && (
                          <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                            <Shield className="h-3 w-3" aria-hidden />
                            Official account
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs truncate">
                        {isDirectConversation && otherParticipant
                          ? 'Direct conversation'
                          : `${selectedConversation.participants.length} participants`}
                      </CardDescription>
                    </div>
                    </div>
                    {isDirectConversation && otherParticipant && (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTargetUserId(otherParticipant.userId)
                            setShowBlockDialog(true)
                          }}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTargetUserId(otherParticipant.userId)
                            setShowReportDialog(true)
                          }}
                        >
                          <Flag className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                {/* Messages Area — single scroll, no nested ScrollArea */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div
                    ref={messagesContainerRef}
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-fancy"
                  >
                    <div className="space-y-3 p-4">
                      {messages.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          No messages yet. Start the conversation!
                        </div>
                      ) : (
                        messages.map((message) => {
                          const isOwnMessage = message.senderId === user?.id
                          const staffFromApi = Boolean(
                            message.senderIsStaff ??
                              (message as { SenderIsStaff?: boolean }).SenderIsStaff
                          )
                          const staffFromParticipant =
                            !!otherParticipant &&
                            message.senderId === otherParticipant.userId &&
                            otherParticipant.isInstructor
                          const isStaffMessage =
                            !isOwnMessage && (staffFromApi || staffFromParticipant)
                          const staffLabel = staffFromApi
                            ? 'System admin'
                            : staffFromParticipant
                              ? 'Teaching staff'
                              : null
                          return (
                            <div
                              key={message.id}
                              className={cn(
                                'flex gap-2',
                                isOwnMessage && 'flex-row-reverse'
                              )}
                            >
                              {!isOwnMessage && (
                                <div
                                  className={cn(
                                    'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                                    isStaffMessage
                                      ? 'bg-amber-500/15 ring-2 ring-amber-500/35'
                                      : 'bg-primary/10'
                                  )}
                                >
                                  {message.senderProfilePictureUrl ? (
                                    <img
                                      src={message.senderProfilePictureUrl}
                                      alt={message.senderName}
                                      className="h-8 w-8 rounded-full object-cover"
                                    />
                                  ) : isStaffMessage ? (
                                    <Shield className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-hidden />
                                  ) : (
                                    <span className="text-xs font-medium text-primary">
                                      {message.senderName.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className={cn('flex flex-col max-w-[75%]', isOwnMessage && 'items-end')}>
                                {!isOwnMessage && (
                                  <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                                    {isStaffMessage && staffLabel && (
                                      <span
                                        className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300"
                                        title={staffFromApi ? 'System administrator' : 'Course staff or instructor'}
                                      >
                                        <Shield className="h-3 w-3 shrink-0" aria-hidden />
                                        {staffLabel}
                                      </span>
                                    )}
                                    <span className={cn(isStaffMessage && 'font-medium text-foreground')}>
                                      {message.senderName}
                                    </span>
                                  </span>
                                )}
                                <div
                                  className={cn(
                                    'rounded-2xl px-3 py-2 text-sm break-words',
                                    isOwnMessage
                                      ? 'bg-primary text-primary-foreground rounded-br-md'
                                      : isStaffMessage
                                        ? 'border-2 border-amber-500/35 bg-amber-500/[0.08] text-foreground rounded-bl-md shadow-sm'
                                        : 'bg-muted rounded-bl-md'
                                  )}
                                >
                                  {message.content}
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-0.5">
                                  {format(new Date(message.sentAt), 'h:mm a')}
                                </span>
                              </div>
                            </div>
                          )
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                </div>

                {/* Message Input */}
                <div className="border-t p-3 flex-shrink-0">
                  <div className="flex gap-2 items-end">
                    <Textarea
                      placeholder="Type a message..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      className="min-h-[44px] max-h-[120px] resize-none text-sm"
                      rows={1}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!messageContent.trim() || sending}
                      size="icon"
                      className="shrink-0 h-[44px] w-[44px]"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium">No conversation selected</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select a conversation from the inbox
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      ) : (
        /* Requests View */
        <Card className="flex-1 min-h-0 flex flex-col">
          <CardHeader className="py-3 flex-shrink-0">
            <CardTitle className="text-base">Pending Requests</CardTitle>
            <CardDescription className="text-xs">
              {requests.length} request{requests.length !== 1 ? 's' : ''} waiting
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-fancy">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium">No pending requests</p>
                  <p className="text-sm text-muted-foreground mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {requests.map((request) => (
                    <div key={request.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            {request.requesterProfilePictureUrl ? (
                              <img
                                src={request.requesterProfilePictureUrl}
                                alt={request.requesterName}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium text-primary">
                                {request.requesterName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{request.requesterName}</p>
                            <p className="text-xs text-muted-foreground truncate">{request.requesterEmail}</p>
                            {request.message && (
                              <p className="mt-1 text-sm text-foreground line-clamp-2">{request.message}</p>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectRequest(request.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptRequest(request.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* Block User Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>
              This user will no longer be able to send you messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBlockUser}>
              Block User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report User Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>
              Please provide details about why you're reporting this user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Input
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="e.g., Harassment, Spam"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Additional Details (Optional)</label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Provide any additional information..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReportUser}
              disabled={!reportReason.trim()}
            >
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
