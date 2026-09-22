import type { Metadata } from "next";
import { CreateApiKeyButton } from "@/features/api-keys/components/CreateApiKeyButton";
import { RevokeApiKeyButton } from "@/features/api-keys/components/RevokeApiKeyButton";
import { listApiKeys } from "@/features/api-keys/server/api-keys-api";
import { requireSession } from "@/features/auth/server/session";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/shared/lib/format";
import { EmptyState } from "@/shared/ui/EmptyState";

export const metadata: Metadata = { title: "API Keys" };

export default async function ApiKeysPage() {
  const session = await requireSession();
  const keys = await listApiKeys(session.apiKey);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-medium tracking-[-0.01em] text-ink">API Keys</h1>
        <p className="mt-1 max-w-[62ch] text-[14px] text-ink-muted">
          Use an API key to authenticate the SynthGraph SDK or CLI. Every sign-in to this dashboard
          also creates a key here, to run your session — revoke any you don&apos;t recognize.
        </p>
      </div>

      <CreateApiKeyButton />

      {keys.length === 0 ? (
        <EmptyState title="No API keys yet" />
      ) : (
        <div className="flex flex-col gap-2">
          {keys.map((key) => (
            <Card key={key.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="font-mono text-[13.5px] text-ink">{key.keyPrefix}…</p>
                <p className="mt-0.5 text-[12px] text-ink-faint">
                  Created {formatDateTime(key.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {key.revokedAt ? (
                  <Badge tone="neutral">Revoked</Badge>
                ) : (
                  <RevokeApiKeyButton apiKeyId={key.id} keyPrefix={key.keyPrefix} />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
