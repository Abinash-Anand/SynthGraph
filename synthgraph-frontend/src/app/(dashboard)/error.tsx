"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-bad/35 bg-bad/5 p-6">
      <p className="mono-label text-bad">Error</p>
      <p className="text-[15px] text-ink">Something went wrong loading this page.</p>
      <Button onClick={reset} size="sm" variant="secondary">
        Try again
      </Button>
    </div>
  );
}
