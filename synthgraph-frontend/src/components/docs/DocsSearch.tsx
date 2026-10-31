"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { searchDocs, type SearchEntry } from "@/content/docs/search";

// Kept for the life of the page, so reopening search does not fetch again.
let cachedIndex: SearchEntry[] | null = null;

/**
 * The search dialog. It is mounted only while open, so the query starts empty
 * every time and the index (a static JSON file) is fetched the first time
 * someone actually searches.
 */
export function DocsSearch({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchEntry[] | "loading" | "failed">(cachedIndex ?? "loading");

  useEffect(() => {
    if (cachedIndex) return;
    let cancelled = false;
    fetch("/docs/search-index.json")
      .then((response) => (response.ok ? (response.json() as Promise<SearchEntry[]>) : Promise.reject()))
      .then((entries) => {
        cachedIndex = entries;
        if (!cancelled) setIndex(entries);
      })
      .catch(() => {
        if (!cancelled) setIndex("failed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hits = useMemo(() => (Array.isArray(index) ? searchDocs(index, query) : []), [index, query]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  const message =
    index === "loading"
      ? "Loading the search index…"
      : index === "failed"
        ? "Search could not be loaded. Use the navigation on the left instead."
        : query.trim() === ""
          ? "Type to search every page. Every word you type has to appear."
          : hits.length === 0
            ? "Nothing in the docs contains all of those words."
            : null;

  return (
    <Command.Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      label="Search the documentation"
      shouldFilter={false}
      className="fixed inset-0 z-[60] flex items-start justify-center bg-void/70 px-4 pt-[12vh]"
    >
      <div className="w-full max-w-[600px] overflow-hidden rounded-xl border border-line-strong bg-surface-2 shadow-2xl">
        <Command.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Search the documentation..."
          className="w-full border-b border-line bg-transparent px-4 py-3.5 text-[14px] text-ink placeholder:text-ink-dim focus:outline-none"
        />
        <Command.List className="max-h-[380px] overflow-y-auto p-2">
          {message ? <div className="px-3 py-6 text-center text-[13px] text-ink-dim">{message}</div> : null}
          {hits.map((hit) => (
            <Command.Item
              key={hit.href}
              value={hit.href}
              onSelect={() => go(hit.href)}
              className="flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 text-ink-muted data-[selected=true]:bg-surface-3 data-[selected=true]:text-ink"
            >
              <span className="flex items-baseline gap-2 text-[13.5px]">
                <span className="truncate text-ink">{hit.heading ?? hit.title}</span>
                <span className="ml-auto shrink-0 text-[11.5px] text-ink-dim">
                  {hit.heading ? `${hit.section} · ${hit.title}` : hit.section}
                </span>
              </span>
              {hit.snippet ? <span className="truncate text-[12px] text-ink-dim">{hit.snippet}</span> : null}
            </Command.Item>
          ))}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
