import type { Metadata } from "next";
import { requireSession } from "@/features/auth/server/session";
import { getExperiment } from "@/features/experiments/server/experiments-api";
import { listProjects } from "@/features/projects/server/projects-api";
import { ProjectFilterField } from "@/features/reports/components/ProjectFilterField";
import { TrainingRunSearchForm } from "@/features/reports/components/TrainingRunSearchForm";
import { TrainingRunSearchResults } from "@/features/reports/components/TrainingRunSearchResults";
import { searchTrainingRuns } from "@/features/reports/server/reports-api";
import type { TrainingRunSearchField, TrainingRunSearchOperator } from "@/features/reports/types/report";

export const metadata: Metadata = { title: "Training Run Search" };

const VALID_FIELDS: TrainingRunSearchField[] = ["parameters", "metrics"];
const VALID_OPS: TrainingRunSearchOperator[] = ["gt", "gte", "lt", "lte", "eq"];

export default async function TrainingRunSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ field?: string; key?: string; op?: string; value?: string; projectId?: string }>;
}) {
  const { field, key, op, value, projectId } = await searchParams;
  const session = await requireSession();
  const projects = await listProjects(session.apiKey);

  const isValid =
    field && VALID_FIELDS.includes(field as TrainingRunSearchField) &&
    key &&
    op && VALID_OPS.includes(op as TrainingRunSearchOperator) &&
    value !== undefined && value !== "" && !Number.isNaN(Number(value));

  let projectIdByExperimentId: Record<string, string> = {};
  const result = isValid
    ? await searchTrainingRuns(session.apiKey, {
        field: field as TrainingRunSearchField,
        key: key!,
        op: op as TrainingRunSearchOperator,
        value: Number(value),
        projectId,
      }).catch(() => ({ matches: [] }))
    : null;

  if (result && result.matches.length > 0) {
    const uniqueExperimentIds = Array.from(new Set(result.matches.map((m) => m.experimentId)));
    const experiments = await Promise.all(
      uniqueExperimentIds.map((id) => getExperiment(session.apiKey, id).catch(() => null)),
    );
    projectIdByExperimentId = Object.fromEntries(
      experiments.filter((e): e is NonNullable<typeof e> => e !== null).map((e) => [e.id, e.projectId]),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-research-ink">
          Training Run Search
        </h1>
        <p className="mt-1 max-w-[62ch] text-[14px] text-research-ink-muted">
          Find training runs where a parameter or metric crosses a numeric threshold — e.g. runs with{" "}
          <code className="font-mono text-research-ink-secondary">lr &gt; 0.001</code>.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <TrainingRunSearchForm />
        <div className="max-w-[280px]">
          <ProjectFilterField projects={projects} />
        </div>
      </div>

      {result ? (
        <TrainingRunSearchResults result={result} projectIdByExperimentId={projectIdByExperimentId} />
      ) : (
        <p className="text-[13.5px] text-research-ink-muted">Enter a field, key, operator, and value to search.</p>
      )}
    </div>
  );
}
