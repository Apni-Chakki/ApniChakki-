import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/utils';

/**
 * Centered spinner with optional label. Use for full-page or in-card loading states.
 * <Loading /> or <Loading label="Fetching orders..." />
 */
export function Loading({ label, className, size = 24 }) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-10', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="animate-spin text-muted-foreground" style={{ width: size, height: size }} />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  );
}

/** Inline spinner for use inside a button or badge. */
export function Spinner({ size = 16, className }) {
  return <Loader2 className={cn('animate-spin', className)} style={{ width: size, height: size }} />;
}
