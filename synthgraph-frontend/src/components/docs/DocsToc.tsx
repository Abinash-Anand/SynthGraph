"use client";

import { useEffect, useState } from "react";
import type { DocHeading } from "@/content/docs/headings";
import { cn } from "@/lib/utils";

/** "On this page": the headings of the current page, with the one in view highlighted. */
export function DocsToc({ headings }: { headings: DocHeading[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    // A heading counts as current once it passes the top of the page, until the next one does.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="On this page" className="text-[13px]">
      <p className="mono-label mb-3">On this page</p>
      <ul className="flex flex-col gap-1.5 border-l border-line">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              aria-current={active === heading.id ? "location" : undefined}
              className={cn(
                "-ml-px block border-l py-0.5 transition-colors",
                heading.level === 3 ? "pl-6" : "pl-3",
                active === heading.id
                  ? "border-cyan text-ink"
                  : "border-transparent text-ink-dim hover:text-ink-muted",
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
