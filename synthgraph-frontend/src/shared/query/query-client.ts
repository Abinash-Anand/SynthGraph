import { QueryClient } from "@tanstack/react-query";

// Existing Server-Component reads (cache: "no-store" via backendFetch) stay
// as they are - this client is for new client-side interactive/polling
// surfaces only (inspector-rail selection, live training-run polling), not
// a replacement for the working SSR-first pattern. Conservative defaults:
// no refetch-on-focus thrash, a short staleTime so manual polling intervals
// (set per-query, e.g. for live runs) are the source of truth for freshness
// rather than every window focus re-triggering a fetch.
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
