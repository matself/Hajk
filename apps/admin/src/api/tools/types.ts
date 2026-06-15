export interface Tool {
  id: string;
  type: string;
  title?: string | null;
  options: Record<string, unknown>;
  createdBy?: string;
  createdDate?: string;
  lastSavedBy?: string;
  lastSavedDate?: string;
  mapsCount: number;
  mapNames: string[];
}

export interface ToolType {
  type: string;
  title: string;
  description?: string | null;
}

export interface ToolTypesApiResponse {
  toolTypes: ToolType[];
  count: number;
  error: string;
  errorId: string;
}

export interface ToolCreateInput {
  type: string;
  title?: string;
  options?: Record<string, unknown>;
}

export interface ToolUpdateInput {
  type?: string;
  title?: string;
  options?: Record<string, unknown>;
  locked?: boolean;
}

export interface ToolsApiResponse {
  tools: Tool[];
  count: number;
  error: string;
  errorId: string;
}

export interface GlobalMapsApiResponse {
  maps: { name: string; id: string; locked: boolean }[];
  count: number;
  error: string;
  errorId: string;
}
