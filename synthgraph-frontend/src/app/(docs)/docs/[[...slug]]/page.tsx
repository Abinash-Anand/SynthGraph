import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsPager } from "@/components/docs/DocsPager";
import { DocsToc } from "@/components/docs/DocsToc";
import { allDocPages, docHref, findDocPage, slugFromSegments } from "@/content/docs/nav";
import { PRODUCT } from "@/data/product";
import { SITE } from "@/data/site";
import { getHeadings } from "@/lib/docs";

type Params = { slug?: string[] };

export function generateStaticParams(): Params[] {
  return allDocPages().map((page) => ({ slug: page.slug === "index" ? [] : page.slug.split("/") }));
}

// Anything not in the navigation is a 404, never a runtime import error.
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const page = findDocPage(slugFromSegments((await params).slug));
  if (!page) return {};
  return {
    title: page.slug === "index" ? "Documentation" : page.title,
    description: page.description,
    alternates: { canonical: `${SITE.url}${docHref(page.slug)}` },
  };
}

export default async function DocsPage({ params }: { params: Promise<Params> }) {
  const slug = slugFromSegments((await params).slug);
  const page = findDocPage(slug);
  if (!page) notFound();

  const { default: Content } = await import(`@/content/docs/${slug}.mdx`);
  const headings = getHeadings(slug);

  return (
    <div className="grid gap-x-10 xl:grid-cols-[minmax(0,1fr)_210px]">
      <article className="min-w-0 max-w-[740px]">
        <p className="mono-label">{page.section}</p>
        <h1 className="mt-3 text-[34px] leading-[1.12] font-semibold tracking-[-0.025em] text-ink md:text-[40px]">
          {page.title}
        </h1>
        <p className="mt-4 text-[17px] leading-[1.6] text-ink-muted">{page.description}</p>

        <div className="docs-prose mt-9">
          <Content />
        </div>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[13px] text-ink-dim">
          <span>Written for SDK {PRODUCT.sdkVersion}.</span>
          <a
            href={`${PRODUCT.repoUrl}/blob/main/synthgraph-frontend/src/content/docs/${slug}.mdx`}
            className="transition-colors hover:text-ink-muted"
          >
            Edit this page on GitHub
          </a>
        </footer>

        <DocsPager slug={slug} />
      </article>

      <aside className="sticky top-20 hidden h-fit pt-1 xl:block">
        <DocsToc headings={headings} />
      </aside>
    </div>
  );
}
