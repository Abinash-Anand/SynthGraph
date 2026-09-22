import Link from "next/link";
import { formatDate } from "@/shared/lib/format";
import { ResearchCard } from "@/shared/ui/ResearchCard";
import type { Experiment } from "../types/experiment";

export function ExperimentRow({ projectId, experiment }: { projectId: string; experiment: Experiment }) {
  return (
    <Link href={`/dashboard/projects/${projectId}/experiments/${experiment.id}`}>
      <ResearchCard interactive className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-medium text-research-ink">{experiment.name}</p>
          {experiment.description ? (
            <p className="mt-0.5 truncate text-[13px] text-research-ink-muted">
              {experiment.description}
            </p>
          ) : null}
        </div>
        <p className="shrink-0 font-mono text-[11px] text-research-ink-muted">
          {formatDate(experiment.createdAt)}
        </p>
      </ResearchCard>
    </Link>
  );
}
