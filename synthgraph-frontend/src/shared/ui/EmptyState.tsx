import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-line bg-surface/40 p-8">
      <p className="text-[15px] text-ink">{title}</p>
      {description ? <p className="max-w-[52ch] text-[13.5px] text-ink-muted">{description}</p> : null}
      {action}
    </div>
  );
}
