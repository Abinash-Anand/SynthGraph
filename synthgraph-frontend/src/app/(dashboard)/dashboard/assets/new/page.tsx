import Link from "next/link";
import type { Metadata } from "next";
import { CreateAssetForm } from "@/features/assets/components/CreateAssetForm";

export const metadata: Metadata = { title: "New asset" };

export default function NewAssetPage() {
  return (
    <div className="flex max-w-[520px] flex-col gap-6">
      <div>
        <Link
          href="/dashboard/assets"
          className="mono-label text-ink-faint transition-colors hover:text-ink"
        >
          ← Assets
        </Link>
        <h1 className="mt-2 text-[22px] font-medium tracking-[-0.01em] text-ink">New asset</h1>
      </div>

      <CreateAssetForm />
    </div>
  );
}
