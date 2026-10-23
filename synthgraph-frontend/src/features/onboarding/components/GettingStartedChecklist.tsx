"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { postOnboardingSeen } from "../lib/post-onboarding-seen";
import { checklistProgress, type ChecklistItem } from "../onboarding-rules";

const CHECKLIST_VERSION = 1;

export function GettingStartedChecklist({ items }: { items: ChecklistItem[] }) {
  const [dismissed, setDismissed] = useState(false);
  const { done, total, complete } = checklistProgress(items);

  if (dismissed || complete) return null;

  return (
    <section aria-labelledby="getting-started-heading" className="rounded-xl border border-research-border bg-research-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="getting-started-heading" className="text-[15px] font-medium text-research-ink">
            Getting started
          </h2>
          <p className="mt-0.5 text-[12.5px] text-research-ink-muted">
            {done} of {total} done
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            postOnboardingSeen("checklist", CHECKLIST_VERSION);
          }}
          className="shrink-0 text-[12.5px] text-research-ink-muted transition-colors hover:text-research-ink"
        >
          Dismiss
        </button>
      </div>

      <div
        className="mb-4 h-1 overflow-hidden rounded-full bg-research-border"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="Getting started progress"
      >
        <div
          className="h-full rounded-full bg-research-accent transition-[width] duration-300"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>

      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex min-w-0 items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-research-subtle/60"
            >
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                  item.done
                    ? "border-research-success bg-research-success/15 text-research-success"
                    : "border-research-border text-transparent",
                )}
              >
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1.5 4.7l2 2 4-4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[13.5px]",
                    item.done ? "text-research-ink-muted line-through" : "text-research-ink",
                  )}
                >
                  {item.label}
                  <span className="sr-only">{item.done ? " (done)" : " (not done)"}</span>
                </span>
                {!item.done ? (
                  <span className="mt-0.5 block text-[12.5px] text-research-ink-muted">{item.description}</span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
