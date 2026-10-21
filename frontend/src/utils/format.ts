/** Presentation helpers shared by the dispute components and pages. */

/**
 * Formats a monetary amount with its ISO 4217 currency.
 *
 * The blueprint wireframes show whole units (`COP 35,000`), so decimals are
 * dropped. Unknown currency codes fall back to a plain grouped number so a
 * malformed backend value never crashes the page.
 */
export function formatAmount(amount: number, currency: string): string {
  try {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    // ICU separates a currency code from the number with a non-breaking space.
    // Normalise it so the rendered value stays predictable.
    return formatted.replace(/\u00a0/g, ' ');
  } catch {
    return `${currency} ${new Intl.NumberFormat('en-US').format(amount)}`;
  }
}

/** Formats an ISO timestamp as a date, for example `9 Oct 2026`. */
export function formatDate(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(isoTimestamp));
}

/** Formats an ISO timestamp as a date and time, for example `9 Oct 2026, 13:05`. */
export function formatDateTime(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(isoTimestamp));
}
