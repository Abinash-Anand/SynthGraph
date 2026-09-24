"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { cn } from "@/lib/utils";

// A raw multi-line string (e.g. a domain-randomization function's Python
// source, stored as a plain string parameter value) rendered as a quoted
// JSON leaf becomes an unreadable wall of escaped text - actual newlines
// get collapsed by normal CSS white-space handling into one long run.
// Anything this long with embedded line breaks is source/log text, not a
// short label, so it gets a syntax-highlighted, collapsed-by-default block
// instead of being crammed inline.
const CODE_LIKE_MIN_LENGTH = 100;

/** Exported so ConfigSummary can exclude these from its flattened "primary
 * badges" the same way this file excludes them from a plain quoted leaf -
 * a badge grid cell is exactly the wrong place for a Python function body. */
export function isCodeLikeString(value: string): boolean {
  return value.length >= CODE_LIKE_MIN_LENGTH && value.includes("\n");
}

function guessLanguage(value: string): "python" | "json" | "bash" | "text" {
  if (/^\s*(def |import |from |class )/m.test(value)) return "python";
  if (/^\s*[{[]/.test(value.trim())) return "json";
  if (/^\s*#!/.test(value)) return "bash";
  return "text";
}

/**
 * Recursive collapsible JSON viewer for the "raw" view behind KeyValueList's
 * disclosure toggle. Plain <pre>-rendered JSON (the previous behavior, still
 * used elsewhere via CodeBlock) is fine for small objects, but a large,
 * deeply-nested one (e.g. a domain-randomization config with many keys) has
 * no way to collapse a branch you're not looking at - this gives every
 * object/array node its own expand/collapse toggle, defaulting open only for
 * the first two levels so a big tree starts manageable.
 */
export function JsonTree({ value, className }: { value: unknown; className?: string }) {
  return (
    <div className={cn("font-mono text-[12.5px] leading-[1.7]", className)}>
      <JsonNode value={value} depth={0} />
    </div>
  );
}

function JsonNode({ value, depth }: { value: unknown; depth: number }) {
  if (value === null) return <span className="text-research-info">null</span>;
  if (typeof value === "boolean") return <span className="text-research-info">{String(value)}</span>;
  if (typeof value === "number") return <span className="text-research-warning">{value}</span>;
  if (typeof value === "string") {
    if (isCodeLikeString(value)) return <CodeStringNode value={value} />;
    return <span className="text-research-success">&quot;{value}&quot;</span>;
  }

  if (Array.isArray(value)) {
    return <JsonContainer entries={value.map((v, i) => [String(i), v] as const)} bracket={["[", "]"]} depth={depth} />;
  }
  if (typeof value === "object") {
    return (
      <JsonContainer
        entries={Object.entries(value as Record<string, unknown>)}
        bracket={["{", "}"]}
        depth={depth}
      />
    );
  }
  return <span>{String(value)}</span>;
}

function JsonContainer({
  entries,
  bracket,
  depth,
}: {
  entries: readonly (readonly [string, unknown])[];
  bracket: [string, string];
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const [openBracket, closeBracket] = bracket;

  if (entries.length === 0) {
    return (
      <span className="text-research-ink-muted">
        {openBracket}
        {closeBracket}
      </span>
    );
  }

  return (
    <span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded text-research-ink-muted hover:text-research-accent-hover"
        aria-expanded={open}
        aria-label={open ? "Collapse" : "Expand"}
      >
        <span className="inline-block w-3 select-none">{open ? "▾" : "▸"}</span>
        {openBracket}
        {!open ? <span className="text-research-ink-muted"> … {closeBracket}</span> : null}
      </button>
      {open ? (
        <>
          <div className="ml-4 border-l border-research-border pl-3">
            {entries.map(([key, entryValue], index) => (
              <div key={key} className="min-w-0 break-all">
                <span className="text-research-ink-secondary">{key}</span>
                <span className="text-research-ink-muted">: </span>
                <JsonNode value={entryValue} depth={depth + 1} />
                {index < entries.length - 1 ? <span className="text-research-ink-muted">,</span> : null}
              </div>
            ))}
          </div>
          <span>{closeBracket}</span>
        </>
      ) : null}
    </span>
  );
}

function CodeStringNode({ value }: { value: string }) {
  const [open, setOpen] = useState(false);
  const lineCount = value.split("\n").length;

  return (
    <span className="block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded text-research-ink-muted hover:text-research-accent-hover"
        aria-expanded={open}
      >
        <span className="inline-block w-3 select-none">{open ? "▾" : "▸"}</span>
        {open ? "Hide source" : `View source (${lineCount} lines)`}
      </button>
      {open ? (
        <div className="mt-1.5">
          <CodeBlock code={value} language={guessLanguage(value)} maxHeight="150px" />
        </div>
      ) : null}
    </span>
  );
}
