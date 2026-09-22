"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function RevokeApiKeyButton({ apiKeyId, keyPrefix }: { apiKeyId: string; keyPrefix: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const onRevoke = async () => {
    setPending(true);
    try {
      await fetch(`/api/api-keys/${apiKeyId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setPending(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-ink-muted">Revoke {keyPrefix}…?</span>
        <Button size="sm" variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
          Cancel
        </Button>
        <Button size="sm" onClick={onRevoke} disabled={pending}>
          {pending ? "Revoking…" : "Confirm"}
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
      Revoke
    </Button>
  );
}
