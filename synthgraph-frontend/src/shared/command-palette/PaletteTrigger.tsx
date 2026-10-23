"use client";

import { OPEN_PALETTE_EVENT } from "./palette-events";

export function PaletteTrigger() {
  return (
    <button
      type="button"
      data-tour="palette"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      aria-label="Search and commands"
      className="inline-flex h-8 items-center gap-2 rounded-md border border-research-border px-2.5 text-[12.5px] text-research-ink-muted transition-colors hover:border-research-accent-subtle hover:text-research-ink"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden rounded border border-research-border px-1 font-mono text-[10.5px] sm:inline">Ctrl K</kbd>
    </button>
  );
}
