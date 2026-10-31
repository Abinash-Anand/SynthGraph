"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/navigation/Logo";
import { PRODUCT } from "@/data/product";
import { SITE } from "@/data/site";
import { DocsSearch } from "./DocsSearch";
import { DocsSidebar } from "./DocsSidebar";

/**
 * The top bar of the documentation: logo, search, version, links. Opens the
 * search dialog (button, or Ctrl or Cmd + K) and the navigation drawer used on phones.
 */
export function DocsHeader() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  // The drawer closes itself when the page changes, without an effect.
  const [drawerOpenedAt, setDrawerOpenedAt] = useState<string | null>(null);
  const drawerOpen = drawerOpenedAt === pathname;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-void/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 md:px-6">
          <button
            type="button"
            className="grid size-9 place-items-center rounded-md border border-line text-ink lg:hidden"
            aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpenedAt(drawerOpen ? null : pathname)}
          >
            <span aria-hidden className="text-[15px] leading-none">
              {drawerOpen ? "✕" : "☰"}
            </span>
          </button>

          <Link href="/" className="flex items-center gap-2.5 text-ink transition-opacity hover:opacity-80">
            <LogoMark />
            <span className="text-[15px] font-medium tracking-[-0.01em]">SynthGraph</span>
          </Link>
          <Link href="/docs" className="mono-label hidden border-l border-line pl-3 text-ink-muted sm:block">
            Docs
          </Link>

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-[13px] text-ink-dim transition-colors hover:border-line-strong hover:text-ink-muted md:w-64"
              aria-label="Search the documentation"
            >
              <span aria-hidden>⌕</span>
              <span className="hidden md:inline">Search docs</span>
              <kbd className="ml-auto hidden rounded border border-line px-1.5 py-0.5 font-mono text-[10px] md:inline">
                Ctrl K
              </kbd>
            </button>
            <span className="hidden rounded-full border border-line px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] text-ink-dim sm:inline">
              SDK {PRODUCT.sdkVersion}
            </span>
            <a href={SITE.github} className="hidden text-[13.5px] text-ink-muted transition-colors hover:text-ink md:block">
              GitHub
            </a>
            <Link
              href="/login"
              className="hidden text-[13.5px] text-ink-muted transition-colors hover:text-ink sm:block"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {drawerOpen ? (
        <div className="fixed inset-x-0 top-14 bottom-0 z-30 overflow-y-auto border-t border-line bg-void p-5 lg:hidden">
          <DocsSidebar />
        </div>
      ) : null}

      {searchOpen ? <DocsSearch onClose={() => setSearchOpen(false)} /> : null}
    </>
  );
}
