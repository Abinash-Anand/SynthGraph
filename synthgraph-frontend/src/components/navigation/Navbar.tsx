"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "@/data/site";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  /**
   * The route the overlay was opened on. Navigating anywhere — including via
   * the browser's back button — closes it, without an effect that would have
   * to chase `pathname`.
   */
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const menuOpen = openedAt === pathname;

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };
    frame = window.requestAnimationFrame(measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[height,background-color,border-color,backdrop-filter]",
          "duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]",
          scrolled || menuOpen
            ? "h-14 border-b border-line bg-void/70 backdrop-blur-xl"
            : "h-16 border-b border-transparent bg-transparent",
        )}
        style={{ ["--nav-h" as string]: scrolled ? "56px" : "64px" }}
      >
        <div className="shell flex h-full items-center justify-between gap-8">
          <Logo />

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative rounded-md px-3 py-2 text-[14px] transition-colors duration-200",
                        active ? "text-ink" : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {link.label}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-x-3 -bottom-px h-px origin-left bg-cyan transition-transform duration-300",
                          "ease-[cubic-bezier(0.22,1,0.36,1)]",
                          active ? "scale-x-100" : "scale-x-0",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/demo"
              className={cn(
                "hidden h-9 items-center rounded-md bg-ink px-4 text-[13.5px] font-medium text-void",
                "transition-[background-color,transform] duration-200 hover:bg-white active:scale-[0.98] lg:inline-flex",
              )}
            >
              Request a Demo
            </Link>

            <button
              type="button"
              onClick={() => setOpenedAt((open) => (open === pathname ? null : pathname))}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="relative z-50 grid size-10 place-items-center rounded-md border border-line text-ink lg:hidden"
            >
              <span className="relative block h-3 w-4">
                <span
                  className={cn(
                    "absolute left-0 block h-px w-full bg-current transition-transform duration-300",
                    "ease-[cubic-bezier(0.22,1,0.36,1)]",
                    menuOpen ? "top-1.5 rotate-45" : "top-0",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-1.5 block h-px w-full bg-current transition-opacity duration-200",
                    menuOpen ? "opacity-0" : "opacity-100",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 block h-px w-full bg-current transition-transform duration-300",
                    "ease-[cubic-bezier(0.22,1,0.36,1)]",
                    menuOpen ? "top-1.5 -rotate-45" : "top-3",
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setOpenedAt(null)} pathname={pathname} />
    </>
  );
}
