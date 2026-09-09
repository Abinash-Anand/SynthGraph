import type { Metadata } from "next";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Developers",
  description:
    "Instrument synthetic-data research in Python. The SynthGraph SDK records generations, dataset versions, training runs and evaluation results from the code you already run.",
};

const INSTALL = `$ pip install synthgraph`;

const CONFIGURE = `import os

from synthgraph import SynthGraphClient

client = SynthGraphClient(
    api_key=os.environ["SYNTHGRAPH_API_KEY"],
    # Point at a hosted or self-controlled deployment.
    api_url=os.environ.get("SYNTHGRAPH_API_URL"),
)`;

const PROJECTS = `project = client.projects.create(
    name="Wildlife Detection",
    description="Synthetic rain scenes for detection in adverse weather",
)

experiment = client.experiments.create(
    project_id=project.id,
    name="Rainy Scene Generation",
)`;

const GENERATIONS = `from synthgraph import Generator, Reproducibility

generation = client.generations.create(
    experiment_id=experiment.id,
    name="Rainy Scene Generation",
    generator=Generator(
        name="blender",
        version="4.2.0",
    ),
    parameters={
        "weather": "rain",
        "occlusion": 0.30,
        "camera_distance": 12,
    },
    reproducibility=Reproducibility(
        seed=42,
    ),
)`;

const REFERENCES = `# The dataset stays where it already lives. SynthGraph records
# the reference, the version and the checksum — not the bytes.
client.generations.complete(
    generation.id,
    dataset={
        "name": "rain_dataset",
        "version": "v7",
        "uri": "s3://research/rain-v7",
        "checksum": "sha256:9c1f...e40b",
    },
    assets=[
        {"name": "vehicle-model", "version": "v7"},
        {"name": "forest-texture", "version": "v4"},
    ],
)`;

const LIFECYCLE = `try:
    frames = render_dataset(**parameters)
except RenderError as error:
    # A failed run keeps its provenance and stays in the history.
    client.generations.fail(generation.id, reason=str(error))
    raise

client.generations.complete(generation.id, frame_count=len(frames))`;

const SECTIONS = [
  {
    id: "installation",
    title: "Installation",
    body: "The SDK is a Python package with a small dependency surface. It targets the Python versions research environments actually run.",
    code: INSTALL,
    language: "bash" as const,
    filename: "shell",
  },
  {
    id: "client",
    title: "Client configuration",
    body: "The API key is read from the environment, never hard-coded. The endpoint is configurable so the same code can run against a hosted deployment or one you operate yourself.",
    code: CONFIGURE,
    language: "python" as const,
    filename: "client.py",
  },
  {
    id: "projects",
    title: "Projects and experiments",
    body: "Ownership runs User → Project → Experiment. An experiment holds the generations and training runs that belong together.",
    code: PROJECTS,
    language: "python" as const,
    filename: "setup.py",
  },
  {
    id: "generations",
    title: "Generations",
    body: "A generation is created before the run, with the generator, parameters and seed that define it. That ordering is what makes the record trustworthy: the configuration is written down before the outcome is known.",
    code: GENERATIONS,
    language: "python" as const,
    filename: "sweep.py",
  },
  {
    id: "references",
    title: "References",
    body: "Datasets and assets are attached by reference and version. Nothing requires uploading a dataset to SynthGraph in order to record its provenance.",
    code: REFERENCES,
    language: "python" as const,
    filename: "sweep.py",
  },
  {
    id: "lifecycle",
    title: "Lifecycle",
    body: "A generation moves from pending to running to completed or failed. Once it is running, the fields that define the run are fixed; a failure is recorded rather than discarded.",
    code: LIFECYCLE,
    language: "python" as const,
    filename: "sweep.py",
  },
];

const RELIABILITY = [
  ["Safe retries", "A dropped connection during a long sweep should not leave a half-written record."],
  ["Idempotency", "Repeating a create call does not produce a duplicate run."],
  ["Backend validation", "The API decides what a valid record is; the client does not get to disagree."],
  ["Typed models", "Generator, Reproducibility and reference types are typed rather than loose dictionaries."],
  ["Flexible metadata", "Domain-specific metadata rides alongside the fields the model defines."],
  ["Storage neutrality", "References describe where data lives without assuming a provider."],
];

export default function DevelopersPage() {
  return (
    <>
      <PageHero
        eyebrow="Developers"
        title="Instrument your research in Python."
        lede="The SDK is the primary integration surface. It wraps the generation and training code you already run and sends structured provenance to the API over HTTPS."
      >
        <div className="flex flex-col gap-5">
          <CodeBlock
            code={`from synthgraph import SynthGraphClient`}
            language="python"
            filename="python"
            className="max-w-[520px]"
          />
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/demo" arrow>
              Request a Demo
            </ButtonLink>
            <Badge tone="cyan" dot>
              SDK in early development
            </Badge>
          </div>
        </div>
      </PageHero>

      <section className="border-t border-line">
        <div className="shell">
          <ul className="flex flex-col">
            {SECTIONS.map((section, index) => (
              <Reveal as="li" key={section.id}>
                <article
                  id={section.id}
                  className="grid gap-8 border-b border-line py-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-ink-faint">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h2 className="text-[22px] font-medium tracking-[-0.02em] text-ink md:text-[26px]">
                        {section.title}
                      </h2>
                    </div>
                    <p className="mt-4 max-w-[46ch] text-[15.5px] leading-[1.68] text-ink-muted">
                      {section.body}
                    </p>
                  </div>
                  <CodeBlock
                    code={section.code}
                    language={section.language}
                    filename={section.filename}
                  />
                </article>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-20">
        <div className="shell grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="mono-label">Reliability</p>
            <h2 className="mt-4 max-w-[20ch] text-[26px] leading-[1.15] font-medium tracking-[-0.02em] text-ink md:text-[32px]">
              A sweep runs for hours. The client has to survive it.
            </h2>
            <ul className="mt-8 flex flex-col gap-5">
              {RELIABILITY.map(([title, body]) => (
                <li key={title}>
                  <h3 className="font-mono text-[12.5px] text-ink">{title}</h3>
                  <p className="mt-1 max-w-[48ch] text-[14px] leading-[1.6] text-ink-muted">
                    {body}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mono-label">API architecture</p>
            <ol className="mt-5 flex flex-col">
              {[
                ["Your code", "generator, training script, notebook"],
                ["SynthGraph SDK", "typed models, retries, idempotency"],
                ["HTTPS / JSON", "authenticated request"],
                ["SynthGraph API", "server-side validation and authorization"],
                ["Provenance storage", "records, versions, relationships"],
              ].map(([layer, detail], index, all) => (
                <li key={layer}>
                  <div className="rounded-md border border-line bg-surface/50 px-4 py-3">
                    <p className="font-mono text-[13px] text-ink">{layer}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-ink-dim">{detail}</p>
                  </div>
                  {index < all.length - 1 ? (
                    <div className="py-1.5 pl-6">
                      <span aria-hidden className="block h-3 w-px bg-cyan/40" />
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>

            <div className="mt-8 rounded-lg border border-line bg-surface/50 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="mono-label">Current status</p>
                <StatusBadge status="private-pilot" />
              </div>
              <p className="mt-4 max-w-[52ch] text-[14.5px] leading-[1.7] text-ink-muted">
                The SDK is in early development and is being integrated against real research
                workflows during the pilot. It is not a released v1.0, the surface is still
                changing, and the snippets on this page describe the intended shape of the
                client rather than a frozen contract.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
