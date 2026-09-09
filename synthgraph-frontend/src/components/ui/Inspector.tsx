"use client";

import { AnimatePresence, motion } from "motion/react";
import type { LineageNode } from "@/data/demo-data";
import { NODE_COLOR } from "@/data/demo-data";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * The metadata panel that accompanies every interactive graph.
 *
 * It lives in the DOM rather than the canvas: the text stays selectable,
 * legible at any pixel ratio, and available to a screen reader.
 */
export function Inspector({
  node,
  className,
  hint = "Hover a record to inspect its provenance.",
}: {
  node: LineageNode | null;
  className?: string;
  hint?: string;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "w-full max-w-[300px] rounded-lg border border-line bg-surface/80 backdrop-blur-md",
        className,
      )}
      aria-live="polite"
    >
      <AnimatePresence mode="wait" initial={false}>
        {node ? (
          <motion.div
            key={node.id}
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="p-4"
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: NODE_COLOR[node.kind] }}
              />
              <p className="font-mono text-[10px] tracking-[0.16em] text-ink-muted uppercase">
                {node.inspector.heading}
              </p>
            </div>
            <p className="mt-1 font-mono text-[13px] text-ink">{node.inspector.ref}</p>

            <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
              {node.inspector.fields.map((field) => (
                <div key={field.label} className="flex items-baseline justify-between gap-4">
                  <dt className="font-mono text-[11px] text-ink-dim">{field.label}</dt>
                  <dd className="font-mono text-[11.5px] text-ink">{field.value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        ) : (
          <motion.p
            key="hint"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="p-4 font-mono text-[11.5px] leading-[1.7] text-ink-dim"
          >
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
