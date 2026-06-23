import { useRef, useState, useEffect, useCallback, useMemo, type ReactElement } from "react";
import { useParams, useSearchParams } from "react-router";
import Page from "../../layouts/root/components/page";
import { useTranslation } from "react-i18next";
import {
  TextField,
  useTheme,
  Tabs,
  Tab,
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
  MapMutation,
  useUpdateMap,
  useMaps,
  useToolsByMapName,
  useUpdateMapTools,
  ToolOnMap,
} from "../../api/maps";
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
  const { mutateAsync: updateMapToolsMutation } = useUpdateMapTools();

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

  const isToolsDirty = toolsDraft?.mapName === mapName;
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

  const handleSaveTools = async () => {
    const zones: [TreeItems<TreeItemData>, string][] = [
      [toolZones.drawer, "drawer"],
      [toolZones.widgetLeft, "widgetLeft"],
      [toolZones.widgetRight, "widgetRight"],
      [toolZones.control, "controlButton"],
    ];
    const toolsPayload = zones.flatMap(([items, zone]) =>
      items.map((item, index) => ({
        toolId: parseInt(String(item.id).split(ID_DELIMITER)[1], 10),
        index,
        target: zone,
      }))
    );
    try {
      await updateMapToolsMutation({ mapName: mapName ?? "", tools: toolsPayload });
      toast.success(t("maps.updateMapSuccess", { name: mapName }), {
        position: "bottom-left",
        theme: palette.mode,
        hideProgressBar: true,
      });
      setToolsDraft(null);
    } catch (error) {
      console.error("Failed to update map tools:", error);
      toast.error(t("maps.updateMapFailed", { name: mapName }), {
        position: "bottom-left",
        theme: palette.mode,
        hideProgressBar: true,
      });
    }
  };

  const backgroundImage = "/mapbackground.png";

  const handleExternalSubmit = () => {
    if (activeTab === "tools") {
      void handleSaveTools();
      return;
    }
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { isDirty },
  } = useForm<FieldValues>({
    mode: "onChange",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    if (map) {
      const options = map.options ?? {};

      const defaultValues = {
        name: map.name ?? "",
        locked: map.locked ?? false,
        "options.projection": options.projection ?? "EPSG:3006",
        "options.startZoom": options.startZoom ?? "1.33",
        "options.maxZoom": options.maxZoom ?? "8",
        "options.minZoom": options.minZoom ?? "0",
        "options.centerCoordinate":
          options.centerCoordinate ?? "576357, 6386049",
        "options.origin": options.origin ?? "0,0",
        "options.extent":
          options.extent ?? "-1200000, 4700000, 2600000, 8500000",
        "options.resolutions":
          options.resolutions ?? "2048, 1024, 512, 256, 128, 64, 32, 16, 8",
        "options.printResolutions": options.printResolutions ?? "",
        "options.constrainResolution": options.constrainResolution === "true",
        "options.constrainOnlyCenter": options.constrainOnlyCenter === "true",
        "options.constrainResolutionMobile":
          options.constrainResolutionMobile === "true",
        "options.enableDownloadLink": options.enableDownloadLink === "true",
        "options.enableAppStateInHash": options.enableAppStateInHash === "true",
        "options.confirmOnWindowClose": options.confirmOnWindowClose === "true",
        "options.logoLight": options.logoLight ?? "/logoLight.png",
        "options.logoDark": options.logoDark ?? "",
        "options.legendOptions": options.legendOptions ?? "",
        "options.crossOrigin": options.crossOrigin ?? "anonymous",
        "options.mapselector": options.mapselector === "true",
        "options.mapcleaner": options.mapcleaner === "true",
        "options.mapresetter": options.mapresetter === "true",
        "options.showThemeToggler": options.showThemeToggler === "true",
        "options.showUserAvatar": options.showUserAvatar === "true",
        "options.showRecentlyUsedPlugins":
          options.showRecentlyUsedPlugins === "true",
        "options.altShiftDragRotate": options.altShiftDragRotate === "true",
        "options.onFocusOnly": options.onFocusOnly === "true",
        "options.doubleClickZoom": options.doubleClickZoom === "true",
        "options.keyboard": options.keyboard === "true",
        "options.mouseWheelZoom": options.mouseWheelZoom === "true",
        "options.shiftDragZoom": options.shiftDragZoom === "true",
        "options.dragPan": options.dragPan === "true",
        "options.pinchRotate": options.pinchRotate === "true",
        "options.pinchZoom": options.pinchZoom === "true",
        "options.zoomLevelDelta": options.zoomLevelDelta ?? "",
        "options.zoomAnimationDuration": options.zoomAnimationDuration ?? "",
        "options.preferredColorScheme": options.preferredColorScheme ?? "user",
        "options.primaryColor": options.primaryColor ?? "#333333",
        "options.secondaryColor": options.secondaryColor ?? "#ffa000",
        "options.drawerStatic": options.drawerStatic === "true",
        "options.drawerVisible": options.drawerVisible === "true",
        "options.drawerVisibleMobile": options.drawerVisibleMobile === "true",
        "options.drawerPermanent": options.drawerPermanent === "true",
        "options.drawerContent": options.drawerContent ?? "plugins",
        "options.drawerTitle": options.drawerTitle ?? "Kartverktyg",
        "options.drawerButtonTitle": options.drawerButtonTitle ?? "Kartverktyg",
        "options.drawerButtonIcon": options.drawerButtonIcon ?? "MapIcon",
        "options.showCookieNotice": options.showCookieNotice === "true",
        "options.cookieUse3dPart": options.cookieUse3dPart === "true",
        "options.showCookieNoticeButton":
          options.showCookieNoticeButton === "true",
        "options.cookieLink":
          options.cookieLink ??
          "https://pts.se/sv/bransch/regler/lagar/lag-om-elektronisk-kommunikation/kakor-cookies/",
        "options.cookieMessage":
          options.cookieMessage ??
          "Vi använder cookies för att följa upp användandet och ge en bra upplevelse av kartan. Du kan blockera cookies i webbläsaren men då visas detta meddelande igen.",
        "options.introductionEnabled": options.introductionEnabled === "true",
        "options.introductionShowControlButton":
          options.introductionShowControlButton === "true",
        "options.introductionSteps": options.introductionSteps ?? "[]",
      };

      reset(defaultValues);
    }
  }, [map, reset]);

  const handleUpdateMap = async (mapData: MapMutation) => {
    try {
      const payload = {
        name: mapData.name ?? "",
        locked: mapData.locked ?? false,
        options: mapData.options ?? {},
      };

      await updateMap({
        mapName: map?.name ?? "",
        data: payload,
      });
      toast.success(t("maps.updateMapSuccess", { name: mapData.name }), {
        position: "bottom-left",
        theme: palette.mode,
        hideProgressBar: true,
      });
    } catch (error) {
      console.error("Failed to update map:", error);
      toast.error(t("maps.updateMapFailed", { name: map?.name }), {
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
        isDirty={isDirty || isToolsDirty}
      >
        {activeTab === "settings" && (
          <FormContainer
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit((data: FieldValues) => {
                const toNumber = (v: unknown) =>
                  typeof v === "string" && v.trim() !== ""
                    ? Number(v)
                    : (v as number | undefined);

                const normalized: MapMutation = {
                  id: 0,
                  name: (data.name as string) ?? "",
                  locked: (data.locked as boolean) ?? false,
                  options: {
                    projection:
                      (data["options.projection"] as string) ?? "EPSG:3006",
                    startZoom: String(
                      toNumber(data["options.startZoom"]) ?? 1.33,
                    ),
                    maxZoom: String(toNumber(data["options.maxZoom"]) ?? 8),
                    minZoom: String(toNumber(data["options.minZoom"]) ?? 0),
                    centerCoordinate:
                      (data["options.centerCoordinate"] as string) ??
                      "576357, 6386049",
                    origin: (data["options.origin"] as string) ?? "0,0",
                    extent:
                      (data["options.extent"] as string) ??
                      "-1200000, 4700000, 2600000, 8500000",
                    resolutions:
                      (data["options.resolutions"] as string) ??
                      "2048, 1024, 512, 256, 128, 64, 32, 16, 8",
                    printResolutions:
                      (data["options.printResolutions"] as string) ?? "",
                    constrainResolution: String(
                      Boolean(data["options.constrainResolution"]),
                    ),
                    constrainOnlyCenter: String(
                      Boolean(data["options.constrainOnlyCenter"]),
                    ),
                    constrainResolutionMobile: String(
                      Boolean(data["options.constrainResolutionMobile"]),
                    ),
                    enableDownloadLink: String(
                      Boolean(data["options.enableDownloadLink"]),
                    ),
                    enableAppStateInHash: String(
                      Boolean(data["options.enableAppStateInHash"]),
                    ),
                    confirmOnWindowClose: String(
                      Boolean(data["options.confirmOnWindowClose"]),
                    ),
                    logoLight:
                      (data["options.logoLight"] as string) ?? "/logoLight.png",
                    logoDark: (data["options.logoDark"] as string) ?? "",
                    legendOptions:
                      (data["options.legendOptions"] as string) ?? "",
                    crossOrigin:
                      (data["options.crossOrigin"] as string) ?? "anonymous",
                    mapselector: String(Boolean(data["options.mapselector"])),
                    mapcleaner: String(Boolean(data["options.mapcleaner"])),
                    mapresetter: String(Boolean(data["options.mapresetter"])),
                    showThemeToggler: String(
                      Boolean(data["options.showThemeToggler"]),
                    ),
                    showUserAvatar: String(
                      Boolean(data["options.showUserAvatar"]),
                    ),
                    showRecentlyUsedPlugins: String(
                      Boolean(data["options.showRecentlyUsedPlugins"]),
                    ),
                    altShiftDragRotate: String(
                      Boolean(data["options.altShiftDragRotate"]),
                    ),
                    onFocusOnly: String(Boolean(data["options.onFocusOnly"])),
                    doubleClickZoom: String(
                      Boolean(data["options.doubleClickZoom"]),
                    ),
                    keyboard: String(Boolean(data["options.keyboard"])),
                    mouseWheelZoom: String(
                      Boolean(data["options.mouseWheelZoom"]),
                    ),
                    shiftDragZoom: String(
                      Boolean(data["options.shiftDragZoom"]),
                    ),
                    dragPan: String(Boolean(data["options.dragPan"])),
                    pinchRotate: String(Boolean(data["options.pinchRotate"])),
                    pinchZoom: String(Boolean(data["options.pinchZoom"])),
                    zoomLevelDelta: String(
                      toNumber(data["options.zoomLevelDelta"]) ?? "",
                    ),
                    zoomAnimationDuration: String(
                      toNumber(data["options.zoomAnimationDuration"]) ?? "",
                    ),
                    preferredColorScheme:
                      (data["options.preferredColorScheme"] as string) ??
                      "user",
                    primaryColor:
                      (data["options.primaryColor"] as string) ?? "#333333",
                    secondaryColor:
                      (data["options.secondaryColor"] as string) ?? "#ffa000",
                    drawerStatic: String(Boolean(data["options.drawerStatic"])),
                    drawerVisible: String(
                      Boolean(data["options.drawerVisible"]),
                    ),
                    drawerVisibleMobile: String(
                      Boolean(data["options.drawerVisibleMobile"]),
                    ),
                    drawerPermanent: String(
                      Boolean(data["options.drawerPermanent"]),
                    ),
                    drawerContent:
                      (data["options.drawerContent"] as string) ?? "plugins",
                    drawerTitle:
                      (data["options.drawerTitle"] as string) ?? "Kartverktyg",
                    drawerButtonTitle:
                      (data["options.drawerButtonTitle"] as string) ??
                      "Kartverktyg",
                    drawerButtonIcon:
                      (data["options.drawerButtonIcon"] as string) ?? "MapIcon",
                    showCookieNotice: String(
                      Boolean(data["options.showCookieNotice"]),
                    ),
                    cookieUse3dPart: String(
                      Boolean(data["options.cookieUse3dPart"]),
                    ),
                    showCookieNoticeButton: String(
                      Boolean(data["options.showCookieNoticeButton"]),
                    ),
                    cookieLink:
                      (data["options.cookieLink"] as string) ??
                      "https://pts.se/sv/bransch/regler/lagar/lag-om-elektronisk-kommunikation/kakor-cookies/",
                    cookieMessage:
                      (data["options.cookieMessage"] as string) ??
                      "Vi använder cookies för att följa upp användandet och ge en bra upplevelse av kartan. Du kan blockera cookies i webbläsaren men då visas detta meddelande igen.",
                    introductionEnabled: String(
                      Boolean(data["options.introductionEnabled"]),
                    ),
                    introductionShowControlButton: String(
                      Boolean(data["options.introductionShowControlButton"]),
                    ),
                    introductionSteps:
                      (data["options.introductionSteps"] as string) ?? "[]",
                  },
                };

                void handleUpdateMap(normalized);
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
              map={map}
              register={register}
              control={control}
              activeSection={settingsSection}
              settingsSearchTerm={settingsSearchTerm}
              showSettingsSearchUi={showSettingsSearchUi}
              getValues={getValues}
            />
          </FormContainer>
        )}

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
