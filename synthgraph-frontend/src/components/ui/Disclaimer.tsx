import { DEMO_DISCLAIMER } from "@/data/demo-data";
import { cn } from "@/lib/utils";

/**
 * Marks every mocked product surface on the site. Nothing shown in a preview
 * is a customer, a benchmark or a measured result, and it should never be
 * possible to mistake one for the other.
 */
export function Disclaimer({ children, className }: { children?: string; className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 font-mono text-[11px] leading-[1.6] text-ink-faint",
        className,
      )}
    >
      <span aria-hidden className="mt-[3px] size-1 shrink-0 rounded-full bg-ink-faint" />
      {children ?? DEMO_DISCLAIMER}
    </p>
  );
}
