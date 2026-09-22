export default function DatasetsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-7 w-32 animate-pulse rounded bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg border border-line bg-surface/40" />
        ))}
      </div>
    </div>
  );
}
