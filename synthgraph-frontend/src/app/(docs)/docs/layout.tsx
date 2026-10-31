import type { ReactNode } from "react";
import { DocsHeader } from "@/components/docs/DocsHeader";
import { DocsSidebar } from "@/components/docs/DocsSidebar";
import "@/styles/docs.css";

// The documentation has its own shell: a top bar with search, a section
// navigation on the left, and (per page) an "On this page" rail on the right.
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DocsHeader />
      <div className="mx-auto grid max-w-[1400px] gap-x-10 px-4 md:px-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-2 lg:block">
          <DocsSidebar />
        </aside>
        <main id="main" className="min-w-0 py-8 md:py-10">
          {children}
        </main>
      </div>
    </>
  );
}
