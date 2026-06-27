/** Shared course date-range checks (UTC calendar dates from API vs local session days). */

export function storedYmd(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function localYmd(day: Date): string {
  const y = day.getFullYear()
  const m = String(day.getMonth() + 1).padStart(2, '0')
  const d = String(day.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isSessionDayInCourseBounds(
  sessionDay: Date,
  courseStartDate?: string | null,
  courseEndDate?: string | null,
): boolean {
  const start = storedYmd(courseStartDate)
  const end = storedYmd(courseEndDate)
  const cur = localYmd(sessionDay)
  if (start && cur < start) return false
  if (end && cur > end) return false
  return true
}
