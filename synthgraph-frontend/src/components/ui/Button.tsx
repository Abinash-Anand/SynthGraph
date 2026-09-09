import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "group inline-flex items-center justify-center gap-2 rounded-md font-medium " +
  "transition-[transform,background-color,border-color,color,box-shadow] duration-200 " +
  "ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] " +
  "disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-void hover:bg-white shadow-[0_1px_0_0_rgba(255,255,255,0.25)_inset] " +
    "hover:-translate-y-px",
  secondary:
    "border border-line-strong bg-surface/60 text-ink backdrop-blur-sm " +
    "hover:border-cyan/50 hover:bg-surface-2 hover:-translate-y-px",
  ghost: "text-ink-muted hover:text-ink hover:bg-surface-2",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-[14px]",
  lg: "h-12 px-6 text-[15px]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  /** Renders a chevron that eases forward on hover. */
  arrow?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  arrow,
  ...rest
}: CommonProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
      {arrow ? <Arrow /> : null}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  arrow,
  ...rest
}: CommonProps & { href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, "href">) {
  const external = href.startsWith("http");
  if (external) {
    return (
      <a
        href={href}
        className={cn(base, variants[variant], sizes[size], className)}
        rel="noreferrer noopener"
        target="_blank"
      >
        {children}
        {arrow ? <Arrow /> : null}
      </a>
    );
  }
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
      {arrow ? <Arrow /> : null}
    </Link>
  );
}

function Arrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5"
    >
      <path
        d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
