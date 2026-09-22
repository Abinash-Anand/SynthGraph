"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyableId({ id, className }: { id: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-line px-2.5 py-1",
        "font-mono text-[11px] text-ink-faint transition-colors duration-200 hover:border-cyan/40 hover:text-ink",
        className,
      )}
    >
      <span>ID: {id}</span>
      <span className={copied ? "text-ok" : undefined}>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
