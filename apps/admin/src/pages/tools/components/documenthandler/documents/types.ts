export interface DocTreeNode {
  id: string;
  kind: "folder" | "document";
  name: string;
  title: string;
  /** Populated for document nodes — the parent folder's name. */
  folderName?: string;
  /** Populated for folder nodes — current document count. */
  docCount?: number;
  children?: DocTreeNode[];
}
