import { ButtonLink } from "@/components/ui/Button";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-line bg-surface/50 p-6">
      <p className="mono-label">Not found</p>
      <p className="text-[15px] text-ink">
        This isn&apos;t here, or it isn&apos;t yours to see.
      </p>
      <ButtonLink href="/dashboard" size="sm" variant="secondary">
        Back to overview
      </ButtonLink>
    </div>
  );
}
