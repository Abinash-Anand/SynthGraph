import "server-only";
import { cache } from "react";
import { backendFetch } from "@/shared/http/http";
import type { CreateProjectRequest } from "../schemas/project-schemas";
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
