import type { MeetingMeta } from './liveSession';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** Backend DayOfWeek enum: Monday=1 … Sunday=7 (see AcademixLMS.Domain DayOfWeek) */
const API_DAY_TO_NAME: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

export function apiDayToDayName(day: number): string {
  return API_DAY_TO_NAME[day] ?? 'Monday';
}

/**
 * Start/end time of the most recent occurrence of this slot that is already over (local time).
 */
export function getLastPastSessionWindow(
  meta: MeetingMeta,
  now: Date = new Date(),
): { start: Date; end: Date } | null {
  const targetDow = meta.day.trim();
  for (let i = 0; i < 21; i++) {
    const check = new Date(now);
    check.setDate(check.getDate() - i);
    const name = WEEKDAYS[check.getDay()];
    if (name !== targetDow) continue;
    const start = new Date(check);
    const startHour = Math.floor(meta.startMinutes / 60);
    const startMinute = meta.startMinutes % 60;
    start.setHours(startHour, startMinute, 0, 0);

    const end = new Date(check);
    const h = Math.floor(meta.endMinutes / 60);
    const m = meta.endMinutes % 60;
    end.setHours(h, m, 59, 999);
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
    if (end <= now) return { start, end };
  }
  return null;
}

/**
 * End time of the most recent occurrence of this slot that is already over (local time).
 */
export function getLastPastSessionEnd(meta: MeetingMeta, now: Date = new Date()): Date | null {
  return getLastPastSessionWindow(meta, now)?.end ?? null;
}

export function meetingDismissKey(meetingTimeId: string, lastEndMs: number): string {
  return `academix_meeting_rating_dismissed:${meetingTimeId}:${lastEndMs}`;
}

export function isMeetingDismissedForOccurrence(meetingTimeId: string, lastEndMs: number): boolean {
  try {
    return localStorage.getItem(meetingDismissKey(meetingTimeId, lastEndMs)) === '1';
  } catch {
    return false;
  }
}

export function dismissMeetingForOccurrence(meetingTimeId: string, lastEndMs: number): void {
  try {
    localStorage.setItem(meetingDismissKey(meetingTimeId, lastEndMs), '1');
  } catch {
    /* ignore */
  }
}
