import type { Chapter } from "./chapter-editor-panel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChapterTreeNodeData {
  header: string;
  headerIdentifier: string;
  html: string;
  keywords: unknown[];
  geoObjects: unknown[];
}

export interface ChapterTreeNode {
  id: string;
  data: ChapterTreeNodeData;
  children: ChapterTreeNode[];
}

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

export function toChapterTree(chapters: Chapter[]): ChapterTreeNode[] {
  return chapters.map((chapter) => toChapterNode(chapter));
}

function toChapterNode(chapter: Chapter): ChapterTreeNode {
  return {
    id: crypto.randomUUID(),
    data: {
      header: chapter.header,
      headerIdentifier: chapter.headerIdentifier,
      html: chapter.html,
      keywords: chapter.keywords ?? [],
      geoObjects: chapter.geoObjects ?? [],
    },
    children: Array.isArray(chapter.chapters)
      ? chapter.chapters.map((child) => toChapterNode(child))
      : [],
  };
}

export function fromChapterTree(nodes: ChapterTreeNode[]): Chapter[] {
  return nodes.map((node) => fromChapterNode(node));
}

function fromChapterNode(node: ChapterTreeNode): Chapter {
  return {
    header: node.data.header,
    headerIdentifier: node.data.headerIdentifier,
    html: node.data.html,
    keywords: node.data.keywords,
    geoObjects: node.data.geoObjects,
    chapters: fromChapterTree(node.children),
  };
}

// ---------------------------------------------------------------------------
// Node creation
// ---------------------------------------------------------------------------

export function slugifyHeaderIdentifier(title: string): string {
  return title
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function createChapterNode(
  header: string,
  headerIdentifier?: string
): ChapterTreeNode {
  const trimmed = header.trim();
  return {
    id: crypto.randomUUID(),
    data: {
      header: trimmed,
      headerIdentifier: headerIdentifier ?? slugifyHeaderIdentifier(trimmed),
      html: "",
      keywords: [],
      geoObjects: [],
    },
    children: [],
  };
}

// ---------------------------------------------------------------------------
// Tree mutation helpers
// ---------------------------------------------------------------------------

export function findNodeById(
  nodes: ChapterTreeNode[],
  id: string
): ChapterTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}

export function updateNodeById(
  nodes: ChapterTreeNode[],
  id: string,
  updater: (node: ChapterTreeNode) => ChapterTreeNode
): ChapterTreeNode[] {
  return nodes.map((node) => {
    if (node.id === id) return updater(node);
    return { ...node, children: updateNodeById(node.children, id, updater) };
  });
}

export function removeNodeById(
  nodes: ChapterTreeNode[],
  id: string
): ChapterTreeNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeNodeById(node.children, id) }));
}

function insertIntoParent(
  nodes: ChapterTreeNode[],
  parentId: string,
  index: number,
  toInsert: ChapterTreeNode[]
): ChapterTreeNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      const newChildren = [...node.children];
      newChildren.splice(index, 0, ...toInsert);
      return { ...node, children: newChildren };
    }
    return {
      ...node,
      children: insertIntoParent(node.children, parentId, index, toInsert),
    };
  });
}

export function moveNodes(
  tree: ChapterTreeNode[],
  dragIds: string[],
  parentId: string | null,
  index: number
): ChapterTreeNode[] {
  const dragged = dragIds
    .map((id) => findNodeById(tree, id))
    .filter((n): n is ChapterTreeNode => n !== null);

  let next = tree;
  for (const n of dragged) {
    next = removeNodeById(next, n.id);
  }

  if (parentId === null) {
    const root = [...next];
    root.splice(index, 0, ...dragged);
    return root;
  }

  return insertIntoParent(next, parentId, index, dragged);
}

export function addChildNode(
  tree: ChapterTreeNode[],
  parentId: string | null,
  newNode: ChapterTreeNode
): ChapterTreeNode[] {
  if (parentId === null) {
    return [...tree, newNode];
  }
  return tree.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...node.children, newNode] };
    }
    return {
      ...node,
      children: addChildNode(node.children, parentId, newNode),
    };
  });
}
