/**
 * Urdu translation helpers & terminology normalizers for order slips
 */

export function applySlipUrduCorrections(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/Apni Chakki/gi, 'سچی چکی')
    .replace(/Suchi Chakki/gi, 'سچی چکی')
    .replace(/Atta Chakki/gi, 'آٹا چکی')
    .replace(/\bChakki\b/gi, 'چکی')
    .replace(/\bAtta\b/gi, 'آٹا')
    .replace(/چاکی/g, 'چکی')
    .replace(/اپنے چکی/g, 'سچی چکی')
    .replace(/اپنی چاکی/g, 'سچی چکی');
}

export function translateSlipUnit(unit, isUrdu) {
  if (!isUrdu) return unit || 'unit';
  const u = String(unit || '').toLowerCase().trim();
  if (u === 'kg') return 'کلو';
  if (u === 'g' || u === 'gram') return 'گرام';
  if (u === 'liter' || u === 'litre' || u === 'l') return 'لیٹر';
  if (u === 'trip') return 'چکر';
  if (u === 'unit' || u === 'pcs' || u === 'piece' || u === 'pieces') return 'عدد';
  return unit || 'عدد';
}

export function translateSlipCustomizations(item, isUrdu) {
  if (item.customizations?.length > 0) {
    return item.customizations.map(c => c.option_name).join(' + ');
  }
  if (isUrdu) {
    if (item.is_cleaning && item.is_grinding) return 'صفائی + پسائی';
    if (item.is_cleaning) return 'صفائی';
    if (item.is_grinding) return 'پسائی';
  } else {
    if (item.is_cleaning && item.is_grinding) return 'Cleaning + Grinding';
    if (item.is_cleaning) return 'Cleaning';
    if (item.is_grinding) return 'Grinding';
  }
  return '';
}
