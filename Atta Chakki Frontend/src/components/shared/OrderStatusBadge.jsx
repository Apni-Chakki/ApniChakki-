import { cn } from '../../utils/utils';

// Colored status pill, centralized so all admin & customer pages use consistent colors

const STATUS_STYLES = {
  pending:           'bg-amber-100 text-amber-800 ring-amber-200',
  pickup_pending:    'bg-amber-100 text-amber-800 ring-amber-200',
  confirmed:         'bg-blue-100 text-blue-800 ring-blue-200',
  processing:        'bg-indigo-100 text-indigo-800 ring-indigo-200',
  ready:             'bg-teal-100 text-teal-800 ring-teal-200',
  pickup_assigned:    'bg-orange-100 text-orange-800 ring-orange-200',
  coming_for_pickup: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
  arrived_at_shop:   'bg-teal-100 text-teal-800 ring-teal-200',
  delivery_assigned: 'bg-blue-100 text-blue-800 ring-blue-200',
  out_for_delivery:  'bg-purple-100 text-purple-800 ring-purple-200',
  delivered:         'bg-green-100 text-green-800 ring-green-200',
  completed:         'bg-green-100 text-green-800 ring-green-200',
  cancelled:         'bg-red-100 text-red-800 ring-red-200',
  refunded:          'bg-slate-100 text-slate-800 ring-slate-200',
  on_hold:           'bg-orange-100 text-orange-800 ring-orange-200',
  paid:              'bg-emerald-100 text-emerald-800 ring-emerald-200',
  partial:           'bg-sky-100 text-sky-800 ring-sky-200',
  unpaid:            'bg-amber-100 text-amber-800 ring-amber-200',
  split_parent:      'bg-purple-100 text-purple-800 ring-purple-200',
  batch_ready:       'bg-teal-100 text-teal-800 ring-teal-200',
};

const FALLBACK = 'bg-gray-100 text-gray-800 ring-gray-200';

function humanize(status) {
  if (!status) return 'Unknown';
  if (status === 'split_parent') return 'In Batches';
  if (status === 'batch_ready') return 'Batch Ready';
  return String(status).replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function OrderStatusBadge({ status, className, label, t }) {
  const rawKey = String(status || '').toLowerCase().trim();
  const normalizedKey = rawKey.replace(/-/g, '_');
  const style = STATUS_STYLES[normalizedKey] || STATUS_STYLES[rawKey] || FALLBACK;
  const displayLabel = label || (t ? t(humanize(status)) : humanize(status));

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap',
        style,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}

export default OrderStatusBadge;

