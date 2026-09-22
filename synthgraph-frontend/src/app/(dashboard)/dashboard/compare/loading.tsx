import { Skeleton } from "@/shared/ui/Skeleton";

export default function CompareLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-56" />
      <div className="max-w-[640px]">
        <Skeleton className="h-32 w-full border border-line bg-surface/40" />
      </div>
      <Skeleton className="h-40 w-full border border-line bg-surface/40" />
    </div>
  );
}
