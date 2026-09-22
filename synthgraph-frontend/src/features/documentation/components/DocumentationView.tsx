import { CodeBlock } from "@/components/ui/CodeBlock";

/**
 * The markdown is deterministic and backend-templated (mostly JSON code
 * fences under fixed headings) — rendered as raw text through the existing
 * CodeBlock rather than adding a markdown-renderer dependency or hand-
 * rolling a parser for what's essentially a one-page feature.
 */
export function DocumentationView({
  markdown,
  generationId,
}: {
  markdown: string;
  generationId: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Plain <a>, not ButtonLink: this target is a Route Handler that
          returns Content-Disposition: attachment, not a page — a real
          browser navigation is needed for the download to trigger, and
          Next's <Link> client-side transition for an internal path could
          intercept it instead. */}
      <a
        href={`/api/generations/${generationId}/documentation`}
        className="inline-flex h-8 w-fit items-center rounded-md border border-line-strong bg-surface/60 px-3 text-[13px] text-ink backdrop-blur-sm transition-colors duration-200 hover:border-cyan/50 hover:bg-surface-2"
      >
        Download .md
      </a>
      <CodeBlock language="text" code={markdown} />
    </div>
  );
}
