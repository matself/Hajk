import type {
  GroupLayerCreateInput,
  LayerSwitcherTreeNode,
} from "../../../api/groups";

export function groupCompositionKey(
  layers: GroupLayerCreateInput[],
  tree: LayerSwitcherTreeNode[] = [],
): string {
  return [
    layers
      .map((layer) => `${layer.layerId}:${layer.usage}:${layer.zIndex ?? 0}`)
      .join("|"),
    JSON.stringify(tree),
  ].join("::");
}
