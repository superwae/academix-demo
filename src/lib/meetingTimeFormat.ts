const DAY_LABELS: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h <= 0) return `${min}m`;
  return min > 0 ? `${h}h ${min}m` : `${h}h`;
}

export function formatMeetingSlot(day: number, startMinutes: number, endMinutes: number): string {
  const dayLabel = DAY_LABELS[day] ?? `Day ${day}`;
  return `${dayLabel} · ${fmtMinutes(startMinutes)} – ${fmtMinutes(endMinutes)}`;
}

export function resolvePublicFileUrl(fileUrl: string): string {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
  if (typeof window !== 'undefined' && fileUrl.startsWith('/')) {
    return `${window.location.origin}${fileUrl}`;
  }
  return fileUrl;
}
