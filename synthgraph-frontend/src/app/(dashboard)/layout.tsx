import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSession } from "@/features/auth/server/session";
import { Logo } from "@/components/navigation/Logo";
import { Sidebar } from "@/shared/layout/Sidebar";
import { Topbar } from "@/shared/layout/Topbar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  // Not a direct redirect("/login"): the cookie would still be present, so
  // the proxy's presence check would immediately bounce /login back here.
  // Routing through clear-session deletes the cookie first.
  if (!session) {
    redirect("/api/auth/clear-session?next=/login");
  }

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="flex flex-col border-r border-line">
        <div className="flex h-14 items-center border-b border-line px-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      <div className="flex flex-col">
        <Topbar email={session.user.email} />
        <main id="main" className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
