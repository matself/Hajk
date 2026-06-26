import { useState } from "react";
import { Box, CircularProgress, Tab, Tabs } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import ViewListIcon from "@mui/icons-material/ViewList";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import { useTranslation } from "react-i18next";
import type { TreeItems } from "dnd-kit-sortable-tree";
import type { ToolOnMap } from "../../../api/maps";
import {
  ToolPlacementDnD,
  TreeItemData,
} from "../../../components/layerswitcher-dnd";
import type { ToolZones } from "../map-tools-utils";
import { unplacedMapToolsToSourceItems } from "../map-tools-utils";
import MapToolsList from "./map-tools-list";

const TOOLS_SUB_TAB_SX = {
  mb: 2,
  minHeight: 36,
  pl: 1,
  borderLeft: 2,
  borderColor: "divider",
  "& .MuiTab-root": {
    minHeight: 36,
    fontSize: (theme: Theme) => theme.typography.body2.fontSize,
    fontWeight: 500,
    textTransform: "none",
    px: 1.5,
    py: 0.5,
    minWidth: "auto",
    color: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? theme.palette.common.white
        : theme.palette.common.black,
  },
  "& .MuiTab-root.Mui-selected": {
    color: (theme: Theme) =>
      theme.palette.mode === "dark"
        ? theme.palette.common.white
        : theme.palette.common.black,
  },
  "& .MuiTab-icon": {
    fontSize: "1.125rem",
    color: "inherit",
  },
  "& .MuiTabs-indicator": {
    height: 2,
  },
} as const;

interface MapToolsPanelProps {
  mapTools: ToolOnMap[] | undefined;
  toolZones: ToolZones;
  onUpdateToolZone: (
    zone: keyof ToolZones,
    items: TreeItems<TreeItemData>,
  ) => void;
  backgroundImage?: string;
}

export default function MapToolsPanel({
  mapTools,
  toolZones,
  onUpdateToolZone,
  backgroundImage,
}: MapToolsPanelProps) {
  const { t } = useTranslation();
  const [toolsSubTab, setToolsSubTab] = useState<"list" | "placement">("list");

  if (mapTools === undefined) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const sourceTools = unplacedMapToolsToSourceItems(mapTools, toolZones);

  return (
    <Box>
      <Tabs
        value={toolsSubTab}
        onChange={(_, value) => setToolsSubTab(value as "list" | "placement")}
        variant="scrollable"
        scrollButtons="auto"
        sx={TOOLS_SUB_TAB_SX}
      >
        <Tab
          value="list"
          icon={<ViewListIcon />}
          iconPosition="start"
          label={t("maps.toolsTab.list")}
        />
        <Tab
          value="placement"
          icon={<TouchAppIcon />}
          iconPosition="start"
          label={t("maps.toolsTab.placement")}
        />
      </Tabs>

      {toolsSubTab === "list" ? (
        <MapToolsList mapTools={mapTools} />
      ) : (
        <ToolPlacementDnD
          tools={sourceTools}
          sourceTitle={t("maps.toolsUnplacedSource")}
          drawerItems={toolZones.drawer}
          onDrawerItemsChange={(items) => onUpdateToolZone("drawer", items)}
          widgetLeftItems={toolZones.widgetLeft}
          onWidgetLeftItemsChange={(items) =>
            onUpdateToolZone("widgetLeft", items)
          }
          widgetRightItems={toolZones.widgetRight}
          onWidgetRightItemsChange={(items) =>
            onUpdateToolZone("widgetRight", items)
          }
          controlButtonItems={toolZones.control}
          onControlButtonItemsChange={(items) =>
            onUpdateToolZone("control", items)
          }
          backgroundImage={backgroundImage}
        />
      )}
    </Box>
  );
}
