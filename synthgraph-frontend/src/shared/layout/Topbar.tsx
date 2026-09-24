import { LogoutButton } from "@/features/auth/components/LogoutButton";

export function Topbar({
  email,
  onOpenMenu,
}: {
  email: string;
  onOpenMenu?: () => void;
}) {
  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-line px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onOpenMenu ? (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open menu"
            aria-controls="dashboard-sidebar"
            className="grid size-8 shrink-0 place-items-center rounded-md text-ink-muted hover:text-ink xl:hidden"
          >
            <MenuIcon />
          </button>
        ) : null}
        <p className="truncate font-mono text-[12px] text-ink-muted">
          Signed in as <span className="text-ink">{email}</span>
        </p>
      </div>
      <LogoutButton />
    </header>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M2.5 5h13M2.5 9h13M2.5 13h13"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
