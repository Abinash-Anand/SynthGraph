import type { ReactNode } from "react";
import { Logo } from "@/components/navigation/Logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-xl border border-line bg-surface/70 p-8">{children}</div>
      </div>
    </main>
  );
}
