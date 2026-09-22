import Link from "next/link";
import type { Metadata } from "next";
import { CreateDatasetForm } from "@/features/datasets/components/CreateDatasetForm";

export const metadata: Metadata = { title: "New dataset" };

export default function NewDatasetPage() {
  return (
    <div className="flex max-w-[520px] flex-col gap-6">
      <div>
        <Link
          href="/dashboard/datasets"
          className="mono-label text-ink-faint transition-colors hover:text-ink"
        >
          ← Datasets
        </Link>
        <h1 className="mt-2 text-[22px] font-medium tracking-[-0.01em] text-ink">New dataset</h1>
      </div>

      <CreateDatasetForm />
    </div>
  );
}
