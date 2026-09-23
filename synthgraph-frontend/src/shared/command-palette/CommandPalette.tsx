"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSearch } from "@/features/search/hooks/useSearch";
import type { SearchResult, SearchResultType } from "@/features/search/types/search";
import { cn } from "@/lib/utils";

type CommandEntry = { id: string; label: string; href: string; group: string };

const SEARCH_RESULT_TYPE_LABEL: Record<SearchResultType, string> = {
  project: "Project",
  experiment: "Experiment",
  dataset: "Dataset",
  asset: "Asset",
  generation: "Generation",
  trainingRun: "Training Run",
};

// Every entity type but Project/Dataset/Asset needs an ancestor id to build
// a route - a result missing one (shouldn't happen, the backend's own join
// guarantees it) is skipped rather than linked somewhere wrong.
function searchResultHref(result: SearchResult): string | null {
  switch (result.type) {
    case "project":
      return `/dashboard/projects/${result.id}`;
    case "dataset":
      return `/dashboard/datasets/${result.id}`;
    case "asset":
      return `/dashboard/assets/${result.id}`;
    case "experiment":
      return result.projectId ? `/dashboard/projects/${result.projectId}/experiments/${result.id}` : null;
    case "generation":
      return result.projectId && result.experimentId
        ? `/dashboard/projects/${result.projectId}/experiments/${result.experimentId}?entity=generation:${result.id}`
        : null;
    case "trainingRun":
      return result.projectId && result.experimentId
        ? `/dashboard/projects/${result.projectId}/experiments/${result.experimentId}?entity=run:${result.id}`
        : null;
    default:
      return null;
  }
}

// Fixed navigation shortcuts, kept alongside live search results below -
// mirrors the Sidebar's own nav rather than replacing it.
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
  { id: "best-runs", label: "Best Runs report", href: "/dashboard/reports/best-runs", group: "Reports" },
  {
    id: "training-run-search",
    label: "Training Run Search",
    href: "/dashboard/reports/training-run-search",
    group: "Reports",
  },
  { id: "compare", label: "Compare generations", href: "/dashboard/compare", group: "Tools" },
  { id: "compare-runs", label: "Compare training runs", href: "/dashboard/compare/runs", group: "Tools" },
  { id: "api-keys", label: "API Keys", href: "/dashboard/settings/api-keys", group: "Settings" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { results, isSearching } = useSearch(query);

  // Query is cleared at every point that transitions `open` to false
  // (here, Command.Dialog's own onOpenChange, and runCommand) rather than
  // reactively via a separate effect keyed on `open` - clearing state
  // directly where the transition happens is the same amount of code
  // without the cascading-render effect pattern.
  const close = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isTypingTarget =
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(event.target.tagName);
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        if (open) {
          close();
        } else {
          setOpen(true);
        }
        return;
      }
      if (event.key === "Escape" && !isTypingTarget) {
        close();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const runCommand = (href: string) => {
    close();
    router.push(href);
  };

  // cmdk's built-in fuzzy filter only ever saw the static COMMANDS list -
  // now that results also come from a live backend search, filtering is
  // done by hand (shouldFilter={false} below) so both sources agree on
  // what "matches the current query" means.
  const filteredCommands = COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));
  const groups = Array.from(new Set(filteredCommands.map((c) => c.group)));
  const showSearchResults = query.trim().length >= 2;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      label="Command palette"
      className={cn(
        "fixed inset-0 z-[60] flex items-start justify-center bg-research-bg/70 pt-[15vh]",
        "transition-opacity duration-200",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      shouldFilter={false}
    >
      <div
        className={cn(
          "w-full max-w-[560px] overflow-hidden rounded-xl border border-research-border bg-research-panel shadow-2xl",
          "transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
        )}
      >
        <Command.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder="Type a command or search..."
          className="w-full border-b border-research-border bg-transparent px-4 py-3.5 text-[14px] text-research-ink placeholder:text-research-ink-muted focus:outline-none"
        />
        <Command.List className="max-h-[360px] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-[13px] text-research-ink-muted">
            No matching command.
          </Command.Empty>
          {showSearchResults ? (
            <Command.Group
              heading="Search results"
              className="mb-1 [&_[cmdk-group-heading]]:mono-label [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-research-ink-muted"
            >
              {results.length === 0 ? (
                <div className="px-3 py-2.5 text-[13px] text-research-ink-muted">
                  {isSearching ? "Searching…" : "No matches."}
                </div>
              ) : (
                results.map((result) => {
                  const href = searchResultHref(result);
                  if (!href) return null;
                  return (
                    <Command.Item
                      key={`${result.type}:${result.id}`}
                      value={`search-${result.type}-${result.id}`}
                      onSelect={() => runCommand(href)}
                      className={
                        "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-[13.5px] text-research-ink-secondary " +
                        "data-[selected=true]:bg-research-subtle data-[selected=true]:text-research-ink"
                      }
                    >
                      <span className="mono-label shrink-0 text-research-ink-muted">
                        {SEARCH_RESULT_TYPE_LABEL[result.type]}
                      </span>
                      <span className="truncate">{result.name}</span>
                    </Command.Item>
                  );
                })
              )}
            </Command.Group>
          ) : null}
          {groups.map((group) => (
            <Command.Group
              key={group}
              heading={group}
              className="mb-1 [&_[cmdk-group-heading]]:mono-label [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-research-ink-muted"
            >
              {filteredCommands
                .filter((c) => c.group === group)
                .map((command) => (
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
