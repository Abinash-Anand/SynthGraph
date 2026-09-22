"use client";

import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";

echarts.use([
  LineChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
]);

/**
 * Minimal hand-rolled React binding over ECharts core (only the line-chart
 * + components this app actually uses are registered, not the full
 * bundle) - avoids adding `echarts-for-react` as a second dependency for
 * what's a small init/resize/dispose lifecycle, matching this codebase's
 * existing preference for a thin wrapper over a heavier library
 * (see CodeBlock.tsx's own hand-rolled highlighter for the same reasoning).
 */
export function EChart({
  option,
  height = 280,
  className,
}: {
  option: echarts.EChartsCoreOption;
  height?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current, "dark", { renderer: "canvas" });
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={containerRef} className={className} style={{ height }} />;
}
