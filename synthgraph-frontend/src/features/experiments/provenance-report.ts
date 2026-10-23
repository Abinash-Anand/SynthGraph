// A plain-text record of what an experiment's provenance looks like, for
// attaching to a review, a model card or an audit. Built from data already
// on the page - no new backend call - and deterministic: `generatedAt` is
// passed in rather than read from the clock.
import {
  GRADE_LABEL,
  type ReproAssessment,
  summarizeReproducibility,
} from "./reproducibility-model.ts";

export type ProvenanceInput = {
  generatedAt: string;
  experiment: { id: string; name: string; description?: string | null };
  generations: Array<{
    id: string;
    name: string;
    status: string;
    generatorName: string;
    generatorVersion?: string;
    createdAt: string;
    inputCount: number;
    outputCount: number;
    assessment: ReproAssessment;
  }>;
  runs: Array<{
    id: string;
    name: string;
    status: string;
    trainerName: string;
    trainerVersion?: string;
    captureStatus: string | null;
    datasetVersions: string[];
    evaluationCount: number;
  }>;
};

// A pipe or newline in a name would break out of its table cell.
function cell(value: string | number | null | undefined): string {
  return String(value ?? "—").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function percent(score: number | null): string {
  return score === null ? "—" : `${Math.round(score * 100)}%`;
}

export function buildProvenanceMarkdown(input: ProvenanceInput): string {
  const { experiment, generations, runs } = input;
  const summary = summarizeReproducibility(generations.map((g) => g.assessment));
  const lines: string[] = [];

  lines.push(`# Provenance report: ${experiment.name}`, "");
  lines.push(`Experiment \`${experiment.id}\` · generated ${input.generatedAt}`, "");
  if (experiment.description) lines.push(experiment.description, "");

  lines.push("## Summary", "");
  lines.push(`- Generations: ${generations.length}`);
  if (generations.length > 0) {
    lines.push(
      `- Reproducibility: ${summary.byGrade.reproducible} reproducible, ${summary.byGrade.mostly} mostly, ` +
        `${summary.byGrade.partial} partly, ${summary.byGrade.unknown} unknown (average ${percent(summary.averageScore)} of fields recorded)`,
    );
  }
  lines.push(`- Training runs: ${runs.length}`);
  const incomplete = runs.filter((r) => r.captureStatus !== "complete").length;
  if (runs.length > 0) lines.push(`- Runs without complete capture: ${incomplete}`);
  lines.push("");

  lines.push("## Generations", "");
  if (generations.length === 0) {
    lines.push("None recorded.", "");
  } else {
    lines.push("| Generation | Status | Generator | Inputs | Outputs | Reproducibility | Recorded |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");
    for (const g of generations) {
      lines.push(
        `| ${cell(g.name)} | ${cell(g.status)} | ${cell(g.generatorName + (g.generatorVersion ? ` ${g.generatorVersion}` : ""))} ` +
          `| ${g.inputCount} | ${g.outputCount} | ${GRADE_LABEL[g.assessment.grade]} | ${percent(g.assessment.score)} |`,
      );
    }
    lines.push("");

    const withIssues = generations.filter((g) => g.assessment.blockers.length > 0 || g.assessment.notes.length > 0);
    if (withIssues.length > 0) {
      lines.push("### Issues", "");
      for (const g of withIssues) {
        lines.push(`**${cell(g.name)}**`, "");
        for (const blocker of g.assessment.blockers) lines.push(`- Blocker: ${blocker}`);
        for (const note of g.assessment.notes) lines.push(`- ${note}`);
        lines.push("");
      }
    }
  }

  lines.push("## Training runs", "");
  if (runs.length === 0) {
    lines.push("None recorded.", "");
  } else {
    lines.push("| Run | Status | Trainer | Capture | Dataset versions | Evaluations |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const r of runs) {
      lines.push(
        `| ${cell(r.name)} | ${cell(r.status)} | ${cell(r.trainerName + (r.trainerVersion ? ` ${r.trainerVersion}` : ""))} ` +
          `| ${cell(r.captureStatus ?? "not reported")} | ${cell(r.datasetVersions.length > 0 ? r.datasetVersions.join(", ") : "none linked")} | ${r.evaluationCount} |`,
      );
    }
    lines.push("");
  }

  lines.push("## What this report is", "");
  lines.push(
    "This lists what was *recorded*. It does not verify that referenced data still exists, that files match a " +
      "checksum, or that rerunning the code would reproduce the result. \"Reproducible\" means the fields needed to " +
      "attempt a rebuild were captured and nothing known blocks it.",
    "",
  );
  return lines.join("\n");
}

/** A filename-safe slug so the download is named after the experiment. */
export function reportFilename(experimentName: string, extension: "md" | "json"): string {
  const slug = experimentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "experiment"}-provenance.${extension}`;
}
