/** Used to suppress in-app toasts when the user already has this thread open */
export const OPEN_CONVERSATION_STORAGE_KEY = 'academix_open_conversation_id'

export function setOpenConversationId(id: string | null): void {
  if (typeof window === 'undefined') return
  if (id) sessionStorage.setItem(OPEN_CONVERSATION_STORAGE_KEY, id)
  else sessionStorage.removeItem(OPEN_CONVERSATION_STORAGE_KEY)
}

export function getOpenConversationId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(OPEN_CONVERSATION_STORAGE_KEY)
}
