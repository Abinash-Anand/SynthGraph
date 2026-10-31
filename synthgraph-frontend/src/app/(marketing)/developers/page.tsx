import type { Metadata } from "next";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { INTEGRATIONS, PRODUCT, SDK_INSTALL_COMMAND } from "@/data/product";
import { CONFIGURE_SNIPPET, RECORD_SNIPPET } from "@/data/snippets";

export const metadata: Metadata = {
  title: "Developers",
  description:
    "Record generations, datasets, training runs and evaluations from the Python code you already run. The SynthGraph SDK and CLI.",
};

const INSTALL = `$ ${SDK_INSTALL_COMMAND}`;



const CLI = `$ synthgraph projects list
$ synthgraph experiments list --project <project-id>
$ synthgraph training-runs get <training-run-id>
$ synthgraph manifest <generation-id>     # the reproduction manifest
$ synthgraph docs <generation-id>         # generated Markdown documentation`;

const SECTIONS = [
  {
    id: "installation",
    title: "Install",
    body: PRODUCT.sdkOnPyPI
      ? `The SDK needs Python ${PRODUCT.pythonRequires}. It installs the synthgraph Python package and a synthgraph command.`
      : `The SDK needs Python ${PRODUCT.pythonRequires}. The version on PyPI is behind the repository, so for now install the current ${PRODUCT.sdkVersion} straight from GitHub.`,
    code: INSTALL,
    language: "bash" as const,
    filename: "shell",
  },
  {
    id: "configure",
    title: "Configure",
    body: "Credentials come from the environment, never from code. Create an API key in the dashboard under Settings, then point the SDK at your backend: the hosted one or your own.",
    code: CONFIGURE_SNIPPET,
    language: "bash" as const,
    filename: "shell",
  },
  {
    id: "record",
    title: "Record",
    body: "A few lines around the code you already have. The with block starts and finishes the generation for you, and marks it failed if your code raises. A training run is started and completed with explicit calls. Your dataset stays where it is: SynthGraph stores the reference, not the bytes.",
    code: RECORD_SNIPPET,
    language: "python" as const,
    filename: "capture.py",
  },
  {
    id: "cli",
    title: "Inspect from the command line",
    body: "The same data, from a terminal. Every command can print JSON for scripts.",
    code: CLI,
    language: "bash" as const,
    filename: "shell",
  },
];

const RELIABILITY = [
  [
    "Reads are retried",
    "GET requests are retried with exponential backoff on connection failures, timeouts and 408, 429 and 5xx responses.",
  ],
  [
    "Writes are never retried blindly",
    "The API has no idempotency key yet, so repeating a create call could duplicate a record. A write that fails in transit raises an error that says its outcome is unknown, instead of pretending it saved.",
  ],
  [
    "Backend validation",
    "The API decides what a valid record is. The SDK checks what it can before a request leaves, so a rejected call leaves nothing behind.",
  ],
  [
    "Typed models",
    "Responses are typed models, not loose dictionaries, and errors form one hierarchy you can catch.",
  ],
  [
    "Opt-in capture",
    "Hashing your data, reading git state, recording the environment and sampling resources only happen when you ask.",
  ],
  [
    "Your key stays private",
    "The API key is never logged, never written into a model or a manifest, and never placed in an error message.",
  ],
];

export default function DevelopersPage() {
  return (
    <>
      <PageHero
        eyebrow="Developers"
        title="Instrument your research in Python."
        lede="The SDK is called from the generator and training code you already run, and sends structured records to the API over HTTPS. A command line tool reads them back."
      >
        <div className="flex flex-col gap-5">
          <CodeBlock code={INSTALL} language="bash" filename="shell" className="max-w-[640px]" />
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href="/docs" arrow>
              Read the docs
            </ButtonLink>
            <ButtonLink href={PRODUCT.repoUrl} variant="secondary">
              GitHub
            </ButtonLink>
            <Badge tone="cyan" dot>
              SDK {PRODUCT.sdkVersion} · alpha
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
                  <CodeBlock code={section.code} language={section.language} filename={section.filename} />
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
              What the client does when the network does not.
            </h2>
            <ul className="mt-8 flex flex-col gap-5">
              {RELIABILITY.map(([title, body]) => (
                <li key={title}>
                  <h3 className="font-mono text-[12.5px] text-ink">{title}</h3>
                  <p className="mt-1 max-w-[52ch] text-[14px] leading-[1.6] text-ink-muted">{body}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mono-label">Framework helpers</p>
            <p className="mt-4 max-w-[52ch] text-[14.5px] leading-[1.7] text-ink-muted">
              Helpers turn objects you already have into the configuration SynthGraph records. Nothing is
              imported or patched unless you call it. There are no plugins for Blender, Unity or Omniverse:
              your script calls the SDK.
            </p>
            <ul className="mt-6 flex flex-col gap-3">
              {INTEGRATIONS.map((item) => (
                <li key={item.name} className="rounded-md border border-line bg-surface/50 px-4 py-3">
                  <p className="font-mono text-[13px] text-ink">{item.name}</p>
                  <p className="mt-0.5 text-[13px] leading-[1.55] text-ink-muted">{item.does}</p>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-lg border border-line bg-surface/50 p-5">
              <p className="mono-label">Current status</p>
              <p className="mt-4 max-w-[52ch] text-[14.5px] leading-[1.7] text-ink-muted">
                The SDK is at version {PRODUCT.sdkVersion}, an alpha. It is open source under the{" "}
                {PRODUCT.license} license, it is not a finished v1.0 release, and the surface can still
                change.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
