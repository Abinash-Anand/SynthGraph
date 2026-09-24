"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

/**
 * Dashboard-only counterpart to components/ui/Card.tsx - that component
 * is shared with the public marketing site (still on the old token
 * palette), so restyling it in place would change the marketing site's
 * look too. Same API, research-* tokens instead.
 */
export function ResearchCard({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={interactive && !reducedMotion ? { y: -2 } : undefined}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-research-border bg-research-panel",
        interactive &&
          "transition-colors duration-200 hover:border-research-accent-subtle hover:bg-research-subtle/60",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
