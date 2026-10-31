"use client";

import { useRef, useState, type ReactNode } from "react";

/** Wraps a highlighted code block (a <pre>) and adds a copy button. */
export function DocsCode({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    const text = ref.current?.querySelector("pre")?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // Clipboard access can be refused (insecure context, permissions).
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 1800);
  }

  return (
    <div ref={ref} className="docs-code">
      {children}
      <button type="button" className="docs-code-copy" onClick={copy} aria-live="polite">
        {state === "copied" ? "Copied" : state === "failed" ? "Press Ctrl+C" : "Copy"}
      </button>
    </div>
  );
}
