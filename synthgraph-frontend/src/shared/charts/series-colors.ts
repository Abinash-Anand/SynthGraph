// Shared by MetricsLineChart (series color) and MetricsLegend (badge dot
// color) - both index into this by the same series position, so extracted
// once rather than duplicated to guarantee they never drift out of sync.
export const SERIES_COLORS = [
  "#37c9de", // cyan
  "#8b5cf6", // research accent
  "#46b97e", // ok
  "#d9a441", // warn
  "#5b8dfb", // blue
  "#d9584c", // bad
];
