"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "Projects", href: "/dashboard/projects" },
  { label: "Datasets", href: "/dashboard/datasets" },
  { label: "Assets", href: "/dashboard/assets" },
];

// No owning entity, so it doesn't fit under Dashboard or Settings.
const TOOLS_ITEMS: NavItem[] = [{ label: "Compare", href: "/dashboard/compare" }];

const SETTINGS_ITEMS: NavItem[] = [{ label: "API Keys", href: "/dashboard/settings/api-keys" }];

// Training Runs and Evaluation Results have no flat "list all" backend
// endpoint (only nested under an Experiment / a Training Run respectively),
// so they intentionally have no top-level nav entry — reachable only via
// drill-down, the same way Generations already work.

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <nav aria-label="Dashboard" className="flex h-full flex-col gap-8 p-5">
      <div>
        <p className="mono-label mb-2 px-2">Dashboard</p>
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </ul>
      </div>

      <div>
        <p className="mono-label mb-2 px-2">Tools</p>
        <ul className="flex flex-col gap-0.5">
          {TOOLS_ITEMS.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </ul>
      </div>

      <div>
        <p className="mono-label mb-2 px-2">Settings</p>
        <ul className="flex flex-col gap-0.5">
          {SETTINGS_ITEMS.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </ul>
      </div>
    </nav>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "block rounded-md px-2 py-2 text-[14px] transition-colors duration-200",
          active ? "bg-surface-2 text-ink" : "text-ink-muted hover:bg-surface-2/60 hover:text-ink",
        )}
      >
        {item.label}
      </Link>
    </li>
  );
}
