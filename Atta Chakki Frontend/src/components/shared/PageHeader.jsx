import { cn } from '../../utils/utils';

/**
 * Standard admin page header. Replaces the ~15 hand-rolled title+subtitle+search
 * blocks across pages/admin/*.
 *
 * <PageHeader title="New Orders" subtitle="Awaiting confirmation" actions={<Button/>}>
 *   optional children rendered under the header
 * </PageHeader>
 */
export function PageHeader({ title, subtitle, actions, className, children }) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
