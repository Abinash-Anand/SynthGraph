"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import {
  compareGenerationsSchema,
  parseGenerationIdsInput,
} from "@/features/comparisons/schemas/comparison-schemas";

export function GenerationIdsForm({
  prefill,
  error: externalError,
}: {
  prefill?: string[];
  error?: string;
}) {
  const router = useRouter();
  const [raw, setRaw] = useState(prefill?.join("\n") ?? "");
  const [error, setError] = useState<string | null>(externalError ?? null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const ids = parseGenerationIdsInput(raw);
    const parsed = compareGenerationsSchema.safeParse({ generationIds: ids });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the IDs you entered.");
      return;
    }

    router.push(`/dashboard/compare?ids=${parsed.data.generationIds.join(",")}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-bad/40 bg-bad/[0.05] p-4 text-[14px] text-ink"
        >
          {error}
        </div>
      ) : null}

      <TextArea
        label="Generation IDs"
        hint="Paste generation IDs — one per line, or comma-separated. 2 to 10 generations."
        required
        rows={5}
        value={raw}
        onChange={setRaw}
        placeholder={"generation-id-1\ngeneration-id-2"}
      />

      <Button type="submit" size="lg" className="self-start">
        Compare
      </Button>
    </form>
  );
}
