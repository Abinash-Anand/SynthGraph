import type { Metadata } from "next";
import { requireSession } from "@/features/auth/server/session";
import { CaptureCompletenessView } from "@/features/reports/components/CaptureCompletenessView";
import { getCaptureCompletenessReport } from "@/features/reports/server/reports-api";

export const metadata: Metadata = { title: "Capture Completeness" };

export default async function CaptureCompletenessPage() {
  const session = await requireSession();
  const report = await getCaptureCompletenessReport(session.apiKey);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-ink">Capture Completeness</h1>
        <p className="mt-1 max-w-[62ch] text-[14px] text-ink-muted">
          How much of your training runs&apos; provenance actually made it to the backend — and which
          integrations most often stay attached but never get closed out.
        </p>
      </div>

      <CaptureCompletenessView report={report} />
    </div>
  );
}
