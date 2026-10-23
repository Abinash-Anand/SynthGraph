"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type DashboardShellContextValue = {
  mobileOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
};

const DashboardShellContext = createContext<DashboardShellContextValue>({
  mobileOpen: false,
  openMobileMenu: () => {},
  closeMobileMenu: () => {},
});

/**
 * Owns the off-canvas sidebar's open state so things outside the shell's own
 * JSX (a guided tour that needs the sidebar visible below the xl
 * breakpoint) can open and close it without the shell having to know they
 * exist.
 */
export function DashboardShellProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const openMobileMenu = useCallback(() => setMobileOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);
  const value = useMemo(
    () => ({ mobileOpen, openMobileMenu, closeMobileMenu }),
    [mobileOpen, openMobileMenu, closeMobileMenu],
  );
  return <DashboardShellContext.Provider value={value}>{children}</DashboardShellContext.Provider>;
}

export function useDashboardShell(): DashboardShellContextValue {
  return useContext(DashboardShellContext);
}
