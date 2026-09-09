"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "@/hooks/useInView";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

type Language = "python" | "json" | "bash" | "text";

type CodeBlockProps = {
  code: string;
  language?: Language;
  filename?: string;
  /** Reveals the block line by line as it scrolls into view. */
  animate?: boolean;
  className?: string;
  showLineNumbers?: boolean;
};

/**
 * A small, dependency-free highlighter.
 *
 * The site shows short, controlled snippets, so a full syntax-highlighting
 * library would cost far more bytes than it earns. Tokens are matched in one
 * pass and escaped before insertion.
 */
const PATTERNS: Record<Language, Array<{ re: RegExp; cls: string }>> = {
  python: [
    { re: /(#[^\n]*)/g, cls: "text-ink-faint italic" },
    { re: /("""[\s\S]*?"""|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, cls: "text-ok" },
    {
      re: /\b(from|import|as|def|class|return|with|for|in|if|else|elif|None|True|False|await|async|try|except|raise)\b/g,
      cls: "text-blue",
    },
    { re: /\b(\d+\.?\d*)\b/g, cls: "text-warn" },
    { re: /([A-Za-z_][A-Za-z0-9_]*)(?=\()/g, cls: "text-cyan" },
  ],
  json: [
    { re: /("(?:[^"\\]|\\.)*")(\s*:)/g, cls: "text-cyan" },
    { re: /("(?:[^"\\]|\\.)*")/g, cls: "text-ok" },
    { re: /\b(true|false|null)\b/g, cls: "text-blue" },
    { re: /\b(-?\d+\.?\d*)\b/g, cls: "text-warn" },
  ],
  bash: [
    { re: /(#[^\n]*)/g, cls: "text-ink-faint italic" },
    { re: /^(\$)/gm, cls: "text-ink-faint" },
    { re: /\b(pip|python3?|export|npm|curl)\b/g, cls: "text-cyan" },
    { re: /(--?[a-zA-Z][\w-]*)/g, cls: "text-blue" },
  ],
  text: [],
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlight(line: string, language: Language): string {
  const escaped = escapeHtml(line);
  const rules = PATTERNS[language];
  if (rules.length === 0) return escaped;

  // Collect non-overlapping matches, first rule wins.
  type Token = { start: number; end: number; cls: string };
  const tokens: Token[] = [];
  for (const rule of rules) {
    rule.re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.re.exec(escaped)) !== null) {
      const start = match.index + (match[0].length - (match[1] ?? match[0]).length);
      const text = match[1] ?? match[0];
      const end = start + text.length;
      if (text.length === 0) continue;
      const overlaps = tokens.some((token) => start < token.end && end > token.start);
      if (!overlaps) tokens.push({ start, end, cls: rule.cls });
    }
  }

  tokens.sort((a, b) => a.start - b.start);
  let result = "";
  let cursor = 0;
  for (const token of tokens) {
    if (token.start < cursor) continue;
    result += escaped.slice(cursor, token.start);
    result += `<span class="${token.cls}">${escaped.slice(token.start, token.end)}</span>`;
    cursor = token.end;
  }
  result += escaped.slice(cursor);
  return result;
}

export function CodeBlock({
  code,
  language = "python",
  filename,
  animate = false,
  className,
  showLineNumbers = false,
}: CodeBlockProps) {
  const lines = useMemo(() => code.split("\n"), [code]);
  const highlighted = useMemo(
    () => lines.map((line) => highlight(line, language)),
    [lines, language],
  );
  const [copied, setCopied] = useState(false);
  const [revealedLines, setRevealedLines] = useState(0);
  const [ref, inView] = useInView<HTMLDivElement>({ once: true, rootMargin: "-80px" });
  const reducedMotion = useReducedMotion();
  const timer = useRef<number | null>(null);

  // Everything is visible unless this block opted into the reveal — and a
  // reduced-motion visitor always gets the finished state.
  const visibleLines = !animate || reducedMotion ? lines.length : revealedLines;

  useEffect(() => {
    if (!animate || reducedMotion || !inView) return;

    let current = 0;
    const step = () => {
      current += 1;
      setRevealedLines(current);
      if (current < lines.length) {
        timer.current = window.setTimeout(step, 42);
      }
    };
    timer.current = window.setTimeout(step, 160);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [animate, inView, lines.length, reducedMotion]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "group relative overflow-hidden rounded-lg border border-line bg-[#08090d]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-line bg-surface/40 px-4 py-2.5">
        <span className="font-mono text-[11px] tracking-[0.1em] text-ink-dim">
          {filename ?? language}
        </span>
        <button
          type="button"
          onClick={copy}
          className={cn(
            "rounded border border-line-strong px-2.5 py-1 font-mono text-[10px]",
            "tracking-[0.12em] uppercase transition-colors duration-200",
            copied ? "border-ok/40 text-ok" : "text-ink-dim hover:border-cyan/40 hover:text-ink",
          )}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre className="overflow-x-auto p-4 text-[13px] leading-[1.75] md:text-[13.5px]">
        <code className="font-mono">
          {highlighted.map((line, index) => (
            <span
              key={index}
              className={cn(
                "block transition-opacity duration-300",
                index < visibleLines ? "opacity-100" : "opacity-0",
              )}
            >
              {showLineNumbers ? (
                <span className="mr-4 inline-block w-6 text-right text-ink-faint select-none">
                  {index + 1}
                </span>
              ) : null}
              <span dangerouslySetInnerHTML={{ __html: line || "&nbsp;" }} />
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
