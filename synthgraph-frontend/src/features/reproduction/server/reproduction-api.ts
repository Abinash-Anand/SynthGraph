import "server-only";
import { cache } from "react";
import { backendFetch } from "@/shared/http/http";
import type { ReproductionManifest } from "../types/reproduction-manifest";

export const getReproductionManifest = cache(
  (apiKey: string, generationId: string): Promise<ReproductionManifest> => {
    return backendFetch(`/generations/${generationId}/reproduction-manifest`, { token: apiKey });
  },
);
