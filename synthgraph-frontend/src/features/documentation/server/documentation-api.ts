import "server-only";
import { cache } from "react";
import { backendFetch } from "@/shared/http/http";

/**
 * Raw Markdown text (Content-Type: text/markdown). `backendFetch` already
 * handles non-JSON text responses unmodified — it does response.text()
 * then a JSON.parse-with-raw-string-fallback, so no changes were needed
 * to the shared HTTP client for this endpoint.
 */
export const getGenerationDocumentation = cache(
  (apiKey: string, generationId: string): Promise<string> => {
    return backendFetch(`/generations/${generationId}/documentation`, { token: apiKey });
  },
);
