"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function GlobalError({
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
    <div className="shell pt-[calc(var(--nav-h)+120px)] pb-32">
      <p className="mono-label">Error</p>
      <h1 className="mt-6 max-w-[20ch] text-[34px] leading-[1.08] font-medium tracking-[-0.03em] text-ink md:text-[46px]">
        Something went wrong rendering this page.
      </h1>
      <p className="mt-6 max-w-[56ch] text-[16.5px] leading-[1.65] text-ink-muted">
        The content is still there. Reloading this section usually resolves it.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Back to the homepage
        </ButtonLink>
      </div>
    </div>
  );
}
