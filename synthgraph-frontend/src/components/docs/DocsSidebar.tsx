"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_NAV, docHref } from "@/content/docs/nav";
import { cn } from "@/lib/utils";

/** The section navigation. Also rendered inside the mobile drawer. */
export function DocsSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentation" className={cn("flex flex-col gap-7 text-[14px]", className)}>
      {DOCS_NAV.map((section) => (
        <div key={section.title}>
          <p className="mono-label mb-2.5 px-2">{section.title}</p>
          <ul className="flex flex-col gap-0.5">
            {section.pages.map((page) => {
              const href = docHref(page.slug);
              const active = pathname === href;
              return (
                <li key={page.slug}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-2 py-1.5 transition-colors",
                      active
                        ? "bg-surface-2 font-medium text-ink"
                        : "text-ink-muted hover:bg-surface hover:text-ink",
                    )}
                  >
                    {page.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
