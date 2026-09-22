"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CommandEntry = { id: string; label: string; href: string; group: string };

// Static list for now - a real cross-entity search (find this specific
// project/experiment/run by name) needs a backend search endpoint that
// doesn't exist yet (only the experiments list route has a `search` param
// today). Flagged in the Phase 4 plan as a backend follow-up; this ships
// with fixed navigation shortcuts only, mirroring the Sidebar's own nav.
const COMMANDS: CommandEntry[] = [
  { id: "overview", label: "Go to Overview", href: "/dashboard", group: "Dashboard" },
  { id: "projects", label: "Go to Projects", href: "/dashboard/projects", group: "Dashboard" },
  { id: "datasets", label: "Go to Datasets", href: "/dashboard/datasets", group: "Dashboard" },
  { id: "assets", label: "Go to Assets", href: "/dashboard/assets", group: "Dashboard" },
  {
    id: "capture-completeness",
    label: "Capture Completeness report",
    href: "/dashboard/reports/capture-completeness",
    group: "Reports",
  },
  {
    id: "efficiency-leaderboard",
    label: "Efficiency Leaderboard report",
    href: "/dashboard/reports/efficiency-leaderboard",
    group: "Reports",
  },
  { id: "compare", label: "Compare generations", href: "/dashboard/compare", group: "Tools" },
  { id: "api-keys", label: "API Keys", href: "/dashboard/settings/api-keys", group: "Settings" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isTypingTarget =
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(event.target.tagName);
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (event.key === "Escape" && !isTypingTarget) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const runCommand = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const groups = Array.from(new Set(COMMANDS.map((c) => c.group)));

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className={
        open
          ? "fixed inset-0 z-[60] flex items-start justify-center bg-research-bg/70 pt-[15vh]"
          : "hidden"
      }
      shouldFilter
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-xl border border-research-border bg-research-panel shadow-2xl">
        <Command.Input
          autoFocus
          placeholder="Type a command or search..."
          className="w-full border-b border-research-border bg-transparent px-4 py-3.5 text-[14px] text-research-ink placeholder:text-research-ink-muted focus:outline-none"
        />
        <Command.List className="max-h-[360px] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-[13px] text-research-ink-muted">
            No matching command.
          </Command.Empty>
          {groups.map((group) => (
            <Command.Group
              key={group}
              heading={group}
              className="mb-1 [&_[cmdk-group-heading]]:mono-label [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-research-ink-muted"
            >
              {COMMANDS.filter((c) => c.group === group).map((command) => (
                <Command.Item
                  key={command.id}
                  value={command.label}
                  onSelect={() => runCommand(command.href)}
                  className={
                    "cursor-pointer rounded-md px-3 py-2.5 text-[13.5px] text-research-ink-secondary " +
                    "data-[selected=true]:bg-research-subtle data-[selected=true]:text-research-ink"
                  }
                >
                  {command.label}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
