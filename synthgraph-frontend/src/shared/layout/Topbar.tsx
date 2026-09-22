import { LogoutButton } from "@/features/auth/components/LogoutButton";

export function Topbar({ email }: { email: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-line px-6">
      <p className="font-mono text-[12px] text-ink-muted">
        Signed in as <span className="text-ink">{email}</span>
      </p>
      <LogoutButton />
    </header>
  );
}
