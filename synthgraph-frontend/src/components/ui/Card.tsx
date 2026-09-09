import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
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
        "relative overflow-hidden rounded-lg border border-line bg-surface/70",
        interactive &&
          "transition-[transform,border-color,background-color] duration-300 " +
            "ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 " +
            "hover:border-line-strong hover:bg-surface-2/80",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Numbered card used by the value chain and the how-it-works steps. */
export function StepCard({
  index,
  title,
  children,
  visual,
  status,
}: {
  index: string;
  title: string;
  children: ReactNode;
  visual?: ReactNode;
  status?: ReactNode;
}) {
  return (
    <Card interactive className="group flex flex-col">
      {visual ? (
        <div className="relative h-[132px] overflow-hidden border-b border-line bg-base/60">
          {visual}
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] tracking-[0.18em] text-ink-faint transition-colors duration-300 group-hover:text-cyan">
            {index}
          </span>
          {status}
        </div>
        <h3 className="text-[19px] leading-tight font-medium tracking-[-0.01em] text-ink">
          {title}
        </h3>
        <p className="text-[15px] leading-[1.62] text-ink-muted">{children}</p>
      </div>
    </Card>
  );
}
