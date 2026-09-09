import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "cyan" | "ok" | "warn" | "bad" | "planned";

const tones: Record<Tone, string> = {
  neutral: "border-line-strong text-ink-muted",
  cyan: "border-cyan/35 text-cyan bg-cyan/5",
  ok: "border-ok/35 text-ok bg-ok/5",
  warn: "border-warn/35 text-warn bg-warn/5",
  bad: "border-bad/35 text-bad bg-bad/5",
  planned: "border-line-strong text-ink-dim bg-surface-2/60",
};

export function Badge({
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
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

/**
 * Status labels used across the site. Every capability claim is tagged with
 * one of these so a visitor can tell shipped from planned at a glance.
 */
export function StatusBadge({ status }: { status: "available" | "private-pilot" | "planned" | "roadmap" }) {
  const map = {
    available: { tone: "ok" as const, label: "Available" },
    "private-pilot": { tone: "cyan" as const, label: "Private pilot" },
    planned: { tone: "planned" as const, label: "Planned" },
    roadmap: { tone: "planned" as const, label: "Roadmap" },
  };
  const { tone, label } = map[status];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}
