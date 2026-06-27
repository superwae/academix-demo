import type { SupportTicketCategory, SupportTicketPriority } from '../../services/supportTicketService'
import type { SupportIssueType } from './supportIssueTypes'
import { searchKnowledgeBase } from './supportKnowledgeBase'

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const URGENT_KEYWORDS = [
  'urgent',
  'cannot login',
  "can't login",
  'locked out',
  'payment failed',
  'charged twice',
  'exam',
  'deadline',
  'not working',
  'broken',
  'error 500',
]

type ChatIntent =
  | 'greeting'
  | 'thanks'
  | 'goodbye'
  | 'manager'
  | 'explicit_ticket'
  | 'login'
  | 'payment'
  | 'course_access'
  | 'certificate'
  | 'video'
  | 'assignment'
  | 'instructor'
  | 'bug'
  | 'feature'
  | 'general_help'
  | 'unknown'

function detectIntent(text: string): ChatIntent {
  const lower = text.toLowerCase().trim()

  if (/^(hi|hello|hey|yo|good morning|good evening|salam|marhaba)\b/.test(lower)) return 'greeting'
  if (/how are you|are you (ok|good|fine|well)|you good|u good/.test(lower)) return 'greeting'
  if (/^(thanks|thank you|thx|appreciate)/.test(lower)) return 'thanks'
  if (/^(bye|goodbye|see you|later)\b/.test(lower)) return 'goodbye'

  if (/manager|supervisor|team lead|escalat|human agent|real person|speak to someone|talk to someone|not a bot/.test(lower)) {
    return 'manager'
  }
  if (/open a ticket|create a ticket|submit a ticket|file a ticket|need support ticket/.test(lower)) {
    return 'explicit_ticket'
  }

  if (/login|password|sign in|locked out|verify email|2fa|account access/.test(lower)) return 'login'
  if (/pay|bill|subscription|refund|charge|invoice|card declined/.test(lower)) return 'payment'
  if (/certificate|cert|completion badge/.test(lower)) return 'certificate'
  if (/assignment|submit homework|submission failed/.test(lower)) return 'assignment'
  if (/video won'?t play|buffer|lesson video|playback/.test(lower)) return 'video'
  if (/course access|locked course|can'?t open course|enroll/.test(lower)) return 'course_access'
  if (/publish course|upload video|instructor|payout|earnings/.test(lower)) return 'instructor'
  if (/bug|crash|error|broken|glitch/.test(lower)) return 'bug'
  if (/feature|suggest|idea|wish/.test(lower)) return 'feature'
  if (/help|problem|issue|stuck|doesn'?t work/.test(lower)) return 'general_help'

  return 'unknown'
}

export function suggestCategoryFromText(text: string): SupportTicketCategory {
  const intent = detectIntent(text)
  if (intent === 'login') return 'Account'
  if (intent === 'payment') return 'Billing'
  if (intent === 'certificate' || intent === 'course_access' || intent === 'assignment' || intent === 'instructor') {
    return 'Course'
  }
  if (intent === 'video' || intent === 'bug') return 'Technical'
  if (intent === 'feature') return 'Feedback'
  return 'Other'
}

export function suggestIssueTypeFromText(text: string): SupportIssueType | undefined {
  const lower = text.toLowerCase()
  if (/login|password|account/.test(lower)) return 'account_login'
  if (/certificate/.test(lower)) return 'certificates'
  if (/pay|bill|subscription|refund/.test(lower)) return 'payment_billing'
  if (/assignment|submit/.test(lower)) return 'assignment_submission'
  if (/publish|draft course/.test(lower)) return 'course_publishing'
  if (/upload|video upload/.test(lower)) return 'content_upload'
  if (/payout|earnings/.test(lower)) return 'payout_request'
  if (/bug|crash|error/.test(lower)) return 'bug_report'
  if (/feature|suggest/.test(lower)) return 'feature_request'
  if (/lesson|course access|locked/.test(lower)) return 'course_access'
  if (/video|technical|browser/.test(lower)) return 'technical'
  return undefined
}

export function detectUrgency(text: string): SupportTicketPriority {
  const lower = text.toLowerCase()
  const hits = URGENT_KEYWORDS.filter((k) => lower.includes(k)).length
  if (hits >= 2 || /urgent|asap|immediately|deadline today/.test(lower)) return 'Urgent'
  if (hits >= 1 || /payment|login|exam|cannot access/.test(lower)) return 'High'
  return 'Normal'
}

export function summarizeConversation(messages: AiChatMessage[]): string {
  const userLines = messages.filter((m) => m.role === 'user').map((m) => m.content)
  if (userLines.length === 0) return ''
  const combined = userLines.join(' ')
  if (combined.length <= 200) return combined
  return `${combined.slice(0, 197)}…`
}

function userTurnCount(history: AiChatMessage[]): number {
  return history.filter((m) => m.role === 'user').length
}

function lastUserMessage(history: AiChatMessage[]): string {
  const users = history.filter((m) => m.role === 'user')
  return users[users.length - 1]?.content ?? ''
}

function formatArticleList(titles: string[]): string {
  return titles.map((title) => `• ${title}`).join('\n')
}

function appendArticles(reply: string, articleTitles: string[], t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (articleTitles.length === 0) return reply
  return `${reply}\n\n${t('support:ai.intents.relatedArticles', { list: formatArticleList(articleTitles) })}`
}

export function generateAssistantReply(
  userMessage: string,
  history: AiChatMessage[],
  t: (key: string, opts?: Record<string, unknown>) => string
): { reply: string; suggestedArticles: string[]; suggestTicket: boolean } {
  const intent = detectIntent(userMessage)
  const turns = userTurnCount(history)
  const articles = searchKnowledgeBase(userMessage, 'all', t).slice(0, 3)
  const articleTitles = articles.map((a) => t(a.titleKey))

  switch (intent) {
    case 'greeting':
      return {
        reply: t('support:ai.intents.greeting'),
        suggestedArticles: [],
        suggestTicket: false,
      }

    case 'thanks':
      return {
        reply: t('support:ai.intents.thanks'),
        suggestedArticles: [],
        suggestTicket: false,
      }

    case 'goodbye':
      return {
        reply: t('support:ai.intents.goodbye'),
        suggestedArticles: [],
        suggestTicket: false,
      }

    case 'manager':
      return {
        reply: t('support:ai.intents.manager'),
        suggestedArticles: [],
        suggestTicket: false,
      }

    case 'explicit_ticket':
      return {
        reply: t('support:ai.intents.explicitTicket'),
        suggestedArticles: [],
        suggestTicket: false,
      }

    case 'login':
      return {
        reply: appendArticles(
          t('support:ai.intents.login', { tip: t('support:kb.loginResetBody') }),
          articleTitles,
          t
        ),
        suggestedArticles: articleTitles,
        suggestTicket: false,
      }

    case 'payment':
      return {
        reply: t('support:ai.intents.payment', {
          tip: t('support:kb.paymentBody'),
        }),
        suggestedArticles: articleTitles,
        suggestTicket: false,
      }

    case 'course_access':
      return {
        reply: t('support:ai.intents.courseAccess', {
          tip: t('support:kb.courseAccessBody'),
        }),
        suggestedArticles: articleTitles,
        suggestTicket: false,
      }

    case 'certificate':
      return {
        reply: t('support:ai.intents.certificate', {
          tip: t('support:kb.certificateBody'),
        }),
        suggestedArticles: articleTitles,
        suggestTicket: false,
      }

    case 'video':
      return {
        reply: t('support:ai.intents.video', {
          tip: t('support:kb.videoBody'),
        }),
        suggestedArticles: articleTitles,
        suggestTicket: false,
      }

    case 'assignment':
      return {
        reply: t('support:ai.intents.assignment', {
          tip: t('support:kb.studentAssignmentsBody'),
        }),
        suggestedArticles: articleTitles,
        suggestTicket: false,
      }

    case 'instructor':
      return {
        reply: t('support:ai.intents.instructor'),
        suggestedArticles: articleTitles,
        suggestTicket: false,
      }

    case 'bug':
      return {
        reply: t('support:ai.intents.bug'),
        suggestedArticles: articleTitles,
        suggestTicket: false,
      }

    case 'feature':
      return {
        reply: t('support:ai.intents.feature'),
        suggestedArticles: [],
        suggestTicket: false,
      }

    case 'general_help':
      if (articles.length > 0) {
        return {
          reply: t('support:ai.intents.generalHelpWithArticles', {
            list: formatArticleList(articleTitles),
          }),
          suggestedArticles: articleTitles,
          suggestTicket: false,
        }
      }
      return {
        reply: t('support:ai.intents.generalHelp'),
        suggestedArticles: [],
        suggestTicket: false,
      }

    case 'unknown':
    default: {
      const issueType = suggestIssueTypeFromText(userMessage)
      if (issueType && articles.length > 0) {
        return {
          reply: t('support:ai.intents.issueWithArticles', {
            list: formatArticleList(articleTitles.slice(0, 2)),
          }),
          suggestedArticles: articleTitles,
          suggestTicket: false,
        }
      }

      if (turns >= 3 && /yes|still|didn'?t work|not working|same problem/.test(userMessage.toLowerCase())) {
        return {
          reply: t('support:ai.intents.persistentIssue'),
          suggestedArticles: [],
          suggestTicket: false,
        }
      }

      if (turns === 1) {
        return {
          reply: t('support:ai.intents.clarify'),
          suggestedArticles: [],
          suggestTicket: false,
        }
      }

      const prev = lastUserMessage(history.slice(0, -1))
      if (prev && detectIntent(prev) === 'unknown') {
        return {
          reply: t('support:ai.intents.followUp'),
          suggestedArticles: [],
          suggestTicket: false,
        }
      }

      return {
        reply: t('support:ai.intents.clarify'),
        suggestedArticles: [],
        suggestTicket: false,
      }
    }
  }
}
