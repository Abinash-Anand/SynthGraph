"use client";

import { Children, useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One panel of a <Tabs>. It renders its children; Tabs picks which one shows. */
export function Tab({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/**
 * <Tabs items={["pip", "GitHub"]}><Tab>...</Tab><Tab>...</Tab></Tabs>
 * Items and panels pair by position.
 */
export function Tabs({ items, children }: { items: string[]; children: ReactNode }) {
  const [active, setActive] = useState(0);
  const id = useId();
  const panels = Children.toArray(children);

  return (
    <div className="rounded-lg border border-line bg-surface/40">
      <div role="tablist" aria-label="Options" className="flex gap-1 border-b border-line px-2 pt-2">
        {items.map((item, index) => (
          <button
            key={item}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={active === index}
            aria-controls={`${id}-panel-${index}`}
            onClick={() => setActive(index)}
            className={cn(
              "rounded-t-md px-3 py-2 font-mono text-[12px] transition-colors",
              active === index ? "bg-surface-2 text-ink" : "text-ink-dim hover:text-ink-muted",
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel-${active}`}
        aria-labelledby={`${id}-tab-${active}`}
        className="p-3 [&>*+*]:mt-3"
      >
        {panels[active]}
      </div>
    </div>
  );
}
