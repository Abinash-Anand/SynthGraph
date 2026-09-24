"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

export type TabItem = { id: string; label: string };

/**
 * URL-driven (?tab=<id>) rather than local state — matches the
 * architecture doc's "URL/shareable state -> URL parameters" rule, and
 * means a tab within Experiment Detail (Runs, Lineage, Metrics, ...) is
 * itself a shareable/bookmarkable link, not just the page as a whole.
 */
export function Tabs({
  tabs,
  paramName = "tab",
  className,
}: {
  tabs: TabItem[];
  paramName?: string;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get(paramName) ?? tabs[0]?.id;
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectTab = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set(paramName, id);
      router.push(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams, paramName],
  );

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + delta + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    tabRefs.current[nextTab.id]?.focus();
    selectTab(nextTab.id);
  };

  return (
    // Scrolls internally on narrow viewports instead of wrapping (a tab
    // strip that wraps to a second line reads as two separate rows of
    // navigation) or forcing the whole page wider.
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn("flex gap-1 overflow-x-auto border-b border-research-border", className)}
    >
      {tabs.map((tab, index) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[tab.id] = el;
            }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => selectTab(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "relative shrink-0 px-3 py-2.5 text-[13.5px] font-medium whitespace-nowrap transition-colors duration-150",
              active ? "text-research-ink" : "text-research-ink-muted hover:text-research-ink-secondary",
            )}
          >
            {tab.label}
            {active ? (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-research-accent" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function useActiveTab(tabs: TabItem[], paramName = "tab"): string {
  const searchParams = useSearchParams();
  return searchParams.get(paramName) ?? tabs[0]?.id;
}
