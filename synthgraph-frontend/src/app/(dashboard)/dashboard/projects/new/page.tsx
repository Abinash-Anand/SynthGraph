import Link from "next/link";
import type { Metadata } from "next";
import { CreateProjectForm } from "@/features/projects/components/CreateProjectForm";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <div className="flex max-w-[520px] flex-col gap-6">
      <div>
        <Link
          href="/dashboard/projects"
          className="mono-label text-ink-faint transition-colors hover:text-ink"
        >
          ← Projects
        </Link>
        <h1 className="mt-2 text-[22px] font-medium tracking-[-0.01em] text-ink">New project</h1>
      </div>

      <CreateProjectForm />
    </div>
  );
}
