// Logic behind the comparison matrix, kept free of React so the parts that
// are easy to get subtly wrong (line diffs, grouping, deltas) are tested.

export type MatrixRow = {
  label: string;
  /** Display strings, one per compared record. */
  values: string[];
  /** The raw values behind `values`, for expansion and diffing. */
  raw?: unknown[];
  differs: boolean;
};

export type RowGroup = { name: "Details" | "Parameters" | "Metrics"; rows: MatrixRow[]; differing: number };

export function groupOf(label: string): RowGroup["name"] {
  if (label.startsWith("parameters.")) return "Parameters";
  if (label.startsWith("metrics.")) return "Metrics";
  return "Details";
}

const GROUP_ORDER: RowGroup["name"][] = ["Details", "Parameters", "Metrics"];

export function groupRows(rows: MatrixRow[]): RowGroup[] {
  const groups = new Map<RowGroup["name"], MatrixRow[]>();
  for (const row of rows) {
    const name = groupOf(row.label);
    groups.set(name, [...(groups.get(name) ?? []), row]);
  }
  return GROUP_ORDER.filter((name) => groups.has(name)).map((name) => {
    const list = groups.get(name)!;
    return { name, rows: list, differing: list.filter((row) => row.differs).length };
  });
}

export type Delta = { absolute: number; percent: number | null };

/** How far a numeric value is from the baseline, or null if either isn't a plain number. */
export function numericDelta(baseline: unknown, value: unknown): Delta | null {
  if (typeof baseline !== "number" || typeof value !== "number") return null;
  if (!Number.isFinite(baseline) || !Number.isFinite(value) || baseline === value) return null;
  return {
    absolute: value - baseline,
    percent: baseline === 0 ? null : ((value - baseline) / Math.abs(baseline)) * 100,
  };
}

/**
 * When the records come from different generators/trainers, nearly every
 * parameter differs simply because they mean different things. Say so rather
 * than let the matrix imply fifteen independent changes.
 */
export function familyWarning(rows: MatrixRow[]): string | null {
  const row = rows.find((r) => r.label === "Generator" || r.label === "Trainer");
  if (!row) return null;
  const names = Array.from(new Set(row.values.map((value) => value.split("@")[0].trim()).filter((v) => v && v !== "—")));
  if (names.length < 2) return null;
  const noun = row.label === "Trainer" ? "trainers" : "generators";
  return `These come from different ${noun} (${names.join(", ")}), so most parameters aren't directly comparable.`;
}

/** Display lines for a value, with multi-line strings (source code) kept as real lines. */
export function displayLines(value: unknown, indent = 0): string[] {
  const pad = "  ".repeat(indent);
  if (value === undefined) return [`${pad}—`];
  if (value === null) return [`${pad}null`];
  if (typeof value === "string") return value.split("\n").map((line) => `${pad}${line}`);
  if (typeof value !== "object") return [`${pad}${String(value)}`];

  if (Array.isArray(value)) {
    if (value.length === 0) return [`${pad}[]`];
    return value.flatMap((item) => {
      const inner = displayLines(item, indent + 1);
      return [`${pad}-`, ...inner];
    });
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return [`${pad}{}`];
  return entries.flatMap(([key, item]) => {
    if (item !== null && typeof item === "object") return [`${pad}${key}:`, ...displayLines(item, indent + 1)];
    if (typeof item === "string" && item.includes("\n")) {
      return [`${pad}${key}: |`, ...item.split("\n").map((line) => `${pad}  ${line}`)];
    }
    return [`${pad}${key}: ${item === null ? "null" : String(item)}`];
  });
}

export type DiffOp = { kind: "same" | "add" | "remove"; text: string };

/** Line diff via longest common subsequence - small inputs, so the O(n*m) table is fine. */
export function diffLines(before: string[], after: string[]): DiffOp[] {
  const n = before.length;
  const m = after.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = before[i] === after[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      ops.push({ kind: "same", text: before[i] });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push({ kind: "remove", text: before[i++] });
    } else {
      ops.push({ kind: "add", text: after[j++] });
    }
  }
  while (i < n) ops.push({ kind: "remove", text: before[i++] });
  while (j < m) ops.push({ kind: "add", text: after[j++] });
  return ops;
}

export function diffStats(ops: DiffOp[]): { added: number; removed: number } {
  return {
    added: ops.filter((op) => op.kind === "add").length,
    removed: ops.filter((op) => op.kind === "remove").length,
  };
}

/** Whether a raw value is big or structured enough that a one-line cell can't show it. */
export function isExpandable(value: unknown, display: string): boolean {
  if (value !== null && typeof value === "object") return true;
  return typeof value === "string" && (value.includes("\n") || display.length > 40);
}
