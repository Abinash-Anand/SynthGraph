import type { Metadata } from "next";
import { DemoForm } from "@/components/demo/DemoForm";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Request a Demo",
  description:
    "SynthGraph is available through a limited research pilot. Tell us about your synthetic-data workflow and we will follow up with next steps.",
};

export default function DemoPage() {
  return (
    <div className="relative overflow-hidden pt-[calc(var(--nav-h)+72px)] pb-28">
      <div className="grid-field pointer-events-none absolute inset-x-0 top-0 h-[560px]" aria-hidden />

      <div className="shell relative">
        <header className="max-w-[68ch]">
          <Badge tone="cyan" dot>
            Private research pilot
          </Badge>
          <h1 className="mt-7 text-[38px] leading-[1.03] font-medium tracking-[-0.03em] text-gradient-ink md:text-[58px]">
            See your experiment history as a graph.
          </h1>
          <p className="mt-6 text-[17px] leading-[1.65] text-ink-muted md:text-[19px]">
            SynthGraph is currently available through a limited research pilot. Tell us about
            your workflow and we will use it to determine the best way to demonstrate the
            platform.
          </p>
        </header>

        <div className="mt-16">
          <DemoForm />
        </div>
      </div>
    </div>
  );
}
