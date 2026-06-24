import { useRef, useState, useCallback, useMemo, type ReactElement } from "react";
import { useParams, useSearchParams } from "react-router";
import Page from "../../layouts/root/components/page";
import { useTranslation } from "react-i18next";
import {
  TextField,
  useTheme,
  Tabs,
  Tab,
  Box,
} from "@mui/material";
import type { Theme } from "@mui/material/styles";
import SettingsIcon from "@mui/icons-material/Settings";
import LayersIcon from "@mui/icons-material/Layers";
import BuildIcon from "@mui/icons-material/Build";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import MapIcon from "@mui/icons-material/Map";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import PaletteIcon from "@mui/icons-material/Palette";
import CookieIcon from "@mui/icons-material/Cookie";

import { FieldValues, useForm } from "react-hook-form";
import {
  useMapByName,
  useUpdateMap,
  useMaps,
  useToolsByMapName,
  ToolOnMap,
} from "../../api/maps";
import {
  buildMapSettingsFormValues,
  buildMapUpdatePayload,
} from "./map-settings-form-values";
import { SquareSpinnerComponent } from "../../components/progress/square-progress";
import FormActionPanel from "../../components/form-action-panel";
import { toast } from "react-toastify";
import { HttpError } from "../../lib/http-error";
import FormContainer from "../../components/form-components/form-container";
import MapSettingsForm, {
  type MapSettingsSection,
} from "./components/map-settings-form";
import {
  LayerSwitcherDnD,
  TreeItemData,
  ToolPlacementDnD,
  ID_DELIMITER,
} from "../../components/layerswitcher-dnd";
import { useLayers } from "../../api/layers";
import { useGroups } from "../../api/groups";
import { useTools } from "../../api/tools";
import { useProjections } from "../../api/services";
import useAppStateStore from "../../store/use-app-state-store";
import { TreeItems, TreeItem } from "dnd-kit-sortable-tree";

const MAP_PAGE_TABS = [
  { key: "menu", labelKey: "common.layerGroups", icon: <LayersIcon /> },
  { key: "settings", labelKey: "common.settings", icon: <SettingsIcon /> },
  { key: "tools", labelKey: "common.tools", icon: <BuildIcon /> },
] as const;

const MAP_SETTINGS_SECTIONS: {
  key: MapSettingsSection;
  labelKey: string;
  icon: ReactElement;
}[] = [
  { key: "map", labelKey: "map.baseSettings", icon: <MapIcon /> },
  {
    key: "controls",
    labelKey: "map.settingsSection.controls",
    icon: <TouchAppIcon />,
  },
  {
    key: "appearance",
    labelKey: "map.settingsSection.appearance",
    icon: <PaletteIcon />,
  },
  {
    key: "content",
    labelKey: "map.settingsSection.content",
    icon: <CookieIcon />,
  },
  {
    key: "search",
    labelKey: "common.searchSettings",
    icon: <ManageSearchIcon />,
  },
];

const VALID_MAP_SETTINGS_SECTIONS = new Set<MapSettingsSection>(
  MAP_SETTINGS_SECTIONS.map((section) => section.key),
);

interface ToolZones {
  drawer: TreeItems<TreeItemData>;
  widgetLeft: TreeItems<TreeItemData>;
  widgetRight: TreeItems<TreeItemData>;
  control: TreeItems<TreeItemData>;
}

const EMPTY_TOOL_ZONES: ToolZones = {
  drawer: [],
  widgetLeft: [],
  widgetRight: [],
  control: [],
};

function mapToolsToZones(mapTools: ToolOnMap[]): ToolZones {
  const toItem = (tool: ToolOnMap): TreeItem<TreeItemData> => ({
    id: `tool${ID_DELIMITER}${tool.toolId}`,
    name: tool.tool.type,
    type: "tool" as const,
    canHaveChildren: false,
  });

  const byZone = (zone: string) =>
    [...mapTools]
      .filter((tool) => tool.target === zone)
      .sort((a, b) => a.index - b.index)
      .map(toItem);

  return {
    drawer: byZone("drawer"),
    widgetLeft: byZone("widgetLeft"),
    widgetRight: byZone("widgetRight"),
    control: byZone("controlButton"),
  };
}

const tabTextColorSx = {
  "& .MuiTab-root": {
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
    color: "inherit",
  },
};

