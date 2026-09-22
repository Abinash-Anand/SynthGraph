import "server-only";
import { cache } from "react";
import { backendFetch } from "@/shared/http/http";
import type { CreateDatasetRequest, CreateDatasetVersionRequest } from "../schemas/dataset-schemas";
import type { Dataset, DatasetVersion } from "../types/dataset";

export function listDatasets(apiKey: string): Promise<Dataset[]> {
  return backendFetch("/datasets", { token: apiKey });
}

export const getDataset = cache((apiKey: string, datasetId: string): Promise<Dataset> => {
  return backendFetch(`/datasets/${datasetId}`, { token: apiKey });
});

export function createDataset(apiKey: string, input: CreateDatasetRequest): Promise<Dataset> {
  return backendFetch("/datasets", { method: "POST", body: input, token: apiKey });
}

export function listDatasetVersions(apiKey: string, datasetId: string): Promise<DatasetVersion[]> {
  return backendFetch(`/datasets/${datasetId}/versions`, { token: apiKey });
}

export const getDatasetVersion = cache(
  (apiKey: string, datasetVersionId: string): Promise<DatasetVersion> => {
    return backendFetch(`/dataset-versions/${datasetVersionId}`, { token: apiKey });
  },
);

export function createDatasetVersion(
  apiKey: string,
  datasetId: string,
  input: CreateDatasetVersionRequest,
): Promise<DatasetVersion> {
  return backendFetch(`/datasets/${datasetId}/versions`, {
    method: "POST",
    body: input,
    token: apiKey,
  });
}
