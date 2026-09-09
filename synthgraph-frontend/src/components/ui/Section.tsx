import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  id,
  children,
  className,
  bordered = true,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative py-24 md:py-32",
        bordered && "border-t border-line",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  lede,
  align = "left",
  className,
  titleClassName,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  className?: string;
  /** Override the measure when a title carries its own line breaks. */
  titleClassName?: string;
  children?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? <p className="mono-label">{eyebrow}</p> : null}
      <h2
        className={cn(
          "text-[32px] leading-[1.08] font-medium tracking-[-0.02em] md:text-[46px]",
          "max-w-[18ch] text-gradient-ink md:max-w-[22ch]",
          align === "center" && "mx-auto",
          titleClassName,
        )}
      >
        {title}
      </h2>
      {lede ? (
        <p
          className={cn(
            "max-w-[62ch] text-[17px] leading-[1.65] text-ink-muted md:text-[19px]",
            align === "center" && "mx-auto",
          )}
        >
          {lede}
        </p>
      ) : null}
      {children}
    </header>
  );
}