export default function MapSettings() {
  const { t } = useTranslation();
  const { mapId } = useParams();
  const { data: maps } = useMaps();
  const mapName = maps?.find((m) => m.id == mapId)?.name;
  const { data: map, isLoading, isError } = useMapByName(mapName ?? "");
  const { mutateAsync: updateMap, status: updateStatus } = useUpdateMap();
  const { palette } = useTheme();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") ?? "settings") as
    | "menu"
    | "settings"
    | "tools";
  const setActiveTab = (tab: string) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );

  const settingsSectionFromUrl = searchParams.get("settingsTab");
  const normalizedSettingsSection: MapSettingsSection | null =
    settingsSectionFromUrl === "ui"
      ? "appearance"
      : (settingsSectionFromUrl as MapSettingsSection | null);
  const settingsSection: MapSettingsSection =
    normalizedSettingsSection &&
    VALID_MAP_SETTINGS_SECTIONS.has(normalizedSettingsSection)
      ? normalizedSettingsSection
      : "map";
  const setSettingsSection = (section: MapSettingsSection) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "settings");
        next.set("settingsTab", section);
        return next;
      },
      { replace: true },
    );
  };

  const [settingsSearchQuery, setSettingsSearchQuery] = useState("");
  const showSettingsSearchUi =
    activeTab === "settings" && settingsSection === "search";
  const settingsSearchTerm = showSettingsSearchUi ? settingsSearchQuery : "";
  const { data: layers = [] } = useLayers();
  const { data: groups = [] } = useGroups();
  const { data: tools = [] } = useTools();
  const { data: mapTools } = useToolsByMapName(mapName ?? "");
  const { data: projections } = useProjections();
  const { defaultCoordinates } = useAppStateStore.getState();

  const projectionOptions = useMemo(
    () =>
      (projections ?? [])
        .filter((projection) => projection.code.startsWith("EPSG:"))
        .map((projection) => ({
          title: projection.code,
          value: projection.code,
        })),
    [projections],
  );

  // Drop zone states
  const [backgroundLayersDZ, setBackgroundLayersDZ] = useState<
    TreeItems<TreeItemData>
  >([]);
  const [groupLayersDZ, setGroupLayersDZ] = useState<TreeItems<TreeItemData>>(
    [],
  );
  const serverToolZones = useMemo(
    () => (mapTools ? mapToolsToZones(mapTools) : null),
    [mapTools],
  );
  const [toolsDraft, setToolsDraft] = useState<{
    mapName: string;
    zones: ToolZones;
  } | null>(null);

  const toolZones =
    toolsDraft != null && toolsDraft.mapName === mapName
      ? toolsDraft.zones
      : (serverToolZones ?? EMPTY_TOOL_ZONES);

  const updateToolZone = useCallback(
    (zone: keyof ToolZones, items: TreeItems<TreeItemData>) => {
      setToolsDraft((prev) => {
        const base =
          prev != null && prev.mapName === mapName
            ? prev.zones
            : (serverToolZones ?? EMPTY_TOOL_ZONES);

        return {
          mapName: mapName ?? "",
          zones: { ...base, [zone]: items },
        };
      });
    },
    [mapName, serverToolZones],
  );

  const backgroundImage = "/mapbackground.png";

  const mapFormBaseline = useMemo(
    () => (map ? buildMapSettingsFormValues(map) : null),
    [map],
  );

  const mapFormSyncKey = map ? map.name : null;

  const [committedFormBaseline, setCommittedFormBaseline] =
    useState<FieldValues | null>(null);
  const [syncedMapFormKey, setSyncedMapFormKey] = useState<string | null>(null);

  if (mapFormSyncKey !== syncedMapFormKey) {
    setSyncedMapFormKey(mapFormSyncKey);
    setCommittedFormBaseline(null);
  }

  const formBaseline = committedFormBaseline ?? mapFormBaseline;

  const handleExternalSubmit = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { isDirty },
  } = useForm<FieldValues>({
    mode: "onChange",
    reValidateMode: "onChange",
    values: formBaseline ?? undefined,
  });

  const handleUpdateMap = async (formData: FieldValues) => {
    if (!map) return;

    try {
      const payload = buildMapUpdatePayload(formData, map);

      await updateMap({
        mapName: map.name,
        data: payload,
      });
      setCommittedFormBaseline(formData);
      toast.success(t("maps.updateMapSuccess", { name: map.name }), {
        position: "bottom-left",
        theme: palette.mode,
        hideProgressBar: true,
      });
    } catch (error) {
      console.error("Failed to update map:", error);
      toast.error(t("maps.updateMapFailed", { name: map.name }), {
        position: "bottom-left",
        theme: palette.mode,
        hideProgressBar: true,
      });
    }
  };

  if (isLoading) {
    return <SquareSpinnerComponent />;
  }
  if (!map) {
    throw new HttpError(404, "Map not found");
  }
  if (isError) return <div>Error fetching map details.</div>;

  return (
    <Page
      title={
        map?.name
          ? `${t("common.settings")} - ${map.name}`
          : t("common.settings")
      }
    >
      <Tabs
        value={activeTab}
        onChange={(_, value) =>
          setActiveTab(value as (typeof MAP_PAGE_TABS)[number]["key"])
        }
        sx={{ mb: 2, ...tabTextColorSx }}
      >
        {MAP_PAGE_TABS.map((tab) => (
          <Tab
            key={tab.key}
            value={tab.key}
            icon={tab.icon}
            iconPosition="start"
            label={t(tab.labelKey as never)}
          />
        ))}
      </Tabs>
      <FormActionPanel
        updateStatus={updateStatus}
        onUpdate={handleExternalSubmit}
        saveButtonText="Spara"
        createdBy={map?.createdBy}
        createdDate={map?.createdDate}
        lastSavedBy={map?.lastSavedBy}
        lastSavedDate={map?.lastSavedDate}
        isDirty={isDirty}
      >
        <Box sx={{ display: activeTab === "settings" ? "block" : "none" }}>
          <FormContainer
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit((data: FieldValues) => {
                void handleUpdateMap(data);
              })(e);
            }}
            formRef={formRef}
            noValidate={false}
          >
            <Tabs
              value={settingsSection}
              onChange={(_, value) =>
                setSettingsSection(value as MapSettingsSection)
              }
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                mb: 2,
                minHeight: 36,
                pl: 1,
                borderLeft: 2,
                borderColor: "divider",
                "& .MuiTab-root": {
                  minHeight: 36,
                  fontSize: (theme) => theme.typography.body2.fontSize,
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
              }}
            >
              {MAP_SETTINGS_SECTIONS.map((section) => (
                <Tab
                  key={section.key}
                  value={section.key}
                  icon={section.icon}
                  iconPosition="start"
                  label={t(section.labelKey as never)}
                />
              ))}
            </Tabs>

            {showSettingsSearchUi && (
              <TextField
                placeholder={`${t("common.searchSettings")}...`}
                fullWidth
                autoFocus
                value={settingsSearchQuery}
                onChange={(e) => setSettingsSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <ManageSearchIcon
                        sx={{ mr: 1, color: "text.secondary" }}
                      />
                    ),
                  },
                }}
                sx={{ mb: 2 }}
              />
            )}

            <MapSettingsForm
              register={register}
              control={control}
              activeSection={settingsSection}
              settingsSearchTerm={settingsSearchTerm}
              showSettingsSearchUi={showSettingsSearchUi}
              getValues={getValues}
              defaultCoordinates={defaultCoordinates}
              projectionOptions={projectionOptions}
            />
          </FormContainer>
        </Box>

        {activeTab === "menu" && (
          <>
            <LayerSwitcherDnD
              layers={layers}
              dropZones={[
                {
                  id: "layers",
                  title: t("common.layers"),
                  items: backgroundLayersDZ,
                  onItemsChange: setBackgroundLayersDZ,
                },
              ]}
            />
            <LayerSwitcherDnD
              groups={groups}
              dropZones={[
                {
                  id: "groups",
                  title: t("common.layerGroups"),
                  items: groupLayersDZ,
                  onItemsChange: setGroupLayersDZ,
                },
              ]}
            />
          </>
        )}

        {activeTab === "tools" && (
          <ToolPlacementDnD
            tools={tools.map((tool) => ({ id: tool.id, name: tool.type }))}
            drawerItems={toolZones.drawer}
            onDrawerItemsChange={(items) => updateToolZone("drawer", items)}
            widgetLeftItems={toolZones.widgetLeft}
            onWidgetLeftItemsChange={(items) => updateToolZone("widgetLeft", items)}
            widgetRightItems={toolZones.widgetRight}
            onWidgetRightItemsChange={(items) => updateToolZone("widgetRight", items)}
            controlButtonItems={toolZones.control}
            onControlButtonItemsChange={(items) => updateToolZone("control", items)}
            backgroundImage={backgroundImage}
          />
        )}
      </FormActionPanel>
    </Page>
  );
}
