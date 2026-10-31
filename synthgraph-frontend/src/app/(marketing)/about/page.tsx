import type { Metadata } from "next";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { ButtonLink } from "@/components/ui/Button";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { PRODUCT } from "@/data/product";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why SynthGraph exists, what it is and is not, and where it stands: an open source alpha for recording the history of synthetic-data experiments.",
};

const POSITIONS = [
  {
    title: "What SynthGraph is",
    points: [
      "A lineage system for synthetic training data and the models trained on it.",
      "A Python SDK and a command line tool that record and read back what your existing tools produce.",
      "A dashboard that shows generations, dataset versions, training runs and evaluations, and the links someone recorded between them.",
      `Open source under the ${PRODUCT.license} license, which you can run yourself.`,
    ],
  },
  {
    title: "What SynthGraph is not",
    points: [
      "It does not generate synthetic data or train models.",
      "It does not store your data. It stores references and metadata.",
      "It does not regenerate a dataset, and it does not prove a result is reproducible.",
      "It has no plugins for Blender, Unity or Omniverse. Your script calls the SDK.",
      "It does not recommend or optimise parameters for you.",
    ],
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="Research infrastructure should preserve knowledge, not just metrics."
        lede="Synthetic-data research depends on chains of generators, scenes, datasets, training runs and evaluations. The useful information is often spread across scripts, notebooks and memory."
      />

      <section className="border-t border-line py-16 md:py-20">
        <div className="shell">
          <Reveal>
            <div className="max-w-[68ch]">
              <p className="text-[18px] leading-[1.65] text-ink md:text-[21px]">
                SynthGraph exists to make that history explicit.
              </p>
              <p className="mt-6 text-[16px] leading-[1.7] text-ink-muted md:text-[17px]">
                The observation behind it is narrow. In synthetic-data work, the configuration that
                produced a dataset is often more fragile than the dataset itself. A folder name records one
                parameter out of ten. A notebook cell is re-run. A scene file is replaced on disk. Six weeks
                later the result is still there and the reason for it is not.
              </p>
              <p className="mt-6 text-[16px] leading-[1.7] text-ink-muted md:text-[17px]">
                Experiment trackers solved much of this for training. SynthGraph is aimed at what happened{" "}
                <em className="not-italic text-ink">before</em> the training run: the generator version, the
                scene parameters, the seed, the dataset version that came out the other side, and the link
                from there to the model it trained. It records training metrics and evaluations too, and it is
                meant to sit beside the tools you already use, not to replace them.
              </p>
            </div>
          </Reveal>

          <div className="mt-16 grid gap-8 md:grid-cols-2 md:gap-12">
            {POSITIONS.map((position, index) => (
              <Reveal key={position.title} delay={index * 0.08}>
                <h2 className="mono-label">{position.title}</h2>
                <ul className="mt-5 flex flex-col gap-3">
                  {position.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span
                        aria-hidden
                        className={
                          index === 0
                            ? "mt-[9px] size-1.5 shrink-0 rounded-full bg-cyan"
                            : "mt-[9px] size-1.5 shrink-0 rounded-full bg-ink-faint"
                        }
                      />
                      <span className="text-[15px] leading-[1.62] text-ink-muted">{point}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.16}>
            <div className="mt-16 max-w-[76ch] rounded-lg border border-line bg-surface/50 p-6">
              <p className="mono-label">Current status</p>
              <p className="mt-3 text-[15px] leading-[1.7] text-ink-muted">
                SynthGraph is an alpha. The SDK is at version {PRODUCT.sdkVersion}, the API only changes by
                adding, and the SDK can still change. There are no customers or published benchmarks to point
                at, and this site does not claim any. What it does today, and what it does not, is written down
                in the docs.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/docs/reference/limits" variant="secondary" arrow>
                  What it does not do
                </ButtonLink>
                <ButtonLink href="/demo" variant="secondary">
                  Get in touch
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
