import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-2", className)} />;
}

/** Matches the shape of the detail pages: a title block, then a few
 * content sections. Reused across every nested detail-route loading.tsx. */
export function DetailPageSkeleton({ sections = 2 }: { sections?: number }) {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-16 w-64" />
      {Array.from({ length: sections }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32 bg-surface-2/70" />
          <Skeleton className="h-24 w-full border border-line bg-surface/40" />
        </div>
      ))}
    </div>
  );
}
