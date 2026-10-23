// Shared by MetricsLineChart (series color) and MetricsLegend (badge dot
// color) - both index into this by the same series position, so extracted
// once rather than duplicated to guarantee they never drift out of sync.
// Twelve distinct hues: with only six, the seventh series reused the first
// series' color and the legend could no longer say which line was which.
export const SERIES_COLORS = [
  "#37c9de", // cyan
  "#8b5cf6", // research accent
  "#46b97e", // ok
  "#d9a441", // warn
  "#5b8dfb", // blue
  "#d9584c", // bad
  "#e879a9", // pink
  "#a3d44f", // lime
  "#f08a4b", // orange
  "#2dd4bf", // teal
  "#c084fc", // violet
  "#94a3b8", // slate
];
