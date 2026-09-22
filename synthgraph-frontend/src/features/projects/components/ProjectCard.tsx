import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/shared/lib/format";
import type { Project } from "../types/project";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/dashboard/projects/${project.id}`}>
      <Card interactive className="p-5">
        <h3 className="text-[16px] font-medium text-ink">{project.name}</h3>
        {project.description ? (
          <p className="mt-1.5 line-clamp-2 text-[13.5px] text-ink-muted">{project.description}</p>
        ) : null}
        <p className="mt-3 font-mono text-[11px] text-ink-faint">
          Created {formatDate(project.createdAt)}
        </p>
      </Card>
    </Link>
  );
}
