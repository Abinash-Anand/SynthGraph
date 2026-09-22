import { Skeleton } from "@/shared/ui/Skeleton";

export default function EfficiencyLeaderboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-16 w-96" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-16 border border-line bg-surface/40" />
        ))}
      </div>
    </div>
  );
}
