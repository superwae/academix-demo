/** Semantic event tones — styled via CSS using theme tokens (light + dark). */
export const CALENDAR_EVENT_TONES = [
  'primary',
  'info',
  'purple',
  'success',
  'orange',
  'warning',
] as const

export type CalendarEventTone = (typeof CALENDAR_EVENT_TONES)[number]

export function buildCourseToneMap(ids: string[]): Map<string, CalendarEventTone> {
  const map = new Map<string, CalendarEventTone>()
  ids.forEach((id, idx) => {
    if (!map.has(id)) {
      map.set(id, CALENDAR_EVENT_TONES[idx % CALENDAR_EVENT_TONES.length])
    }
  })
  return map
}

export function calendarEventClassNames(tone: CalendarEventTone): string[] {
  return ['calendar-event', `calendar-event-tone-${tone}`]
}
