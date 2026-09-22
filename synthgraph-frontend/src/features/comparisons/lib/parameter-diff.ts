import type { ComparedGeneration } from "@/features/comparisons/types/comparison";

export type ComparisonRow = {
  label: string;
  values: string[];
  /** True when not all generations' values are deep-equal — the backend
   * does no diffing itself, this is computed client-side. */
  differs: boolean;
};

/** Fixed rows first, then the union of `parameters.*` keys across all
 * compared generations (missing key on one → "—"). */
export function buildComparisonRows(generations: ComparedGeneration[]): ComparisonRow[] {
  const rows: ComparisonRow[] = [];

  const addRow = (label: string, getValue: (generation: ComparedGeneration) => unknown) => {
    const raw = generations.map(getValue);
    const baseline = JSON.stringify(raw[0]);
    rows.push({
      label,
      values: raw.map(formatValue),
      differs: raw.some((value) => JSON.stringify(value) !== baseline),
    });
  };

  addRow("ID", (g) => g.id);
  addRow("Status", (g) => g.status);
  addRow("Generator", (g) => `${g.generator.name}${g.generator.version ? ` @ ${g.generator.version}` : ""}`);
  addRow("Started", (g) => g.startedAt);
  addRow("Completed", (g) => g.completedAt);
  addRow("Created", (g) => g.createdAt);

  const parameterKeys = Array.from(
    new Set(generations.flatMap((g) => Object.keys(g.parameters))),
  ).sort();
  for (const key of parameterKeys) {
    addRow(`parameters.${key}`, (g) => g.parameters[key]);
  }

  return rows;
}

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
