import i18n from '../i18n'

export function formatMoney(amount: number, currency = 'ILS', locale?: string): string {
  const resolvedLocale = locale || i18n.language || undefined
  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Defensive fallback for an invalid currency/locale code.
    return `${amount.toFixed(2)} ${currency}`
  }
}

/** True when a course requires checkout before enrollment. */
export function isPaidCourse(price?: number | null): boolean {
  return (price ?? 0) > 0
}
