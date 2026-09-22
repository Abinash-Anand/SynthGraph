import type {
  ComparedGeneration,
  GenerationDifference,
} from "@/features/comparisons/types/comparison";

export type ComparisonRow = {
  label: string;
  values: string[];
  differs: boolean;
};

// `field: null` rows (ID, Created) are never highlighted — the backend
// deliberately excludes them from its own diff (two distinct records
// trivially always have different ids/creation times, not a useful signal).
const FIXED_ROWS: Array<{
  label: string;
  field: string | null;
  getValue: (generation: ComparedGeneration) => unknown;
}> = [
  { label: "ID", field: null, getValue: (g) => g.id },
  { label: "Status", field: "status", getValue: (g) => g.status },
  {
    label: "Generator",
    field: "generator",
    getValue: (g) => `${g.generator.name}${g.generator.version ? ` @ ${g.generator.version}` : ""}`,
  },
  { label: "Started", field: "startedAt", getValue: (g) => g.startedAt },
  { label: "Completed", field: "completedAt", getValue: (g) => g.completedAt },
  { label: "Created", field: null, getValue: (g) => g.createdAt },
];

/**
 * Fixed rows first, then the union of `parameters.*` keys across all
 * compared generations. `differs` is read from the backend's own
 * `differences` field — computed once, server-side — rather than
 * recomputed client-side (this used to do its own deep-equal check; the
 * backend now does the same comparison consistently for every consumer).
 */
export function buildComparisonRows(
  generations: ComparedGeneration[],
  differences: GenerationDifference[],
): ComparisonRow[] {
  const differingFields = new Set(differences.map((difference) => difference.field));
  const rows: ComparisonRow[] = [];

  for (const { label, field, getValue } of FIXED_ROWS) {
    rows.push({
      label,
      values: generations.map((generation) => formatValue(getValue(generation))),
      differs: field !== null && differingFields.has(field),
    });
  }

  const parameterKeys = Array.from(
    new Set(generations.flatMap((g) => Object.keys(g.parameters))),
  ).sort();
  for (const key of parameterKeys) {
    const field = `parameters.${key}`;
    rows.push({
      label: field,
      values: generations.map((generation) => formatValue(generation.parameters[key])),
      differs: differingFields.has(field),
    });
  }

  return rows;
}

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
