import { Skeleton } from "@/shared/ui/Skeleton";

export default function ApiKeysLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-8 w-32" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-16 w-full border border-line bg-surface/40" />
        ))}
      </div>
    </div>
  );
}
