import i18n from '../i18n'

/**
 * Format a monetary amount for display.
 *
 * The payment gateway (Lahza) charges in ILS, so that is the default
 * currency — never hardcode "$" in price renderings. Mirrors the inline
 * formatters in OrgLicensesListPage / TeacherEarningsPage and uses the
 * active i18n language for the locale unless one is passed explicitly.
 */
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
