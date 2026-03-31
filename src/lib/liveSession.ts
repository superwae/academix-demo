/** Map API day strings to JavaScript getDay() (Sun=0 … Sat=6). */
export function dayStringToJsWeekday(day: string): number | null {
  const d = day.trim()
  const map: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  return map[d] ?? null
}

export type LiveSessionBadge = 'live' | 'soon' | 'today'

export interface MeetingMeta {
  day: string
  startMinutes: number
  endMinutes: number
}

/**
 * Same calendar day as the slot, compared to local "now".
 * - live: within session (with 10 min early join)
 * - soon: within 60 min before start
 * - today: later today (same day, before soon window)
 */
export function getLiveSessionBadge(meta: MeetingMeta, now: Date = new Date()): LiveSessionBadge | null {
  const dow = dayStringToJsWeekday(meta.day)
  if (dow === null || now.getDay() !== dow) return null

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const start = meta.startMinutes
  const end = meta.endMinutes

  if (nowMin > end) return null
  if (nowMin >= start - 10 && nowMin <= end) return 'live'
  if (nowMin >= start - 60 && nowMin < start - 10) return 'soon'
  if (nowMin < start - 60) return 'today'
  return null
}
