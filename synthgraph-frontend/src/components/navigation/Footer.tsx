import Link from "next/link";
import { FOOTER_GROUPS, SITE } from "@/data/site";
import { LogoMark } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-line bg-base/40">
      <div className="shell grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)] md:py-20">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5 text-ink">
            <LogoMark />
            <span className="text-[15px] font-medium tracking-[-0.01em]">SynthGraph</span>
          </div>
          <p className="max-w-[30ch] text-[14px] leading-[1.65] text-ink-muted">
            Synthetic-data provenance for computer-vision research.
          </p>
          <p className="mono-label mt-2">Private research pilot</p>
        </div>

        {FOOTER_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title} className="flex flex-col gap-4">
            <h2 className="mono-label">{group.title}</h2>
            <ul className="flex flex-col gap-2.5">
              {group.links.map((link) => (
                <li key={`${group.title}-${link.href}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-ink-muted transition-colors duration-200 hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="flex flex-col gap-4">
          <h2 className="mono-label">Resources</h2>
          <ul className="flex flex-col gap-2.5">
            <li>
              <span className="flex items-center gap-2 text-[14px] text-ink-dim">
                Documentation
                <span className="font-mono text-[10px] tracking-[0.12em] text-ink-faint uppercase">
                  Planned
                </span>
              </span>
            </li>
            <li>
              <span className="flex items-center gap-2 text-[14px] text-ink-dim">
                GitHub
                <span className="font-mono text-[10px] tracking-[0.12em] text-ink-faint uppercase">
                  Planned
                </span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="shell flex flex-col gap-3 py-6 text-[13px] text-ink-faint md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {SITE.name}</p>
          <p className="font-mono text-[11px] tracking-[0.1em]">
            Provenance for synthetic-data experiments
          </p>
        </div>
      </div>
    </footer>
  );
}
