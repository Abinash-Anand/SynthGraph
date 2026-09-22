import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Dashboard-only counterpart to components/ui/Card.tsx - that component
 * is shared with the public marketing site (still on the old token
 * palette), so restyling it in place would change the marketing site's
 * look too. Same API, research-* tokens instead.
 */
export function ResearchCard({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-research-border bg-research-panel",
        interactive &&
          "transition-colors duration-200 hover:border-research-accent-subtle hover:bg-research-subtle/60",
        className,
      )}
    >
      {children}
    </div>
  );
}
