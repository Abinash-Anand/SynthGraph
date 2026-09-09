import { ButtonLink } from "@/components/ui/Button";
import { NAV_LINKS } from "@/data/site";

export default function NotFound() {
  return (
    <div className="relative overflow-hidden pt-[calc(var(--nav-h)+120px)] pb-32">
      <div className="grid-field pointer-events-none absolute inset-x-0 top-0 h-[480px]" aria-hidden />
      <div className="shell relative">
        <p className="mono-label">404</p>
        <h1 className="mt-6 max-w-[18ch] text-[38px] leading-[1.05] font-medium tracking-[-0.03em] text-gradient-ink md:text-[54px]">
          That page has no record here.
        </h1>
        <p className="mt-6 max-w-[56ch] text-[17px] leading-[1.65] text-ink-muted">
          The link may be out of date, or the page may never have existed.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/" arrow>
            Back to the homepage
          </ButtonLink>
          <ButtonLink href="/demo" variant="secondary">
            Request a Demo
          </ButtonLink>
        </div>

        <nav aria-label="Site" className="mt-16 border-t border-line pt-8">
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-[14.5px] text-ink-muted transition-colors duration-200 hover:text-ink"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
