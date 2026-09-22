import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/features/auth/server/session";
import { DashboardShell } from "@/shared/layout/DashboardShell";
import { QueryProvider } from "@/shared/query/QueryProvider";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  // Not a direct redirect("/login"): the cookie would still be present, so
  // the proxy's presence check would immediately bounce /login back here.
  // Routing through clear-session deletes the cookie first.
  if (!session) {
    redirect("/api/auth/clear-session?next=/login");
  }

  return (
    <QueryProvider>
      <DashboardShell email={session.user.email}>{children}</DashboardShell>
    </QueryProvider>
  );
}
