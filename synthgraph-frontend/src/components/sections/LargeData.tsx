import { StorageScene } from "@/components/3d/dynamic";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";

const SPLIT = [
  {
    side: "SynthGraph stores",
    tone: "cyan" as const,
    items: ["Metadata", "Lineage relationships", "Dataset and asset versions", "References and checksums"],
  },
  {
    side: "You keep",
    tone: "neutral" as const,
    items: ["Images and video", "Rendered sequences", "Full datasets", "Whatever your storage already holds"],
  },
];

export function LargeData() {
  return (
    <Section id="storage">
      <div className="shell">
        <SectionHeader
          eyebrow="Storage"
          title="Your datasets stay where they already live."
          lede="SynthGraph primarily manages metadata, provenance and references. Large generated datasets can remain in the researcher’s filesystem, lab storage, or object storage."
        />

        <div className="mt-12">
          <StorageScene />
        </div>

        <div className="mt-10 grid gap-6 border-t border-line pt-10 md:grid-cols-2 md:gap-12">
          {SPLIT.map((column, index) => (
            <Reveal key={column.side} delay={index * 0.08}>
              <p className="mono-label">{column.side}</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.items.map((item) => (
                  <li key={item} className="flex items-baseline gap-3">
                    <span
                      aria-hidden
                      className={
                        column.tone === "cyan"
                          ? "mt-[7px] size-1.5 shrink-0 rounded-full bg-cyan"
                          : "mt-[7px] size-1.5 shrink-0 rounded-full bg-ink-faint"
                      }
                    />
                    <span className="text-[15px] text-ink-muted">{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.16}>
          <p className="mt-10 max-w-[70ch] rounded-lg border border-line bg-surface/50 p-5 text-[14.5px] leading-[1.7] text-ink-muted">
            The particles in these graphs represent recorded <em className="not-italic text-ink">relationships</em>{" "}
            between records — not the transfer of dataset bytes. Nothing in a provenance record
            requires the underlying data to move.
          </p>
        </Reveal>
      </div>
    </Section>
  );
}
