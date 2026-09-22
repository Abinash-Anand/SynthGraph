"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ApiKeyCreated } from "../types/api-key";

type CreateResponse = { ok: boolean; error?: string; apiKey?: ApiKeyCreated };

export function CreateApiKeyButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCreate = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/api-keys", { method: "POST" });
      const body = (await response.json()) as CreateResponse;
      if (!response.ok || !body.ok || !body.apiKey) {
        setError(body.error ?? "Could not create a new API key.");
        return;
      }
      setCreated(body.apiKey);
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  const onCopy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const onDismiss = () => {
    setCreated(null);
    router.refresh();
  };

  if (created) {
    return (
      <div className="rounded-lg border border-ok/35 bg-ok/5 p-4">
        <p className="text-[14px] text-ink">
          New API key created. Copy it now — it will not be shown again.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-md border border-line bg-base/60 px-3 py-2 font-mono text-[12.5px] text-ink">
            {created.key}
          </code>
          <Button size="sm" variant="secondary" onClick={onCopy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <Button size="sm" variant="ghost" onClick={onDismiss} className="mt-3">
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-[13.5px] text-bad">{error}</p> : null}
      <Button size="sm" onClick={onCreate} disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create API key"}
      </Button>
    </div>
  );
}
