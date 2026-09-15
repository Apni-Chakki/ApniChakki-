/**
 * Display-formatting utilities.
 *
 * Migrated from ~40 inline templates like `` `Rs ${x.toLocaleString()}` ``.
 * All helpers accept null/undefined/NaN and return an empty string or 'Rs 0'
 * so they can be dropped into JSX without guard checks.
 */

const PKR = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 });
const PKR_DEC = new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "Rs 1,250" for whole numbers; passes 0/NaN as "Rs 0". */
export function formatPKR(value, { decimals = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Rs 0';
  return `Rs ${decimals ? PKR_DEC.format(n) : PKR.format(n)}`;
}

/** "15 Sep 2026" — short date. Accepts Date, ISO string, or ms timestamp. */
export function formatDate(input) {
  if (input == null || input === '') return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "15 Sep 2026, 03:45 PM" */
export function formatDateTime(input) {
  if (input == null || input === '') return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${date}, ${time}`;
}

/** "03:45 PM" */
export function formatTime(input) {
  if (input == null || input === '') return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * "0300-1234567" from raw digits. Pakistan mobile format.
 * Falls back to the original string if it doesn't look like a PK number.
 */
export function formatPhone(input) {
  if (!input) return '';
  const digits = String(input).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('03')) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  if (digits.length === 12 && digits.startsWith('92')) {
    return `+92 ${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return String(input);
}

/** "#00123" — order id with leading zeros. */
export function formatOrderId(id, { pad = 5 } = {}) {
  if (id == null || id === '') return '';
  return `#${String(id).padStart(pad, '0')}`;
}

/** Relative "2 hours ago" / "in 3 days". Simple, no i18n. */
export function formatRelative(input) {
  if (input == null || input === '') return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const diffSec = (d.getTime() - Date.now()) / 1000;
  const absSec = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const units = [
    ['year', 365 * 24 * 3600],
    ['month', 30 * 24 * 3600],
    ['day', 24 * 3600],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];
  for (const [unit, sec] of units) {
    if (absSec >= sec || unit === 'second') {
      return rtf.format(Math.round(diffSec / sec), unit);
    }
  }
  return '';
}

/** Truncate a long string with an ellipsis. */
export function truncate(text, max = 60) {
  if (!text) return '';
  const s = String(text);
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
