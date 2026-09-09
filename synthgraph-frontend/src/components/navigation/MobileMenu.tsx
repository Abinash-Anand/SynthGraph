"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";
import { NAV_LINKS } from "@/data/site";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  pathname: string;
};

export function MobileMenu({ open, onClose, pathname }: MobileMenuProps) {
  const reducedMotion = useReducedMotion();

  // Lock the page behind the overlay and restore focus semantics on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const duration = reducedMotion ? 0 : 0.42;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          id="mobile-menu"
          key="mobile-menu"
          className="fixed inset-0 z-40 bg-void/95 backdrop-blur-xl lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration * 0.6 }}
        >
          <div className="grid-field pointer-events-none absolute inset-0" aria-hidden />
          <nav
            aria-label="Site"
            className="relative flex h-full flex-col justify-between px-6 pt-[calc(var(--nav-h)+32px)] pb-10"
          >
            <ul className="flex flex-col">
              {NAV_LINKS.map((link, index) => (
                <motion.li
                  key={link.href}
                  initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration, delay: reducedMotion ? 0 : 0.05 + index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className="border-b border-line"
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-baseline justify-between py-5 text-[26px] tracking-[-0.02em] transition-colors",
                      pathname === link.href ? "text-cyan" : "text-ink hover:text-cyan",
                    )}
                  >
                    {link.label}
                    <span className="font-mono text-[11px] text-ink-faint">
                      0{index + 1}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration, delay: reducedMotion ? 0 : 0.35 }}
              className="flex flex-col gap-4"
            >
              <Link
                href="/demo"
                onClick={onClose}
                className="flex h-12 items-center justify-center rounded-md bg-ink text-[15px] font-medium text-void"
              >
                Request a Demo
              </Link>
              <p className="text-center font-mono text-[10px] tracking-[0.14em] text-ink-faint uppercase">
                Private research pilot
              </p>
            </motion.div>
          </nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
