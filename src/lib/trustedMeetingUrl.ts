/** Host suffixes for well-known video meeting platforms. */
export const TRUSTED_MEETING_HOST_SUFFIXES = [
  'meet.google.com',
  'zoom.us',
  'zoom.com',
  'zoomgov.com',
  'teams.microsoft.com',
  'teams.live.com',
  'teams.cloud.microsoft',
  'govteams.microsoft.us',
  'webex.com',
  'gotomeeting.com',
  'gotomeet.me',
  'whereby.com',
  'meet.jit.si',
  'app.chime.aws',
  'chime.aws',
  'bluejeans.com',
  'ringcentral.com',
  'join.skype.com',
  'discord.com',
  'discord.gg',
] as const

export type MeetingUrlValidationReason =
  | 'invalid_format'
  | 'insecure_scheme'
  | 'credentials'
  | 'untrusted_host'

export type MeetingUrlValidationResult =
  | { ok: true; url: string }
  | { ok: false; reason: MeetingUrlValidationReason }

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, '')
}

function isIpAddressHost(host: string): boolean {
  if (host.startsWith('[')) return true
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
}

export function isTrustedMeetingHost(host: string): boolean {
  const normalized = normalizeHost(host)
  if (!normalized || isIpAddressHost(normalized)) return false

  return TRUSTED_MEETING_HOST_SUFFIXES.some(
    (suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`),
  )
}

/** Validates a non-empty meeting URL for teacher input and API saves. */
export function validateTrustedMeetingUrl(raw: string): MeetingUrlValidationResult {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { ok: false, reason: 'invalid_format' }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { ok: false, reason: 'invalid_format' }
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'insecure_scheme' }
  }

  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'credentials' }
  }

  if (!isTrustedMeetingHost(parsed.hostname)) {
    return { ok: false, reason: 'untrusted_host' }
  }

  return { ok: true, url: parsed.toString() }
}

/** Returns a safe join URL for students, or null if the link is missing or untrusted. */
export function getSafeMeetingJoinUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const result = validateTrustedMeetingUrl(raw)
  return result.ok ? result.url : null
}

export function isTrustedMeetingUrl(raw: string): boolean {
  return validateTrustedMeetingUrl(raw).ok
}

type MeetingUrlToastCopy = { title: string; description: string }

/** User-facing toast copy for teacher meeting URL validation failures. */
export function getMeetingUrlValidationToast(
  result: MeetingUrlValidationResult,
  t: (key: string) => string,
): MeetingUrlToastCopy | null {
  if (result.ok) return null

  if (
    result.reason === 'invalid_format' ||
    result.reason === 'insecure_scheme' ||
    result.reason === 'credentials'
  ) {
    return {
      title: t('teacher:teacherLiveSessions.invalidUrlTitle'),
      description: t('teacher:teacherLiveSessions.invalidUrlBody'),
    }
  }

  return {
    title: t('teacher:teacherLiveSessions.untrustedMeetingUrlTitle'),
    description: t('teacher:teacherLiveSessions.untrustedMeetingUrlBody'),
  }
}

/** Validates optional meeting URL input before save (empty clears the link). */
export function validateMeetingUrlForSave(raw: string): MeetingUrlValidationResult | { ok: true; url: undefined } {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: true, url: undefined }
  return validateTrustedMeetingUrl(trimmed)
}
