import { Inbox } from 'lucide-react';
import { cn } from '../../utils/utils';

/**
 * Empty state placeholder. Use when a list/table has no rows.
 *
 * <EmptyState
 *   icon={<Package />}
 *   title="No orders yet"
 *   description="New customer orders will appear here."
 *   action={<Button>Refresh</Button>}
 * />
 */
export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-12 px-6 text-center',
        className
      )}
    >
      <div className="rounded-full bg-muted p-3 text-muted-foreground">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      {title ? <h3 className="text-base font-semibold text-foreground">{title}</h3> : null}
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
