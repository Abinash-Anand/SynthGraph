"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { makeQueryClient } from "./query-client";

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState (not useMemo/module scope) - guarantees exactly one QueryClient
  // per component instance/browser session, never shared across requests on
  // the server and never recreated on re-render on the client.
  const [queryClient] = useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
