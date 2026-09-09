import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function FinalCTA() {
  return (
    <section id="pilot" className="relative overflow-hidden border-t border-line py-28 md:py-36">
      <div
        className="grid-field pointer-events-none absolute inset-0"
        style={{ maskImage: "radial-gradient(ellipse 70% 80% at 50% 100%, #000 10%, transparent 75%)" }}
        aria-hidden
      />

      <div className="shell relative flex flex-col items-center text-center">
        <Reveal>
          <Badge tone="cyan" dot>
            Private research pilot
          </Badge>
        </Reveal>

        <Reveal delay={0.06}>
          <h2 className="mt-8 max-w-[16ch] text-[38px] leading-[1.02] font-medium tracking-[-0.03em] text-gradient-ink md:text-[62px]">
            Your next experiment should leave a trail.
          </h2>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.65] text-ink-muted md:text-[19px]">
            SynthGraph is currently available through a limited research pilot. Request a demo to
            see how provenance fits into your existing workflow.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/demo" size="lg" arrow>
              Request a Demo
            </ButtonLink>
            <ButtonLink href="/product" size="lg" variant="secondary">
              Explore the product
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <p className="mt-8 font-mono text-[11.5px] leading-[1.7] text-ink-faint">
            SynthGraph is being developed with a small number of research workflows before
            broader access.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
