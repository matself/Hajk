import { SERVICE_TYPE } from "../../api/services";

export type LayerCategory = "display" | "search" | "editing";

export type LayerSettingsTab =
  | "general"
  | "display"
  | "metadata"
  | "infoclick"
  | "editing"
  | "layers"
  | "maps";

export interface LayerSettingsVisibility {
  tabs: LayerSettingsTab[];
  showSearchSettingsPanel: boolean;
  showDisplayFieldsPanel: boolean;
  showDisplayRequestOptions: boolean;
  showInfoClickSettingsPanel: boolean;
  showEditingSettingsPanel: boolean;
}

const CATEGORY_FROM_PATH_SEGMENT: Record<string, LayerCategory> = {
  "display-layers": "display",
  "search-layers": "search",
  "editing-layers": "editing",
};

export function getLayerCategoryFromPathname(
  pathname: string,
): LayerCategory | undefined {
  const segment = pathname.split("/").find(Boolean);
  return segment ? CATEGORY_FROM_PATH_SEGMENT[segment] : undefined;
}

export function getLayerCategoryFromServiceType(
  type: SERVICE_TYPE,
): LayerCategory {
  if (type === SERVICE_TYPE.WFS) return "search";
  if (type === SERVICE_TYPE.WFST) return "editing";
  return "display";
}

export function getLayerSettingsVisibility(
  category: LayerCategory,
): LayerSettingsVisibility {
  switch (category) {
    case "display":
      return {
        tabs: ["general", "display", "metadata", "infoclick", "layers", "maps"],
        showSearchSettingsPanel: false,
        showDisplayFieldsPanel: false,
        showDisplayRequestOptions: true,
        showInfoClickSettingsPanel: true,
        showEditingSettingsPanel: false,
      };
    case "search":
      return {
        tabs: ["general", "infoclick", "layers", "maps"],
        showSearchSettingsPanel: true,
        showDisplayFieldsPanel: true,
        showDisplayRequestOptions: false,
        showInfoClickSettingsPanel: false,
        showEditingSettingsPanel: false,
      };
    case "editing":
      return {
        tabs: ["general", "editing", "layers", "maps"],
        showSearchSettingsPanel: false,
        showDisplayFieldsPanel: false,
        showDisplayRequestOptions: false,
        showInfoClickSettingsPanel: false,
        showEditingSettingsPanel: true,
      };
  }
}
