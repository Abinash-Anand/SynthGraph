import Link from "next/link";
import { neighbours } from "@/content/docs/nav";

/** Previous and next page links at the bottom of a docs page. */
export function DocsPager({ slug }: { slug: string }) {
  const { previous, next } = neighbours(slug);
  if (!previous && !next) return null;

  const card =
    "group flex flex-col gap-1 rounded-lg border border-line bg-surface/40 px-4 py-3.5 transition-colors hover:border-line-strong";

  return (
    <nav aria-label="Previous and next pages" className="mt-14 grid gap-3 sm:grid-cols-2">
      {previous ? (
        <Link href={previous.href} className={card}>
          <span className="mono-label">Previous</span>
          <span className="text-[15px] font-medium text-ink group-hover:text-cyan">← {previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.href} className={`${card} sm:text-right`}>
          <span className="mono-label">Next</span>
          <span className="text-[15px] font-medium text-ink group-hover:text-cyan">{next.title} →</span>
        </Link>
      ) : null}
    </nav>
  );
}
