import type { Metadata } from "next";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { ButtonLink } from "@/components/ui/Button";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "About",
  description:
    "SynthGraph is being built to make the history of synthetic-data experiments explicit: generators, assets, datasets, training jobs and evaluation environments, connected.",
};

const POSITIONS = [
  {
    title: "What SynthGraph is",
    points: [
      "A provenance and experiment-management system for synthetic-data research.",
      "A Python SDK that records what your existing tools already produce.",
      "A record of generations, dataset versions, training runs and evaluation results, and the relationships between them.",
    ],
  },
  {
    title: "What SynthGraph is not",
    points: [
      "It does not generate synthetic data.",
      "It does not replace W&B or MLflow, your simulator, or your training framework.",
      "It does not require datasets to be uploaded to it.",
      "It does not guarantee exact reproduction when external dependencies are missing.",
      "It does not optimise experiments on your behalf.",
    ],
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="Research infrastructure should preserve knowledge, not just metrics."
        lede="Synthetic-data research increasingly depends on complex chains of generators, assets, datasets, training jobs and evaluation environments. The useful information is often distributed across scripts, logs, files, machines and experiment trackers."
      />

      <section className="border-t border-line py-16 md:py-20">
        <div className="shell">
          <Reveal>
            <div className="max-w-[68ch]">
              <p className="text-[18px] leading-[1.65] text-ink md:text-[21px]">
                SynthGraph is being built to make that history explicit.
              </p>
              <p className="mt-6 text-[16px] leading-[1.7] text-ink-muted md:text-[17px]">
                The observation behind it is narrow and specific. In synthetic-data work, the
                configuration that produced a dataset is often more fragile than the dataset
                itself. A folder name records one parameter out of ten. A notebook cell is
                re-run. An asset is replaced on disk. Six weeks later the result is still there
                and the reason for it is not.
              </p>
              <p className="mt-6 text-[16px] leading-[1.7] text-ink-muted md:text-[17px]">
                Experiment trackers solved this for training. They log metrics, hyperparameters
                and checkpoints extremely well. What they were not built to capture is what
                happened <em className="not-italic text-ink">before</em> the training run — the
                generator version, the scene parameters, the seed, the asset versions, the
                dataset version that came out the other side. That is the part SynthGraph is
                trying to hold onto.
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
                SynthGraph is in a private research pilot. It is being developed with a small
                number of research workflows before broader access. There are no customers,
                published benchmarks or shipped integrations to point at yet, and this site does
                not claim any. When that changes, this page will say so.
              </p>
              <div className="mt-6">
                <ButtonLink href="/demo" variant="secondary" arrow>
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
