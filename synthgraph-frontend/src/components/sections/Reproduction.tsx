import { ManifestScene } from "@/components/3d/dynamic";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { REPRODUCTION_MANIFEST } from "@/data/demo-data";

export function Reproduction() {
  return (
    <Section id="reproduction">
      <div className="shell">
        <SectionHeader
          eyebrow="Reproduction"
          title="Reproduction should start with evidence."
          lede="A reproduction manifest gathers the recorded configuration, code and version information, seeds, assets, dataset references and missing dependencies needed to reconstruct an experiment."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <Reveal>
            <ManifestScene />
          </Reveal>

          <Reveal delay={0.08}>
            <CodeBlock
              code={REPRODUCTION_MANIFEST}
              language="json"
              filename="manifest.json"
              animate
            />
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-ok/25 bg-ok/[0.03] p-5">
              <p className="font-mono text-[10px] tracking-[0.16em] text-ok uppercase">
                What the manifest asserts
              </p>
              <p className="mt-3 text-[14.5px] leading-[1.7] text-ink-muted">
                These are the recorded facts: this generator at this version, these parameters,
                this seed, these asset versions, this dataset reference, this commit.
              </p>
            </div>
            <div className="rounded-lg border border-warn/25 bg-warn/[0.03] p-5">
              <p className="font-mono text-[10px] tracking-[0.16em] text-warn uppercase">
                What it does not assert
              </p>
              <p className="mt-3 text-[14.5px] leading-[1.7] text-ink-muted">
                That re-running will produce identical output. Where a dependency was external
                or unrecorded, the manifest says so. SynthGraph makes the dependencies and the
                known provenance explicit — it does not guarantee exact reproduction.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
