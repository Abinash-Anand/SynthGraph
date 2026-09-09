"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  /** Stagger position, in seconds. Keep small — this is punctuation. */
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section";
};

/**
 * The site's one entrance animation. Everything that fades in uses this, so
 * timing stays consistent and reduced-motion is handled in a single place.
 */
export function Reveal({ children, delay = 0, y = 18, className, as = "div" }: RevealProps) {
  const reducedMotion = useReducedMotion();
  const Component = motion[as];
  // min-w-0 so a Reveal used as a grid or flex item can shrink below the
  // intrinsic width of wide children (code blocks, tables, canvases).
  const classes = cn("min-w-0", className);

  if (reducedMotion) {
    const Static = as;
    return <Static className={classes}>{children}</Static>;
  }

  return (
    <Component
      className={classes}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}
