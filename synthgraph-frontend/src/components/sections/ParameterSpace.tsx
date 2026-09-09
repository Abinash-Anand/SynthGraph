import { ParameterSpaceScene } from "@/components/3d/dynamic";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";

export function ParameterSpace() {
  return (
    <Section id="parameter-space">
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14">
          <div>
            <SectionHeader
              eyebrow="Parameter space"
              title="Look at the runs you have already done."
              lede="Recorded experiments can be plotted against the parameters they varied. It is a way of reading experiment history — seeing where a sweep has been dense and where it has not."
            />

            <Reveal delay={0.08}>
              <p className="mt-8 max-w-[52ch] rounded-lg border border-line bg-surface/50 p-5 text-[14.5px] leading-[1.7] text-ink-muted">
                This is a visualisation of search and comparison over past runs. SynthGraph does
                not propose parameters, run sweeps on your behalf, or optimise anything. Choosing
                the next experiment stays a research decision.
              </p>
            </Reveal>

            <Disclaimer className="mt-6" />
          </div>

          <Reveal delay={0.06}>
            <ParameterSpaceScene />
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
