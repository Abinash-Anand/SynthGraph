// Pinned locale + timeZone (not `undefined`/runtime-default): these render
// inside client components now (the Phase 4 workspace), so the same string
// must come out during SSR and during browser hydration - a runtime
// default can differ between the server's and the browser's locale/
// timezone and produces a React hydration mismatch (#418) otherwise.
const DATE_LOCALE = "en-US";
const DATE_TIME_ZONE = "UTC";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: DATE_TIME_ZONE,
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(DATE_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DATE_TIME_ZONE,
  });
}

// The single frontend definition of "what does '1.5h' mean" - was
// previously reimplemented separately in RunsTab.tsx and
// EfficiencyLeaderboardView.tsx with subtly different rounding.
export function formatDurationSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}
