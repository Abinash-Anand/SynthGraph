import type { Metadata } from "next";
import { DemoForm } from "@/components/demo/DemoForm";
import { Badge } from "@/components/ui/Badge";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Ask a question, report a problem, or tell us what you are trying to record with SynthGraph.",
};

export default function DemoPage() {
  return (
    <div className="relative overflow-hidden pt-[calc(var(--nav-h)+72px)] pb-28">
      <div className="grid-field pointer-events-none absolute inset-x-0 top-0 h-[560px]" aria-hidden />

      <div className="shell relative">
        <header className="max-w-[68ch]">
          <Badge tone="cyan" dot>
            Contact
          </Badge>
          <h1 className="mt-7 text-[38px] leading-[1.03] font-medium tracking-[-0.03em] text-gradient-ink md:text-[58px]">
            Ask us anything.
          </h1>
          <p className="mt-6 text-[17px] leading-[1.65] text-ink-muted md:text-[19px]">
            A question, a problem you ran into, or what you are trying to record. Only your
            name, email and a message are needed. You can also write to {SITE.contactEmail}, or
            open an issue on GitHub.
          </p>
        </header>

        <div className="mt-16">
          <DemoForm />
        </div>
      </div>
    </div>
  );
}
