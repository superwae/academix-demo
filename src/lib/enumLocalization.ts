/**
 * Centralized enum + date/weekday localization.
 *
 * The backend stores enums as fixed English tokens ("Intermediate", "Hybrid",
 * "Active", "Monday", role names, …). Several screens already localize these
 * via i18n keys, but many rendered the raw English token. These helpers map a
 * stored token to its localized label using the SAME translation keys the
 * create-course / earnings / admin screens already use, so everything stays
 * consistent. They read the global i18n instance, so callers just pass the
 * stored value; components re-render on language change via useTranslation.
 */
import i18n from '../i18n'

const norm = (v?: string | null) => (v ?? '').trim().toLowerCase()

/** Course level: Beginner / Intermediate / Advanced. */
export function localizeLevel(level?: string | null): string {
  switch (norm(level)) {
    case 'beginner':
      return i18n.t('teacher:createCoursePage.levels.beginner')
    case 'intermediate':
      return i18n.t('teacher:createCoursePage.levels.intermediate')
    case 'advanced':
      return i18n.t('teacher:createCoursePage.levels.advanced')
    default:
      return level ?? ''
  }
}

/** Teaching mode / modality: Online / Hybrid / On-campus. */
export function localizeModality(modality?: string | null): string {
  switch (norm(modality)) {
    case 'online':
      return i18n.t('teacher:createCoursePage.modalities.online')
    case 'hybrid':
      return i18n.t('teacher:createCoursePage.modalities.hybrid')
    case 'on-campus':
    case 'oncampus':
    case 'on campus':
    case 'on-site':
    case 'onsite':
    case 'in-site':
    case 'in site':
      return i18n.t('teacher:createCoursePage.modalities.onCampus')
    default:
      return modality ?? ''
  }
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/** Day of week: Monday … Sunday. */
export function localizeWeekday(day?: string | null): string {
  const key = norm(day)
  if (WEEKDAYS.includes(key)) {
    return i18n.t(`teacher:teacherMyCourses.days.${key}`)
  }
  return day ?? ''
}

/** Enrollment status: Active / Completed / Dropped. */
export function localizeEnrollmentStatus(status?: string | null): string {
  switch (norm(status)) {
    case 'active':
      return i18n.t('teacher:courseStudents.status.active')
    case 'completed':
      return i18n.t('teacher:courseStudents.status.completed')
    case 'dropped':
      return i18n.t('teacher:courseStudents.status.dropped')
    default:
      return status ?? ''
  }
}

/** User role: admin / instructor / student / accountant / secretary. */
export function localizeRole(role?: string | null): string {
  switch (norm(role)) {
    case 'admin':
      return i18n.t('admin:users.filters.admin')
    case 'instructor':
    case 'teacher':
      return i18n.t('admin:users.filters.instructor')
    case 'student':
      return i18n.t('admin:users.filters.student')
    case 'accountant':
      return i18n.t('admin:users.filters.accountant')
    case 'secretary':
      return i18n.t('admin:users.filters.secretary')
    default:
      return role ?? ''
  }
}

/**
 * Format a date in the active locale. Defaults to a medium date
 * (e.g. "16 Jun 2026" / "١٦ يونيو ٢٠٢٦"). Pass options to customize.
 */
export function formatDate(
  date: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  if (date == null || date === '') return ''
  try {
    const d = date instanceof Date ? date : new Date(date)
    if (Number.isNaN(d.getTime())) return ''
    return new Intl.DateTimeFormat(i18n.language, options).format(d)
  } catch {
    return String(date)
  }
}
