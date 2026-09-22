import { Skeleton } from "@/shared/ui/Skeleton";

export default function DashboardOverviewLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64 bg-surface-2/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-28 border border-line bg-surface/40" />
        ))}
      </div>
    </div>
  );
}
