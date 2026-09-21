// strip country code / leading 0 so 0300..., +92300... and 300... all match
const normalizePhone = (value) => String(value || '').replace(/\D/g, '').replace(/^(92|0)/, '');

// true if the order matches the search text (order no, customer name, phone, item names)
export function matchesOrderSearch(order, query) {
  const text = String(query || '').trim().toLowerCase().replace(/^#/, '');
  if (!text) return true;

  if (String(order.id).toLowerCase().includes(text)) return true;
  if (String(order.customer_name || '').toLowerCase().includes(text)) return true;

  const queryDigits = normalizePhone(text);
  if (queryDigits && normalizePhone(order.customer_phone).includes(queryDigits)) return true;

  return (order.items || []).some((item) => {
    const names = [item.name, item.service?.name, ...(item.customizations || []).map((c) => c.option_name)];
    return names.some((name) => String(name || '').toLowerCase().includes(text));
  });
}
