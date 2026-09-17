/**
 * Utility for formatting Pakistani WhatsApp phone numbers and opening WhatsApp chat URLs.
 */

/**
 * Normalizes phone numbers to standard WhatsApp format (e.g., 923001234567).
 * Handles: 03001234567 -> 923001234567, +923001234567 -> 923001234567, 3001234567 -> 923001234567
 */
export function formatWhatsAppPhone(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('0')) {
    cleaned = '92' + cleaned.slice(1);
  } else if (cleaned.length === 10 && !cleaned.startsWith('92')) {
    cleaned = '92' + cleaned;
  }
  return cleaned;
}

/**
 * Builds a direct wa.me chat URL with encoded message text.
 */
export function getWhatsAppUrl(phone, message = '') {
  const cleanPhone = formatWhatsAppPhone(phone);
  if (!cleanPhone) return '';
  if (!message) return `https://wa.me/${cleanPhone}`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Opens WhatsApp chat in a new tab/window.
 * Returns true if URL was opened, false if phone was invalid.
 */
export function sendWhatsAppMessage(phone, message = '') {
  const url = getWhatsAppUrl(phone, message);
  if (!url) return false;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }
  return false;
}

export default {
  formatWhatsAppPhone,
  getWhatsAppUrl,
  sendWhatsAppMessage,
};
