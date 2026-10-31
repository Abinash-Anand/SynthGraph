import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { INTEGRATIONS } from "@/data/product";

const TOOLS = [
  {
    title: "Python SDK",
    body: "Typed records, a with block for the generation lifecycle, reads that retry with backoff, and writes that report an unknown outcome instead of pretending they saved.",
    href: "/docs/sdk/generations",
    link: "SDK guides",
  },
  {
    title: "Command line",
    body: "Read provenance back from a terminal or a script. Every command can print JSON. Export a reproduction manifest or generated Markdown documentation for a generation.",
    href: "/docs/cli/overview",
    link: "CLI overview",
  },
];

export function YourStack() {
  return (
    <Section id="stack">
      <div className="shell">
        <SectionHeader
          eyebrow="Your stack"
          title="It works from the code you already run."
          lede="There are no plugins to install into your generator or your trainer. Your script calls the SDK, so anything that runs Python can record to it."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <ul className="flex flex-col gap-8">
            {TOOLS.map((tool, index) => (
              <Reveal as="li" key={tool.title} delay={index * 0.06}>
                <h3 className="font-mono text-[14px] text-ink">{tool.title}</h3>
                <p className="mt-2 max-w-[52ch] text-[14.5px] leading-[1.65] text-ink-muted">{tool.body}</p>
                <div className="mt-4">
                  <ButtonLink href={tool.href} variant="secondary" size="sm" arrow>
                    {tool.link}
                  </ButtonLink>
                </div>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={0.1}>
            <p className="mono-label">Framework helpers</p>
            <ul className="mt-5 flex flex-col gap-2.5">
              {INTEGRATIONS.map((item) => (
                <li key={item.name} className="rounded-md border border-line bg-surface/50 px-4 py-3">
                  <p className="font-mono text-[13px] text-ink">{item.name}</p>
                  <p className="mt-0.5 text-[13px] leading-[1.55] text-ink-muted">{item.does}</p>
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-[56ch] text-[13.5px] leading-[1.65] text-ink-dim">
              These are for reinforcement learning libraries. There are no plugins for Blender, Unity or
              Omniverse: those scripts call the SDK directly.
            </p>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
