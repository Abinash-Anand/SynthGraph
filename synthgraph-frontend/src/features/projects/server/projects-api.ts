import "server-only";
import { cache } from "react";
import { backendFetch } from "@/shared/http/http";
import type { CreateProjectRequest, UpdateProjectRequest } from "../schemas/project-schemas";
import type { Project } from "../types/project";

export function listProjects(apiKey: string): Promise<Project[]> {
  return backendFetch("/projects", { token: apiKey });
}

export function createProject(apiKey: string, input: CreateProjectRequest): Promise<Project> {
  return backendFetch("/projects", { method: "POST", body: input, token: apiKey });
}

// cache()'d so a page's generateMetadata and its body can both call this
// without hitting the backend twice in the same request.
export const getProject = cache((apiKey: string, projectId: string): Promise<Project> => {
  return backendFetch(`/projects/${projectId}`, { token: apiKey });
});

export function updateProject(
  apiKey: string,
  projectId: string,
  input: UpdateProjectRequest,
): Promise<Project> {
  return backendFetch(`/projects/${projectId}`, { method: "PATCH", body: input, token: apiKey });
}

// Soft-delete (archive) - the backend's DELETE route, not a real row
// delete. See the backend's own archived_at migration/entity comments.
export function archiveProject(apiKey: string, projectId: string): Promise<{ message: string }> {
  return backendFetch(`/projects/${projectId}`, { method: "DELETE", token: apiKey });
}
