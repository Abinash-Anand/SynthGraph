import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The mark is the product: four records and the edges between them.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <path
        d="M5 6.5 12 11l7-4.5M5 6.5V17l7 4.5m0 0L19 17V6.5M12 11v10.5"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="6.5" r="2" className="fill-cyan" />
      <circle cx="19" cy="6.5" r="2" className="fill-blue" />
      <circle cx="5" cy="17" r="2" className="fill-ink-dim" />
      <circle cx="19" cy="17" r="2" className="fill-ok" />
      <circle cx="12" cy="11" r="1.6" className="fill-ink" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2.5 text-ink transition-opacity duration-200 hover:opacity-80",
        className,
      )}
    >
      <LogoMark />
      <span className="text-[15px] font-medium tracking-[-0.01em]">SynthGraph</span>
    </Link>
  );
}
