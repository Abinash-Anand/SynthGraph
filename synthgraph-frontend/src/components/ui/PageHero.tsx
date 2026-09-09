import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";

/** The shared header for every non-home page. */
export function PageHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden pt-[calc(var(--nav-h)+72px)] pb-16 md:pb-20">
      <div className="grid-field pointer-events-none absolute inset-x-0 top-0 h-[520px]" aria-hidden />
      <div className="shell relative">
        <Badge tone="neutral">{eyebrow}</Badge>
        <h1 className="mt-7 max-w-[18ch] text-[38px] leading-[1.03] font-medium tracking-[-0.03em] text-gradient-ink md:text-[58px]">
          {title}
        </h1>
        <p className="mt-6 max-w-[66ch] text-[17px] leading-[1.65] text-ink-muted md:text-[19px]">
          {lede}
        </p>
        {children ? <div className="mt-9">{children}</div> : null}
      </div>
    </header>
  );
}
