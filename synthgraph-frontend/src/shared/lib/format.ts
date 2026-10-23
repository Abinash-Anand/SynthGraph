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

const METRIC_NUMBER = new Intl.NumberFormat(DATE_LOCALE, { maximumSignificantDigits: 4 });
const METRIC_COUNT = new Intl.NumberFormat(DATE_LOCALE);

// The one definition of "how do I show an arbitrary numeric metric value".
// Significant figures rather than fixed decimals: a fixed 3 decimals turned
// reward values of 0.0007 and 0.0021 into "0.001" and "0.002", i.e. threw
// away exactly the digits that distinguish runs. Integers stay exact,
// tiny/huge magnitudes go scientific, and non-finite values are visible
// instead of rendering "NaN".
export function formatMetricValue(value: number): string {
  if (Number.isNaN(value)) return "NaN";
  if (!Number.isFinite(value)) return value > 0 ? "∞" : "-∞";
  if (Number.isInteger(value)) {
    return Math.abs(value) >= 1e15 ? value.toExponential(3) : METRIC_COUNT.format(value);
  }
  const magnitude = Math.abs(value);
  if (magnitude < 1e-4 || magnitude >= 1e9) return value.toExponential(3);
  return METRIC_NUMBER.format(value);
}
