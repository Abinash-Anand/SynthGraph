"use client";

import { useEffect } from "react";
import { DemoGraphScene } from "@/components/3d/dynamic";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";

const ALL_NODES = [
  "researcher",
  "workflow",
  "generation",
  "dataset",
  "training",
  "evaluation",
];

export function DemoSuccess() {
  // Move the reader to the confirmation rather than leaving them mid-form.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex max-w-3xl flex-col items-center text-center"
    >
      <Badge tone="ok" dot>
        Request received
      </Badge>

      <h2 className="mt-8 text-[34px] leading-[1.08] font-medium tracking-[-0.025em] text-gradient-ink md:text-[44px]">
        Request received.
      </h2>

      <p className="mt-5 max-w-[54ch] text-[17px] leading-[1.65] text-ink-muted">
        Thanks. We have your research context and will follow up with next steps.
      </p>

      <div className="mt-12 w-full rounded-xl border border-line bg-surface/50 p-2">
        <DemoGraphScene active={ALL_NODES} />
      </div>

      <p className="mt-6 max-w-[52ch] font-mono text-[11.5px] leading-[1.7] text-ink-faint">
        The chain above is the shape of a provenance record: who ran it, in what workflow, which
        generation, which dataset version, which training run, and the result it produced.
      </p>

      <div className="mt-10">
        <ButtonLink href="/how-it-works" variant="secondary" size="lg" arrow>
          See how it works
        </ButtonLink>
      </div>
    </div>
  );
}
