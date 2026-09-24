"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { SearchResult, SearchResultType } from "@/features/search/types/search";

const DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;

async function fetchSearch(query: string): Promise<SearchResult[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
  const body = (await response.json()) as { ok: boolean; results?: SearchResult[]; error?: string };
  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? "Search failed.");
  }
  return body.results ?? [];
}

async function fetchRecent(
  type: Extract<SearchResultType, "generation" | "trainingRun">,
): Promise<SearchResult[]> {
  const response = await fetch(`/api/search/recent?type=${type}`, { cache: "no-store" });
  const body = (await response.json()) as { ok: boolean; results?: SearchResult[]; error?: string };
  if (!response.ok || !body.ok) {
    throw new Error(body.error ?? "Search failed.");
  }
  return body.results ?? [];
}

/**
 * Powers a combobox's "show something before the user has typed enough to
 * search" state - fetched once (short staleTime, not live-polled) and
 * reused for client-side filtering below MIN_QUERY_LENGTH.
 */
export function useRecentEntities(type: Extract<SearchResultType, "generation" | "trainingRun">) {
  const result = useQuery({
    queryKey: ["search-recent", type],
    queryFn: () => fetchRecent(type),
    staleTime: 30_000,
  });

  return {
    recent: result.data ?? [],
    isLoadingRecent: result.isLoading,
  };
}

/**
 * Debounces the raw keystroke value before it ever becomes a query key -
 * without this, every keystroke would fire its own request (and TanStack
 * Query would dedupe nothing, since each partial string is a distinct key).
 */
export function useSearch(query: string) {
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const trimmed = debounced.trim();
  const enabled = trimmed.length >= MIN_QUERY_LENGTH;

  const result = useQuery({
    queryKey: ["search", trimmed],
    queryFn: () => fetchSearch(trimmed),
    enabled,
    staleTime: 30_000,
  });

  return {
    results: enabled ? (result.data ?? []) : [],
    isSearching: enabled && result.isFetching,
  };
}
