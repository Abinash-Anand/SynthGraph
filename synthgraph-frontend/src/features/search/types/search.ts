export type SearchResultType =
  | "project"
  | "experiment"
  | "dataset"
  | "asset"
  | "generation"
  | "trainingRun";

export type SearchResult = {
  type: SearchResultType;
  id: string;
  name: string;
  projectId: string | null;
  experimentId: string | null;
  createdAt: string;
};

export type SearchResponse = { results: SearchResult[] };
