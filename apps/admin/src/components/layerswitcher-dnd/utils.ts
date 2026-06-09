import type { SxProps, Theme } from "@mui/material";
import { useDndMonitor } from "@dnd-kit/core";
import { TreeItems, TreeItem } from "dnd-kit-sortable-tree";
import {
  ItemType,
  TreeItemData,
  ID_DELIMITER,
  ITEM_CAPABILITIES,
} from "./types";

export type ReorderDropPosition = "above" | "below";

export const getDropLineSx = (isDarkMode: boolean, edge: "top" | "bottom") => ({
  position: "absolute" as const,
  ...(edge === "top" ? { top: 0 } : { bottom: 0 }),
  left: 0,
  right: 0,
  height: "2px",
  backgroundColor: isDarkMode ? "#42a5f5" : "#1976d2",
  zIndex: 10,
  pointerEvents: "none" as const,
  boxShadow: `0 0 4px ${isDarkMode ? "#42a5f5" : "#1976d2"}`,
});

export const treeDragActiveIdRef = { current: null as string | null };

/** Track the item currently being dragged inside a SortableTree. */
export const useTrackTreeDragActiveId = () => {
  useDndMonitor({
    onDragStart(event) {
      treeDragActiveIdRef.current = event.active.id.toString();
    },
    onDragEnd() {
      treeDragActiveIdRef.current = null;
    },
    onDragCancel() {
      treeDragActiveIdRef.current = null;
    },
  });
};

export const flattenTreeItemIds = <T extends { id: unknown; children?: T[] }>(
  items: T[],
): string[] => {
  const ids: string[] = [];
  const visit = (nodes: T[]) => {
    for (const node of nodes) {
      ids.push(node.id.toString());
      if (node.children?.length) {
        visit(node.children);
      }
    }
  };
  visit(items);
  return ids;
};

/** Drop edge from list order: dragging down → below target, dragging up → above. */
export const getReorderDropPosition = (
  targetItemId: string,
  activeDragId: string | null,
  flattenedIds: readonly string[],
  isReorderTarget: boolean,
): ReorderDropPosition | null => {
  if (!isReorderTarget || !activeDragId || activeDragId === targetItemId) {
    return null;
  }

  const dragIndex = flattenedIds.indexOf(activeDragId);
  const targetIndex = flattenedIds.indexOf(targetItemId);
  if (dragIndex === -1 || targetIndex === -1) {
    return null;
  }

  return dragIndex < targetIndex ? "below" : "above";
};

/** Up to two lines of item text, clamped with ellipsis when longer. */
export const DND_ITEM_TITLE_SX: SxProps<Theme> = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  wordBreak: "break-word",
};

// Parse source ID: "source::type::actualId" -> { type, id }
export const parseSourceId = (
  sourceId: string
): { type: ItemType; id: string } | null => {
  if (!sourceId.startsWith(`source${ID_DELIMITER}`)) return null;
  const withoutPrefix = sourceId.slice(`source${ID_DELIMITER}`.length);
  const delimIndex = withoutPrefix.indexOf(ID_DELIMITER);
  if (delimIndex === -1) return null;
  const type = withoutPrefix.slice(0, delimIndex) as ItemType;
  const id = withoutPrefix.slice(delimIndex + ID_DELIMITER.length);
  return { type, id };
};

// Create source ID from type and item id
export const createSourceId = (type: ItemType, id: string): string =>
  `source${ID_DELIMITER}${type}${ID_DELIMITER}${id}`;

// Enforce item rules (canHaveChildren based on type)
export const enforceItemRules = (
  treeItems: TreeItems<TreeItemData>
): TreeItems<TreeItemData> =>
  treeItems.map((item) => ({
    ...item,
    canHaveChildren: ITEM_CAPABILITIES[item.type].canHaveChildren,
    children: ITEM_CAPABILITIES[item.type].canHaveChildren
      ? item.children
        ? enforceItemRules(item.children)
        : item.children
      : undefined,
  }));

// Collect all item IDs from tree(s)
export const collectItemIds = (
  nodes: TreeItems<TreeItemData>,
  acc = new Set<string>()
): Set<string> => {
  nodes.forEach((n) => {
    acc.add(n.id);
    if (n.children) collectItemIds(n.children, acc);
  });
  return acc;
};

// Find a group node by ID in a tree
export const findGroupInTree = (
  nodes: TreeItems<TreeItemData>,
  targetId: string
): TreeItem<TreeItemData> | null => {
  for (const node of nodes) {
    if (node.id === targetId && node.type === "group") return node;
    if (node.children) {
      const found = findGroupInTree(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
};

// Insert item into a group within a tree
export const insertIntoGroup = (
  nodes: TreeItems<TreeItemData>,
  targetId: string,
  newItem: TreeItem<TreeItemData>
): TreeItems<TreeItemData> =>
  nodes.map((node) => {
    if (node.id === targetId && node.type === "group") {
      return {
        ...node,
        children: [...(node.children ?? []), newItem],
      };
    }
    if (node.children) {
      return {
        ...node,
        children: insertIntoGroup(node.children, targetId, newItem),
      };
    }
    return node;
  });

// Move item up within its sibling list
export const moveItemUp = (
  nodes: TreeItems<TreeItemData>,
  itemId: string
): TreeItems<TreeItemData> => {
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i].id === itemId) {
      const newNodes = [...nodes];
      [newNodes[i - 1], newNodes[i]] = [newNodes[i], newNodes[i - 1]];
      return newNodes;
    }
  }
  return nodes.map((node) =>
    node.children
      ? { ...node, children: moveItemUp(node.children, itemId) }
      : node
  );
};

// Move item down within its sibling list
export const moveItemDown = (
  nodes: TreeItems<TreeItemData>,
  itemId: string
): TreeItems<TreeItemData> => {
  for (let i = 0; i < nodes.length - 1; i++) {
    if (nodes[i].id === itemId) {
      const newNodes = [...nodes];
      [newNodes[i], newNodes[i + 1]] = [newNodes[i + 1], newNodes[i]];
      return newNodes;
    }
  }
  return nodes.map((node) =>
    node.children
      ? { ...node, children: moveItemDown(node.children, itemId) }
      : node
  );
};

// Check if item can move up
export const canItemMoveUp = (
  nodes: TreeItems<TreeItemData>,
  itemId: string
): boolean => {
  const findPosition = (items: TreeItems<TreeItemData>): number | null => {
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === itemId) return i;
      if (items[i].children) {
        const pos = findPosition(items[i].children!);
        if (pos !== null) return pos;
      }
    }
    return null;
  };
  const pos = findPosition(nodes);
  return pos !== null && pos > 0;
};

// Check if item can move down
export const canItemMoveDown = (
  nodes: TreeItems<TreeItemData>,
  itemId: string
): boolean => {
  const findPositionAndLength = (
    items: TreeItems<TreeItemData>
  ): { index: number; length: number } | null => {
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === itemId) return { index: i, length: items.length };
      if (items[i].children) {
        const result = findPositionAndLength(items[i].children!);
        if (result) return result;
      }
    }
    return null;
  };
  const result = findPositionAndLength(nodes);
  return result !== null && result.index < result.length - 1;
};
