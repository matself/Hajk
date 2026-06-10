import type { Group, LayerSwitcherTreeNode } from "../../../api/groups";
import type { Layer } from "../../../api/layers";

export type { LayerSwitcherTreeNode };

export interface LayerSwitcherTreeItem {
  id: string;
  name: string;
  type: "group" | "layer";
  children?: LayerSwitcherTreeItem[];
  canHaveChildren?: boolean;
  collapsed?: boolean;
}

const LAYER_PREFIX = "layer-";
const GROUP_PREFIX = "group-";

export const LAYER_SWITCHER_TREE_OPTIONS_KEY = "layerSwitcherTree";

export function serializeLayerSwitcherTree(
  items: LayerSwitcherTreeItem[]
): LayerSwitcherTreeNode[] {
  return items.map((item) => {
    if (item.type === "layer") {
      return {
        type: "layer",
        id: item.id.replace(new RegExp(`^${LAYER_PREFIX}`), ""),
      };
    }
    return {
      type: "group",
      id: item.id.replace(new RegExp(`^${GROUP_PREFIX}`), ""),
      name: item.name,
      children: serializeLayerSwitcherTree(item.children ?? []),
    };
  });
}

export function editingGroupTreeId(groupId: string) {
  return `${GROUP_PREFIX}${groupId}`;
}

export function unwrapEditingGroupContainer(
  items: LayerSwitcherTreeItem[],
  editingGroupId?: string
): LayerSwitcherTreeItem[] {
  if (!editingGroupId || items.length !== 1) {
    return items;
  }

  const root = items[0];
  if (
    root.type === "group" &&
    root.id === editingGroupTreeId(editingGroupId)
  ) {
    return root.children ?? [];
  }

  return items;
}

export function wrapInEditingGroupContainer(
  items: LayerSwitcherTreeItem[],
  editingGroup: { id: string; name: string }
): LayerSwitcherTreeItem[] {
  if (items.length === 1) {
    const root = items[0];
    if (
      root.type === "group" &&
      root.id === editingGroupTreeId(editingGroup.id)
    ) {
      return items;
    }
  }

  return [
    {
      id: editingGroupTreeId(editingGroup.id),
      name: editingGroup.name,
      type: "group",
      children: items,
      canHaveChildren: true,
    },
  ];
}

export function buildInitialTreeItems(
  tree: LayerSwitcherTreeNode[] | undefined,
  layers: Layer[],
  groups: Group[],
  _editingGroup?: { id: string; name: string }
): LayerSwitcherTreeItem[] {
  return deserializeLayerSwitcherTree(tree, layers, groups);
}

export function buildNestedGroupTreeItem(
  group: { id: string; name: string },
  groupLayers: Layer[],
  tree: LayerSwitcherTreeNode[] | undefined,
  allGroups: Group[]
): LayerSwitcherTreeItem {
  return {
    id: `${GROUP_PREFIX}${group.id}`,
    name: group.name,
    type: "group",
    children: deserializeLayerSwitcherTree(tree, groupLayers, allGroups),
    canHaveChildren: true,
    collapsed: true,
  };
}

export function deserializeLayerSwitcherTree(
  tree: LayerSwitcherTreeNode[] | undefined,
  layers: Layer[],
  groups: Group[]
): LayerSwitcherTreeItem[] {
  if (!tree?.length) {
    return layers.map((layer) => ({
      id: `${LAYER_PREFIX}${layer.id}`,
      name: layer.name,
      type: "layer" as const,
      canHaveChildren: false,
    }));
  }

  const layerById = new Map(layers.map((layer) => [layer.id, layer]));
  const groupById = new Map(groups.map((group) => [group.id, group]));

  const toItems = (nodes: LayerSwitcherTreeNode[]): LayerSwitcherTreeItem[] => {
    const result: LayerSwitcherTreeItem[] = [];

    for (const node of nodes) {
      if (node.type === "layer") {
        const layer = layerById.get(node.id);
        if (!layer) continue;
        result.push({
          id: `${LAYER_PREFIX}${layer.id}`,
          name: layer.name,
          type: "layer",
          canHaveChildren: false,
        });
        continue;
      }

      const group = groupById.get(node.id);
      result.push({
        id: `${GROUP_PREFIX}${node.id}`,
        name: group?.name ?? node.name,
        type: "group",
        children: toItems(node.children),
        canHaveChildren: true,
      });
    }

    return result;
  };

  const deserialized = toItems(tree);
  const includedLayerIds = new Set<string>();

  const collectLayerIds = (items: LayerSwitcherTreeItem[]) => {
    items.forEach((item) => {
      if (item.type === "layer") {
        includedLayerIds.add(item.id.replace(new RegExp(`^${LAYER_PREFIX}`), ""));
      }
      if (item.children) collectLayerIds(item.children);
    });
  };
  collectLayerIds(deserialized);

  const missingLayers = layers.filter((layer) => !includedLayerIds.has(layer.id));
  if (missingLayers.length === 0) return deserialized;

  return [
    ...deserialized,
    ...missingLayers.map((layer) => ({
      id: `${LAYER_PREFIX}${layer.id}`,
      name: layer.name,
      type: "layer" as const,
      canHaveChildren: false,
    })),
  ];
}

export function collectLayerIdsFromTree(
  items: LayerSwitcherTreeItem[]
): string[] {
  const layerIds: string[] = [];

  const walk = (nodes: LayerSwitcherTreeItem[]) => {
    nodes.forEach((node) => {
      if (node.type === "layer") {
        const layerId = node.id.replace(new RegExp(`^${LAYER_PREFIX}`), "");
        if (!layerIds.includes(layerId)) {
          layerIds.push(layerId);
        }
      }
      if (node.children?.length) {
        walk(node.children);
      }
    });
  };

  walk(items);
  return layerIds;
}

export function parseLayerSwitcherTreeFromOptions(
  options: Record<string, unknown> | undefined
): LayerSwitcherTreeNode[] | undefined {
  const raw = options?.[LAYER_SWITCHER_TREE_OPTIONS_KEY];
  if (!Array.isArray(raw)) return undefined;
  return raw as LayerSwitcherTreeNode[];
}
