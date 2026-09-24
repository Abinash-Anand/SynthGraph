"use client";

import { FloatingPortal } from "@floating-ui/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { SearchResult, SearchResultType } from "@/features/search/types/search";
import { useRecentEntities, useSearch } from "@/features/search/hooks/useSearch";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/shared/lib/format";
import { useFloatingDropdown } from "@/shared/ui/useFloatingDropdown";

const MIN_SELECTION = 2;
const MAX_SELECTION = 10;
const MIN_QUERY_LENGTH = 2;
const NO_PROJECT_GROUP = "__no_project__";

/**
 * Replaces the raw generation-ID/training-run-ID textarea with a live
 * auto-suggest combobox, shared by both generation and training-run
 * comparison entry points. Below MIN_QUERY_LENGTH (including on focus with
 * nothing typed yet) it shows the `/search/recent` list grouped by project,
 * filtered client-side by whatever's been typed so far; at MIN_QUERY_LENGTH+
 * it switches to the real `/search` endpoint (name substring match, top 5
 * per type - it backs the command palette, not a paginated browse view, so
 * this is still "type to find it," not "browse everything," for a longer
 * query the recent list wouldn't cover).
 */
export function EntitySearchPicker({
  entityType,
  targetPath,
  prefillIds,
  prefillNames,
  error: externalError,
  label,
}: {
  entityType: Extract<SearchResultType, "generation" | "trainingRun">;
  targetPath: string;
  prefillIds?: string[];
  /** id -> name for IDs already selected via the URL (a shared link, or a
   * just-completed comparison reloading this form) - lets the selected
   * list show real names instead of raw IDs even before any search runs. */
  prefillNames?: Record<string, string>;
  error?: string;
  label: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Map<string, string>>(
    () => new Map((prefillIds ?? []).map((id) => [id, prefillNames?.[id] ?? id])),
  );
  const { results, isSearching } = useSearch(query);
  const { recent, isLoadingRecent } = useRecentEntities(entityType);
  const trimmedQuery = query.trim();
  const usingRecent = trimmedQuery.length < MIN_QUERY_LENGTH;

  const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingDropdown({
    isOpen,
    onOpenChange: setIsOpen,
  });

  const displayed = useMemo<SearchResult[]>(() => {
    if (usingRecent) {
      if (!trimmedQuery) return recent;
      const needle = trimmedQuery.toLowerCase();
      return recent.filter((item) => item.name.toLowerCase().includes(needle));
    }
    return results.filter((result) => result.type === entityType);
  }, [usingRecent, trimmedQuery, recent, results, entityType]);

  const grouped = useMemo(() => {
    const groups = new Map<string, { projectName: string | null; items: SearchResult[] }>();
    for (const item of displayed) {
      const key = item.projectId ?? NO_PROJECT_GROUP;
      const group = groups.get(key);
      if (group) group.items.push(item);
      else groups.set(key, { projectName: item.projectName, items: [item] });
    }
    return Array.from(groups.values());
  }, [displayed]);

  const toggle = (id: string, name: string) => {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_SELECTION) next.set(id, name);
      return next;
    });
  };

  const onCompare = () => {
    router.push(`${targetPath}?ids=${Array.from(selected.keys()).join(",")}`);
  };

  const isLoading = usingRecent ? isLoadingRecent : isSearching;

  return (
    <div className="flex flex-col gap-4">
      {externalError ? (
        <div role="alert" className="rounded-lg border border-bad/40 bg-bad/[0.05] p-4 text-[14px] text-ink">
          {externalError}
        </div>
      ) : null}

      {selected.size > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="mono-label text-research-ink-muted">
            Selected ({selected.size}/{MAX_SELECTION})
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(selected.entries()).map(([id, name]) => (
              <span
                key={id}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-research-accent bg-research-accent-subtle/10 py-1 pl-3 pr-1.5"
              >
                <span className="min-w-0 truncate text-[13px] text-research-ink">{name}</span>
                <button
                  type="button"
                  onClick={() => toggle(id, name)}
                  aria-label={`Remove ${name}`}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full text-[13px] leading-none text-research-ink-muted transition-colors hover:bg-research-accent/20 hover:text-research-accent-hover"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="text-[13px] text-research-ink-muted" htmlFor={`${entityType}-search`}>
          Search {label} by name
        </label>
        <input
          id={`${entityType}-search`}
          ref={refs.setReference}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Start typing, or click to browse recent…"
          autoComplete="off"
          className="w-full rounded-md border border-research-border bg-research-bg px-3.5 py-2.5 text-[14.5px] text-research-ink placeholder:text-research-ink-muted focus:border-research-accent-subtle focus:outline-none"
          {...getReferenceProps({ onFocus: () => setIsOpen(true) })}
        />

        {/* Portaled via Floating UI, not a `position: absolute` child of
            this form cell - an absolute menu here could only ever render
            where this DOM node happens to sit, which is exactly what let
            it visually cover (and intercept clicks meant for) the Compare
            button directly below. A floating, viewport-positioned menu
            can't collide with page layout the same way. */}
        {isOpen ? (
          <FloatingPortal>
            <div
              // refs.setFloating is Floating UI's documented callback ref
              // setter, not a `.current` read - nothing to memoize here.
              // eslint-disable-next-line react-hooks/refs
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-50 overflow-y-auto rounded-lg border border-research-border bg-research-panel p-1.5 shadow-lg"
              {...getFloatingProps()}
            >
              {usingRecent && !trimmedQuery ? (
                <p className="mono-label px-2.5 pb-1.5 pt-1 text-research-ink-muted">Recent</p>
              ) : null}

              {isLoading ? (
                <p className="px-2.5 py-3 text-[13px] text-research-ink-muted">Searching…</p>
              ) : grouped.length === 0 ? (
                <p className="px-2.5 py-3 text-[13px] text-research-ink-muted">
                  {trimmedQuery
                    ? `No ${label} match "${trimmedQuery}".`
                    : `No ${label} yet — create one to see it here.`}
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {grouped.map((group, index) => (
                    <div key={group.projectName ?? `group-${index}`} className="flex flex-col gap-0.5">
                      <p className="mono-label px-2.5 pb-0.5 text-research-ink-muted">
                        {group.projectName ?? "No project"}
                      </p>
                      {group.items.map((result) => {
                        const checked = selected.has(result.id);
                        return (
                          <label
                            key={result.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 transition-colors",
                              checked ? "bg-research-accent-subtle/10" : "hover:bg-research-elevated",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(result.id, result.name)}
                              className="accent-[var(--color-research-accent)]"
                            />
                            <span className="min-w-0 flex-1 truncate text-[13.5px] text-research-ink">
                              {result.name}
                            </span>
                            <span className="shrink-0 font-mono text-[11px] text-research-ink-muted">
                              {formatDateTime(result.createdAt)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FloatingPortal>
        ) : null}
      </div>

      <Button
        type="button"
        size="lg"
        className="self-start"
        disabled={selected.size < MIN_SELECTION}
        onClick={onCompare}
      >
        Compare ({selected.size})
      </Button>
    </div>
  );
}
