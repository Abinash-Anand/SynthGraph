"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { SearchResultType } from "@/features/search/types/search";
import { useSearch } from "@/features/search/hooks/useSearch";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/shared/lib/format";

const MIN_SELECTION = 2;
const MAX_SELECTION = 10;
const MIN_QUERY_LENGTH = 2;

/**
 * Replaces the raw generation-ID/training-run-ID textarea with a live
 * search-and-check picker, backed by the existing global `/search`
 * endpoint (name substring match, top 5 per type - it backs the command
 * palette, not a paginated browse view, so this is "type to find it," not
 * "browse everything," which is the honest limit of reusing that endpoint
 * rather than building a dedicated one for this single form).
 */
export function EntitySearchPicker({
  entityType,
  targetPath,
  prefillIds,
  prefillNames,
  error: externalError,
  label,
}: {
  entityType: SearchResultType;
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
  const [selected, setSelected] = useState<Map<string, string>>(
    () => new Map((prefillIds ?? []).map((id) => [id, prefillNames?.[id] ?? id])),
  );
  const { results, isSearching } = useSearch(query);
  const matches = results.filter((result) => result.type === entityType);
  const trimmedQuery = query.trim();

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
          {Array.from(selected.entries()).map(([id, name]) => (
            <div
              key={id}
              className="flex items-center justify-between gap-3 rounded-lg border border-research-accent bg-research-accent-subtle/10 px-4 py-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-research-ink">{name}</span>
              <button
                type="button"
                onClick={() => toggle(id, name)}
                className="shrink-0 font-mono text-[11px] tracking-[0.06em] text-research-ink-muted uppercase transition-colors hover:text-research-accent-hover"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label className="text-[13px] text-research-ink-muted" htmlFor={`${entityType}-search`}>
          Search {label} by name
        </label>
        <input
          id={`${entityType}-search`}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type at least 2 characters..."
          className="w-full rounded-md border border-research-border bg-research-bg px-3.5 py-2.5 text-[14.5px] text-research-ink placeholder:text-research-ink-muted focus:border-research-accent-subtle focus:outline-none"
        />
      </div>

      {trimmedQuery.length >= MIN_QUERY_LENGTH ? (
        <div className="flex flex-col gap-1.5">
          {isSearching ? (
            <p className="text-[13px] text-research-ink-muted">Searching…</p>
          ) : matches.length === 0 ? (
            <p className="text-[13px] text-research-ink-muted">
              No {label} match &ldquo;{trimmedQuery}&rdquo;.
            </p>
          ) : (
            matches.map((result) => {
              const checked = selected.has(result.id);
              return (
                <label
                  key={result.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                    checked
                      ? "border-research-accent bg-research-accent-subtle/10"
                      : "border-research-border bg-research-panel hover:border-research-accent-subtle",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(result.id, result.name)}
                    className="accent-[var(--color-research-accent)]"
                  />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-research-ink">{result.name}</span>
                  <span className="shrink-0 font-mono text-[11px] text-research-ink-muted">
                    {formatDateTime(result.createdAt)}
                  </span>
                </label>
              );
            })
          )}
        </div>
      ) : null}

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
