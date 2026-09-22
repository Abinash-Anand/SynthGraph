import { Skeleton } from "@/shared/ui/Skeleton";

export default function CaptureCompletenessLoading() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-16 w-96" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-24 border border-line bg-surface/40" />
        ))}
      </div>
    </div>
  );
}
