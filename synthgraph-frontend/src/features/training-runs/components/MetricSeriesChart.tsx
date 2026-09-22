const WIDTH = 640;
const HEIGHT = 160;
const PAD_X = 8;
const PAD_Y = 12;

export function MetricSeriesChart({
  label,
  points,
  color,
}: {
  label: string;
  points: Array<{ step: number; value: number }>;
  color: string;
}) {
  const sorted = [...points].sort((a, b) => a.step - b.step);
  const steps = sorted.map((p) => p.step);
  const values = sorted.map((p) => p.value);

  const minStep = Math.min(...steps);
  const maxStep = Math.max(...steps);
  const rawMinValue = Math.min(...values);
  const rawMaxValue = Math.max(...values);
  // ~5% padding so a flat or near-flat series doesn't collapse to a line
  // pinned at an edge; each series gets its own scale, never a shared one.
  const valueRange = rawMaxValue - rawMinValue || Math.abs(rawMaxValue) || 1;
  const minValue = rawMinValue - valueRange * 0.05;
  const maxValue = rawMaxValue + valueRange * 0.05;

  const x = (step: number) =>
    maxStep === minStep
      ? WIDTH / 2
      : PAD_X + ((step - minStep) / (maxStep - minStep)) * (WIDTH - PAD_X * 2);
  const y = (value: number) =>
    maxValue === minValue
      ? HEIGHT / 2
      : HEIGHT - PAD_Y - ((value - minValue) / (maxValue - minValue)) * (HEIGHT - PAD_Y * 2);

  const linePoints = sorted.map((p) => `${x(p.step)},${y(p.value)}`).join(" ");

  return (
    <div className="rounded-lg border border-line bg-surface/40 p-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="font-mono text-[12px] text-ink">{label}</p>
        <p className="font-mono text-[11px] text-ink-faint">
          min {formatValue(rawMinValue)} · max {formatValue(rawMaxValue)}
        </p>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`${label} over steps`}>
        <polyline points={linePoints} fill="none" stroke={color} strokeWidth={1.5} />
        {sorted.map((p) => (
          <circle key={p.step} cx={x(p.step)} cy={y(p.value)} r={2.5} fill={color}>
            <title>
              step {p.step}: {p.value}
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10.5px] text-ink-faint">
        <span>step {minStep}</span>
        <span>step {maxStep}</span>
      </div>
    </div>
  );
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(4);
}
