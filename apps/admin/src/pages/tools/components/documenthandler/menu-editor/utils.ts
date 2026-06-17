import type { MenuConfigItem, MenuConfig, MenuTreeNode } from "./types";

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

export function toTree(menu: MenuConfigItem[]): MenuTreeNode[] {
  return menu.map((item) => toNode(item));
}

function toNode(item: MenuConfigItem): MenuTreeNode {
  const children = item.menu ? toTree(item.menu) : [];
  return {
    id: crypto.randomUUID(),
    data: { ...item, menu: [] },
    hadFolder: Object.hasOwn(item, "folder"),
    hadExpandedSubMenu: Object.hasOwn(item, "expandedSubMenu"),
    userTouchedFolder: false,
    userTouchedExpandedSubMenu: false,
    originalKeyOrder: Object.keys(item),
    children,
  };
}

export function fromTree(nodes: MenuTreeNode[]): MenuConfigItem[] {
  return nodes.map((node) => fromNode(node));
}

function fromNode(node: MenuTreeNode): MenuConfigItem {
  const childItems = fromTree(node.children);
  const emitFolder = node.hadFolder || node.userTouchedFolder;
  const emitExpandedSubMenu =
    node.hadExpandedSubMenu || node.userTouchedExpandedSubMenu;

  if (node.originalKeyOrder) {
    // Preserve the original key order for byte-identical round-trips.
    const result: Record<string, unknown> = {};
    for (const key of node.originalKeyOrder) {
      if (key === "menu") {
        result.menu = childItems;
      } else if (key === "folder" && !emitFolder) {
        // skip – was removed by user
      } else if (key === "expandedSubMenu" && !emitExpandedSubMenu) {
        // skip
      } else {
        result[key] = node.data[key as keyof MenuConfigItem];
      }
    }
    // Ensure menu is present even if it wasn't in the original key order
    if (!("menu" in result)) {
      result.menu = childItems;
    }
    return result as unknown as MenuConfigItem;
  }

  // Newly created node — use legacy field order.
  const item: Partial<MenuConfigItem> = {
    title: node.data.title,
    document: node.data.document,
    color: node.data.color,
    icon: node.data.icon,
    maplink: node.data.maplink,
    link: node.data.link,
    menu: childItems,
  };

  if (emitFolder) {
    // Insert folder after title to match legacy creation order
    const ordered: Record<string, unknown> = { title: item.title };
    if (emitFolder) ordered.folder = node.data.folder ?? "";
    ordered.document = item.document;
    ordered.color = item.color;
    ordered.icon = item.icon;
    ordered.maplink = item.maplink;
    ordered.link = item.link;
    ordered.menu = item.menu;
    if (emitExpandedSubMenu)
      ordered.expandedSubMenu = node.data.expandedSubMenu ?? false;
    return ordered as unknown as MenuConfigItem;
  }

  if (emitExpandedSubMenu) {
    (item as Record<string, unknown>).expandedSubMenu =
      node.data.expandedSubMenu ?? false;
  }

  return item as MenuConfigItem;
}

export function menuConfigFromTree(
  nodes: MenuTreeNode[],
  original: MenuConfig | undefined
): MenuConfig {
  return {
    ...(original ?? {}),
    menu: fromTree(nodes),
  };
}

// ---------------------------------------------------------------------------
// Node creation
// ---------------------------------------------------------------------------

export function createNewNode(): MenuTreeNode {
  return {
    id: crypto.randomUUID(),
    data: {
      title: "",
      document: "",
      color: "",
      icon: { materialUiIconName: "", fontSize: "large" },
      maplink: "",
      link: "",
      menu: [],
    },
    hadFolder: false,
    hadExpandedSubMenu: false,
    userTouchedFolder: false,
    userTouchedExpandedSubMenu: false,
    originalKeyOrder: null,
    children: [],
  };
}

// ---------------------------------------------------------------------------
// Validation — mirrors legacy menuEditorModel.isSelectionValid
// ---------------------------------------------------------------------------

export function isNodeValid(node: MenuTreeNode): boolean {
  const { document, maplink, link } = node.data;
  if ((document || maplink || link) && node.children.length > 0) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Tree mutation helpers
// ---------------------------------------------------------------------------

export function findNodeById(
  nodes: MenuTreeNode[],
  id: string
): MenuTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children, id);
    if (found) return found;
  }
  return null;
}

export function updateNodeById(
  nodes: MenuTreeNode[],
  id: string,
  updater: (node: MenuTreeNode) => MenuTreeNode
): MenuTreeNode[] {
  return nodes.map((node) => {
    if (node.id === id) return updater(node);
    return { ...node, children: updateNodeById(node.children, id, updater) };
  });
}

export function removeNodeById(
  nodes: MenuTreeNode[],
  id: string
): MenuTreeNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeNodeById(node.children, id) }));
}

function insertIntoParent(
  nodes: MenuTreeNode[],
  parentId: string,
  index: number,
  toInsert: MenuTreeNode[]
): MenuTreeNode[] {
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
  tree: MenuTreeNode[],
  dragIds: string[],
  parentId: string | null,
  index: number
): MenuTreeNode[] {
  const dragged = dragIds
    .map((id) => findNodeById(tree, id))
    .filter((n): n is MenuTreeNode => n !== null);

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
  tree: MenuTreeNode[],
  parentId: string | null,
  newNode: MenuTreeNode
): MenuTreeNode[] {
  if (parentId === null) {
    return [...tree, newNode];
  }
  return tree.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...node.children, newNode] };
    }
    return { ...node, children: addChildNode(node.children, parentId, newNode) };
  });
}
