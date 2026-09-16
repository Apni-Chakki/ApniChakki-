/**
 * Pure display/translation helpers extracted from PrintOrderDetails.jsx (Phase 3.7a).
 * All functions are stateless — safe to import anywhere. Every helper takes `lang`
 * ('en' or 'ur') as an explicit argument instead of reading it from a component
 * closure.
 */

const URDU_DICT = {
  'SUCHI CHAKKI': 'سچی چکی',
  'Main Bazaar, Lahore': 'مین بازار، لاہور',
  'Pure & Fresh Processing': 'خالص اور تازہ پروسیسنگ',
  'Pure Grains, Fresh Quality': 'خالص اناج، بہترین معیار',
  'Wheat Flour': 'گندم کا آٹا',
  'Chakki Atta': 'چکی کا آٹا',
  'Special Atta': 'خصوصی آٹا',
  'Fine Atta': 'فائن آٹا',
  'Maida': 'میدہ',
  'Suji': 'سوجی',
  'Besan': 'بیسن',
  'Grinding Service': 'پسائی کی سروس',
  'Cleaning Service': 'صفائی کی سروس',
  'Wheat': 'گندم',
  'Gram': 'چنا',
  'Maize': 'مکئی',
  'Barley': 'جَو',
  'Millet': 'باجرہ',
  'Oats': 'جئی',
  'Rice': 'چاول',
  'Spices': 'مصالحہ جات',
  'Red Chili': 'سرخ مرچ',
  'Turmeric': 'ہلدی',
  'Coriander': 'دھنیا',
};

// urdu translation dictionary se match karna
export function translateText(text, lang) {
  if (lang === 'en') return text;
  if (!text) return '';
  const clean = String(text).trim();

  if (URDU_DICT[clean]) return URDU_DICT[clean];

  // small capital letters check karna
  const lower = clean.toLowerCase();
  for (const key in URDU_DICT) {
    if (key.toLowerCase() === lower) return URDU_DICT[key];
  }

  return text;
}

// order status show karna
export function getStatusLabel(status, lang = 'en') {
  const mapEn = {
    pending: 'Pending',
    processing: 'Processing',
    ready: 'Ready for Pickup/Delivery',
    'out-for-delivery': 'Out for Delivery',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  const mapUr = {
    pending: 'زیر التواء',
    processing: 'جاری ہے',
    ready: 'تیار ہے پک اپ/ڈیلیوری کیلئے',
    'out-for-delivery': 'ڈیلیوری کے لیے روانہ',
    completed: 'مکمل شدہ',
    cancelled: 'منسوخ شدہ',
  };
  const map = lang === 'ur' ? mapUr : mapEn;
  return map[status] || status;
}

/** Inline CSS string for status badge — used by the print HTML builder. */
export function getStatusBadgeStyle(status) {
  const map = {
    pending: 'background:#fef9c3;color:#854d0e;border:1px solid #fde047;',
    processing: 'background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;',
    ready: 'background:#dcfce7;color:#166534;border:1px solid #86efac;',
    'out-for-delivery': 'background:#f3e8ff;color:#6b21a8;border:1px solid #c4b5fd;',
    completed: 'background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;',
    cancelled: 'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;',
  };
  return map[status] || 'background:#f3f4f6;color:#374151;border:1px solid #d1d5db;';
}

/** Tailwind class string for status badge — used by the preview JSX. */
export function getStatusColorClass(status) {
  const map = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    processing: 'bg-blue-100 text-blue-800 border-blue-300',
    ready: 'bg-green-100 text-green-800 border-green-300',
    'out-for-delivery': 'bg-purple-100 text-purple-800 border-purple-300',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  };
  return map[status] || 'bg-gray-100 text-gray-700 border-gray-300';
}

/** "Delivery" / "Pickup" — translated. */
export function getOrderTypeLabel(type, lang) {
  if (lang === 'ur') return type === 'delivery' ? 'ڈیلیوری' : 'پک اپ';
  return type === 'delivery' ? 'Delivery' : 'Pickup';
}

/** Payment method display label (JazzCash, EasyPaisa, CASH, or raw). */
export function getPaymentMethodLabel(method, lang) {
  const lower = (method || '').toLowerCase();
  if (lang === 'ur') {
    if (lower === 'jazzcash') return 'جائز کیش';
    if (lower === 'easypaisa') return 'ایزی پیسہ';
    if (lower === 'cash') return 'نقد رقم';
    return method || 'نقد رقم';
  }
  if (lower === 'jazzcash') return 'JazzCash';
  if (lower === 'easypaisa') return 'EasyPaisa';
  if (lower === 'cash') return 'CASH';
  return method || 'CASH';
}

/** "✓ PAID" / "PARTIAL" / "✗ UNPAID" — translated. */
export function getPaymentStatusLabel(status, lang) {
  if (lang === 'ur') {
    if (status === 'paid') return '✓ ادا شدہ';
    if (status === 'partial') return 'جزوی ادائیگی';
    return '✗ غیر ادا شدہ';
  }
  if (status === 'paid') return '✓ PAID';
  if (status === 'partial') return 'PARTIAL';
  return '✗ UNPAID';
}

/** Translate a unit like "kg" → "کلو" for Urdu bills. */
export function translateUnit(unit, lang) {
  if (lang !== 'ur') return unit;
  const lower = String(unit || '').toLowerCase();
  if (lower === 'kg') return 'کلو';
  if (lower === 'unit' || lower === 'units' || lower === 'pcs' || lower === 'piece' || lower === 'pieces') {
    return 'عدد';
  }
  return unit;
}

/**
 * Render the customization / service-addon text for a single cart item —
 * either the selected customization option names, or the Cleaning + Grinding
 * flags on legacy grinding items.
 */
export function getCustomizationsText(item, lang) {
  if (item.customizations?.length > 0) {
    return item.customizations.map((c) => translateText(c.option_name, lang)).join(' + ');
  }
  const services = [];
  if (item.is_cleaning == 1) services.push(lang === 'ur' ? 'صفائی' : 'Cleaning');
  if (item.is_grinding == 1) services.push(lang === 'ur' ? 'پسائی' : 'Grinding');
  return services.join(' + ');
}
