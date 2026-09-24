"use client";

import { useState, type ReactNode } from "react";
import { Logo } from "@/components/navigation/Logo";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/shared/command-palette/CommandPalette";
import { OverflowWatcher } from "./OverflowWatcher";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * Below `xl`, the sidebar becomes an off-canvas drawer (fixed, slides in
 * over a backdrop) instead of squeezing a 240px column into a narrow
 * viewport. Extracted into its own client component so the surrounding
 * (dashboard)/layout.tsx can stay an async Server Component for the
 * session/redirect check.
 *
 * Breakpoint deliberately matches ResearchWorkspace's inspector rail
 * (also `xl`), not an earlier one like `lg` - the two used to switch
 * independently, so a 1024-1279px viewport got a static sidebar *and*
 * the mobile floating-inspector-button at the same time. A static
 * sidebar plus the inspector rail (380px) would leave very little width
 * for the actual canvas content below `xl` anyway, so keeping the
 * sidebar in drawer mode through that range - rather than moving the
 * inspector rail down to `lg` - is the one that doesn't reintroduce a
 * cramped-canvas version of the same overflow problem.
 */
export function DashboardShell({ email, children }: { email: string; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen xl:grid xl:grid-cols-[240px_1fr]">
      <CommandPalette />
      <OverflowWatcher />
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-void/70 xl:hidden"
        />
      ) : null}

      <aside
        id="dashboard-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-void",
          "transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "xl:static xl:z-auto xl:w-auto xl:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-line px-5">
          <Logo />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="grid size-8 place-items-center rounded-md text-ink-muted hover:text-ink xl:hidden"
          >
            <CloseIcon />
          </button>
        </div>
        {/* Closes the drawer on navigation: any Link click inside bubbles
            up to this handler, since Sidebar renders plain <a>-backed
            Links with no stopPropagation. */}
        <div className="flex-1 overflow-y-auto" onClick={() => setMobileOpen(false)}>
          <Sidebar />
        </div>
      </aside>

      {/* min-w-0: without it, a CSS grid item won't shrink below its
          content's intrinsic width - a wide child anywhere in the page
          (a button row, a tab bar, a table) would otherwise widen this
          entire grid track and force the whole page to scroll
          horizontally, instead of that one child scrolling internally. */}
      <div className="flex min-w-0 flex-col">
        <Topbar email={email} onOpenMenu={() => setMobileOpen(true)} />
        <main id="main" className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2 2l10 10M12 2L2 12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
