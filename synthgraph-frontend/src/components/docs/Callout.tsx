import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TYPES = {
  note: { label: "Note", box: "border-cyan/30 bg-cyan/5", title: "text-cyan" },
  tip: { label: "Tip", box: "border-ok/30 bg-ok/5", title: "text-ok" },
  warning: { label: "Warning", box: "border-warn/35 bg-warn/5", title: "text-warn" },
} as const;

/** A highlighted aside in a docs page: <Callout type="warning" title="...">...</Callout>. */
export function Callout({
  type = "note",
  title,
  children,
}: {
  type?: keyof typeof TYPES;
  title?: string;
  children: ReactNode;
}) {
  const style = TYPES[type];
  return (
    <aside className={cn("rounded-lg border px-4 py-3.5 text-[14.5px] leading-[1.65]", style.box)} role="note">
      <p className={cn("mono-label mb-1.5", style.title)}>{title ?? style.label}</p>
      <div className="[&>*+*]:mt-2 [&_p]:text-ink-muted">{children}</div>
    </aside>
  );
}
