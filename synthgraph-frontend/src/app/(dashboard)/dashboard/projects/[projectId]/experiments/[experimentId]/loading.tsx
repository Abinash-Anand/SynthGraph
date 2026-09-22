export default function ExperimentDetailLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-16 w-64 animate-pulse rounded bg-surface-2" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-16 animate-pulse rounded-lg border border-line bg-surface/40" />
        ))}
      </div>
    </div>
  );
}
