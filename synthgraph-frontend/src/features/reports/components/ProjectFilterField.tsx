"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Project } from "@/features/projects/types/project";

/** Auto-submits on change by pushing the updated `projectId` query param -
 * every param besides `projectId` is preserved, so it composes with other
 * GET-driven filters on the same page. */
export function ProjectFilterField({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get("projectId") ?? "";

  return (
    <label className="flex flex-col gap-2 text-[13.5px] text-research-ink">
      Project
      <select
        value={value}
        onChange={(event) => {
          const next = new URLSearchParams(searchParams.toString());
          if (event.target.value) next.set("projectId", event.target.value);
          else next.delete("projectId");
          router.push(`?${next.toString()}`);
        }}
        className="w-full rounded-md border border-research-border bg-research-bg px-3.5 py-2.5 text-[14px] text-research-ink focus:border-research-accent-subtle focus:outline-none"
      >
        <option value="" className="bg-research-panel text-research-ink">
          All projects
        </option>
        {projects.map((project) => (
          <option key={project.id} value={project.id} className="bg-research-panel text-research-ink">
            {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}
