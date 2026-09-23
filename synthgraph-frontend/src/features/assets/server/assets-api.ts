import "server-only";
import { cache } from "react";
import { backendFetch } from "@/shared/http/http";
import type {
  CreateAssetRequest,
  CreateAssetVersionRequest,
  UpdateAssetRequest,
} from "../schemas/asset-schemas";
import type { Asset, AssetVersion } from "../types/asset";

export function listAssets(apiKey: string): Promise<Asset[]> {
  return backendFetch("/assets", { token: apiKey });
}

export const getAsset = cache((apiKey: string, assetId: string): Promise<Asset> => {
  return backendFetch(`/assets/${assetId}`, { token: apiKey });
});

export function createAsset(apiKey: string, input: CreateAssetRequest): Promise<Asset> {
  return backendFetch("/assets", { method: "POST", body: input, token: apiKey });
}

export function updateAsset(
  apiKey: string,
  assetId: string,
  input: UpdateAssetRequest,
): Promise<Asset> {
  return backendFetch(`/assets/${assetId}`, { method: "PATCH", body: input, token: apiKey });
}

export function archiveAsset(apiKey: string, assetId: string): Promise<{ message: string }> {
  return backendFetch(`/assets/${assetId}`, { method: "DELETE", token: apiKey });
}

export function listAssetVersions(apiKey: string, assetId: string): Promise<AssetVersion[]> {
  return backendFetch(`/assets/${assetId}/versions`, { token: apiKey });
}

export const getAssetVersion = cache(
  (apiKey: string, assetVersionId: string): Promise<AssetVersion> => {
    return backendFetch(`/asset-versions/${assetVersionId}`, { token: apiKey });
  },
);

export function createAssetVersion(
  apiKey: string,
  assetId: string,
  input: CreateAssetVersionRequest,
): Promise<AssetVersion> {
  return backendFetch(`/assets/${assetId}/versions`, {
    method: "POST",
    body: input,
    token: apiKey,
  });
}
