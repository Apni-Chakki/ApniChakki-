// whatsapp helpers: phone format + chat url + open chat

// normalizes phone to 92xxxxxxxxxx (handles 03xx, +923xx, 3xx)
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

// builds wa.me url, message gets encoded here
export function getWhatsAppUrl(phone, message = '') {
  const cleanPhone = formatWhatsAppPhone(phone);
  if (!cleanPhone) return '';
  if (!message) return `https://wa.me/${cleanPhone}`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// opens chat in new tab, returns false if phone is invalid
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
