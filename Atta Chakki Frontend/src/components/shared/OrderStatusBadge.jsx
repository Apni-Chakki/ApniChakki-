import { cn } from '../../utils/utils';

// colored status pill, one place so all admin pages use same colors

const STATUS_STYLES = {
  pending:          'bg-amber-100 text-amber-800 ring-amber-200',
  confirmed:        'bg-blue-100 text-blue-800 ring-blue-200',
  processing:       'bg-indigo-100 text-indigo-800 ring-indigo-200',
  ready:            'bg-teal-100 text-teal-800 ring-teal-200',
  out_for_delivery: 'bg-purple-100 text-purple-800 ring-purple-200',
  delivered:        'bg-green-100 text-green-800 ring-green-200',
  cancelled:        'bg-red-100 text-red-800 ring-red-200',
  refunded:         'bg-slate-100 text-slate-800 ring-slate-200',
  on_hold:          'bg-orange-100 text-orange-800 ring-orange-200',
};

const FALLBACK = 'bg-gray-100 text-gray-800 ring-gray-200';

function humanize(status) {
  if (!status) return 'Unknown';
  return String(status).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function OrderStatusBadge({ status, className, label }) {
  const key = String(status || '').toLowerCase();
  const style = STATUS_STYLES[key] || FALLBACK;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        style,
        className
      )}
    >
      {label || humanize(status)}
    </span>
  );
}
