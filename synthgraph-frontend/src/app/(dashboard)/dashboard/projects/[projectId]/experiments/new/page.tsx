import Link from "next/link";
import type { Metadata } from "next";
import { CreateExperimentForm } from "@/features/experiments/components/CreateExperimentForm";

export const metadata: Metadata = { title: "New experiment" };

export default async function NewExperimentPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="flex max-w-[520px] flex-col gap-6">
      <div>
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="mono-label text-ink-faint transition-colors hover:text-ink"
        >
          ← Project
        </Link>
        <h1 className="mt-2 text-[22px] font-medium tracking-[-0.01em] text-ink">New experiment</h1>
      </div>

      <CreateExperimentForm projectId={projectId} />
    </div>
  );
}
