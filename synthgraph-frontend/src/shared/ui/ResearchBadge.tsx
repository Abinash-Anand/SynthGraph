import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "success" | "warning" | "error";

const TONES: Record<Tone, string> = {
  neutral: "border-research-border text-research-ink-muted",
  info: "border-research-info/35 text-research-info bg-research-info/5",
  success: "border-research-success/35 text-research-success bg-research-success/5",
  warning: "border-research-warning/35 text-research-warning bg-research-warning/5",
  error: "border-research-error/35 text-research-error bg-research-error/5",
};

/** Dashboard-only counterpart to components/ui/Badge.tsx - see ResearchCard.tsx's comment. */
export function ResearchBadge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1",
        "font-mono text-[10px] tracking-[0.14em] uppercase leading-none",
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}
