import { useRef, useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router";
import Page from "../../layouts/root/components/page";
import { useTranslation } from "react-i18next";
import {
  Grid,
  TextField,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  List,
  ListItem,
  Typography,
  styled,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import LayersIcon from "@mui/icons-material/Layers";
import BuildIcon from "@mui/icons-material/Build";

const StyledTabButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "isActive",
})<{ isActive: boolean }>(({ theme, isActive }) => ({
  textTransform: "none",
  borderRadius: 14,
  justifyContent: "flex-start",
  color: theme.palette.text.primary,
  paddingTop: theme.spacing(1.8),
  paddingBottom: theme.spacing(1.8),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  minHeight: 48,
  backgroundColor: isActive ? theme.palette.action.focus : "transparent",
  transition: "all 200ms ease",
  "&:hover": {
    backgroundColor: isActive
      ? theme.palette.action.selected
      : theme.palette.action.hover,
  },
  "& .MuiButton-startIcon": {
    fontSize: "1.25rem",
    marginRight: theme.spacing(2),
  },
}));
import { Controller, FieldValues, useForm } from "react-hook-form";
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
import FormPanel from "../../components/form-components/form-panel";
import FormAccordion from "../../components/form-components/form-accordion";
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
    setSearchParams({ tab }, { replace: true });
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
  const [drawerDZ, setDrawerDZ] = useState<TreeItems<TreeItemData>>([]);
  const [controlDZ, setControlDZ] = useState<TreeItems<TreeItemData>>([]);
  const [widgetLeftDZ, setWidgetLeftDZ] = useState<TreeItems<TreeItemData>>([]);
  const [widgetRightDZ, setWidgetRightDZ] = useState<TreeItems<TreeItemData>>(
    [],
  );
  const [isToolsDirty, setIsToolsDirty] = useState(false);
  const initialToolsLoaded = useRef(false);

  useEffect(() => {
    if (!mapTools) return;
    const toItem = (t: ToolOnMap): TreeItem<TreeItemData> => ({
      id: `tool${ID_DELIMITER}${t.toolId}`,
      name: t.tool.type,
      type: "tool" as const,
      canHaveChildren: false,
    });

    const byZone = (zone: string) =>
      [...mapTools]
        .filter((t) => t.target === zone)
        .sort((a, b) => a.index - b.index)
        .map(toItem);

    setDrawerDZ(byZone("drawer"));
    setWidgetLeftDZ(byZone("widgetLeft"));
    setWidgetRightDZ(byZone("widgetRight"));
    setControlDZ(byZone("controlButton"));
    initialToolsLoaded.current = true;
    setIsToolsDirty(false);
  }, [mapTools]);

  const markToolsDirty = useCallback(() => {
    if (initialToolsLoaded.current) setIsToolsDirty(true);
  }, []);

  const handleSaveTools = async () => {
    const zones: [TreeItems<TreeItemData>, string][] = [
      [drawerDZ, "drawer"],
      [widgetLeftDZ, "widgetLeft"],
      [widgetRightDZ, "widgetRight"],
      [controlDZ, "controlButton"],
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
      setIsToolsDirty(false);
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
      <List
        sx={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 1,
          p: 0,
          mb: 2,
        }}
      >
        {(
          [
            { key: "menu", label: t("common.layerGroups"), icon: <LayersIcon /> },
            { key: "settings", label: t("common.settings"), icon: <SettingsIcon /> },
            { key: "tools", label: t("common.tools"), icon: <BuildIcon /> },
          ] as const
        ).map((tab) => (
          <ListItem key={tab.key} disablePadding disableGutters sx={{ width: "auto" }}>
            <StyledTabButton
              isActive={activeTab === tab.key}
              startIcon={tab.icon}
              onClick={() => setActiveTab(tab.key)}
            >
              <Typography>{tab.label}</Typography>
            </StyledTabButton>
          </ListItem>
        ))}
      </List>
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
            <FormPanel title={t("map.baseSettings")}>
              <Grid container rowSpacing={1.5}>
                <Grid size={{ xs: 12, md: 12 }}>
                  <TextField
                    label={t("map.projection")}
                    fullWidth
                    defaultValue={map?.options?.projection ?? "EPSG:3006"}
                    {...register("options.projection")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.startZoom")}
                    fullWidth
                    type="number"
                    defaultValue={map?.options?.startZoom ?? 1.33}
                    {...register("options.startZoom")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.maxZoom")}
                    fullWidth
                    type="number"
                    defaultValue={map?.options?.maxZoom ?? 8}
                    {...register("options.maxZoom")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.minZoom")}
                    fullWidth
                    type="number"
                    defaultValue={map?.options?.minZoom ?? 0}
                    {...register("options.minZoom")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.centerCoordinate")}
                    fullWidth
                    defaultValue={
                      map?.options?.centerCoordinate ?? "576357, 6386049"
                    }
                    {...register("options.centerCoordinate")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.origin")}
                    fullWidth
                    defaultValue={map?.options?.origin ?? "0,0"}
                    {...register("options.origin")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.extent")}
                    fullWidth
                    defaultValue={
                      map?.options?.extent ??
                      "-1200000, 4700000, 2600000, 8500000"
                    }
                    {...register("options.extent")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.resolutions")}
                    fullWidth
                    defaultValue={
                      map?.options?.resolutions ??
                      "2048, 1024, 512, 256, 128, 64, 32, 16, 8"
                    }
                    {...register("options.resolutions")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.printResolutions")}
                    fullWidth
                    defaultValue={map?.options?.printResolutions ?? ""}
                    {...register("options.printResolutions")}
                  />
                </Grid>
              </Grid>
            </FormPanel>

            <FormAccordion title={t("map.extraSettings")}>
              <Grid container rowSpacing={1.5}>
                <Grid size={{ xs: 12, md: 10 }}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.constrainResolution"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.constrainResolution")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.constrainOnlyCenter"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.constrainOnlyCenter")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.constrainResolutionMobile"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.constrainResolutionMobile")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.enableDownloadLink"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.enableDownloadLink")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.enableAppStateInHash"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.enableAppStateInHash")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.confirmOnWindowClose"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.confirmOnWindowClose")}
                    />
                  </FormGroup>
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.logoLight")}
                    fullWidth
                    defaultValue={map?.options?.logoLight ?? "/logoLight.png"}
                    {...register("options.logoLight")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.logoDark")}
                    fullWidth
                    defaultValue={map?.options?.logoDark ?? ""}
                    {...register("options.logoDark")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.legendOptions")}
                    fullWidth
                    defaultValue={map?.options?.legendOptions ?? ""}
                    {...register("options.legendOptions")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.crossOrigin")}
                    fullWidth
                    defaultValue={map?.options?.crossOrigin ?? "anonymous"}
                    {...register("options.crossOrigin")}
                  />
                </Grid>
              </Grid>
            </FormAccordion>

            <FormAccordion title={t("map.extraMapControls")}>
              <Grid container rowSpacing={1.5}>
                <Grid size={{ xs: 12, md: 10 }}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.mapselector"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.mapselector")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.mapcleaner"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.mapcleaner")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.mapresetter"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.mapresetter")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.showThemeToggler"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.showThemeToggler")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.showUserAvatar"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.showUserAvatar")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.showRecentlyUsedPlugins"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.showRecentlyUsedPlugins")}
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </FormAccordion>

            <FormAccordion title={t("map.interactions")}>
              <Grid container rowSpacing={1.5}>
                <Grid size={{ xs: 12, md: 10 }}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.altShiftDragRotate"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.altShiftDragRotate")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.onFocusOnly"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.onFocusOnly")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.doubleClickZoom"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.doubleClickZoom")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.keyboard"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.keyboard")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.mouseWheelZoom"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.mouseWheelZoom")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.shiftDragZoom"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.shiftDragZoom")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.dragPan"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.dragPan")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.pinchRotate"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.pinchRotate")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.pinchZoom"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.pinchZoom")}
                    />
                  </FormGroup>
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.zoomLevelDelta")}
                    fullWidth
                    type="number"
                    defaultValue={map?.options?.zoomLevelDelta ?? ""}
                    {...register("options.zoomLevelDelta")}
                  />
                  <TextField
                    label={t("map.zoomAnimationDuration")}
                    fullWidth
                    type="number"
                    defaultValue={map?.options?.zoomAnimationDuration ?? ""}
                    {...register("options.zoomAnimationDuration")}
                  />
                </Grid>
              </Grid>
            </FormAccordion>

            <FormAccordion title={t("map.colors")}>
              <Grid container rowSpacing={1.5}>
                <Grid size={{ xs: 12, md: 10 }}>
                  <FormControl fullWidth>
                    <InputLabel id="preferredColorScheme-label">
                      {t("map.preferredColorScheme")}
                    </InputLabel>
                    <Controller
                      name="options.preferredColorScheme"
                      control={control}
                      defaultValue={
                        map?.options?.preferredColorScheme ?? "user"
                      }
                      render={({ field }) => (
                        <Select
                          labelId="preferredColorScheme-label"
                          label={t("map.preferredColorScheme")}
                          {...field}
                        >
                          <MenuItem value="user">
                            {t("map.colorSchemeUser")}
                          </MenuItem>
                          <MenuItem value="light">
                            {t("map.colorSchemeLight")}
                          </MenuItem>
                          <MenuItem value="dark">
                            {t("map.colorSchemeDark")}
                          </MenuItem>
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.primaryColor")}
                    fullWidth
                    defaultValue={map?.options?.primaryColor ?? "#333333"}
                    {...register("options.primaryColor")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.secondaryColor")}
                    fullWidth
                    defaultValue={map?.options?.secondaryColor ?? "#ffa000"}
                    {...register("options.secondaryColor")}
                  />
                </Grid>
              </Grid>
            </FormAccordion>

            <FormAccordion title={t("map.sidepanel")}>
              <Grid container rowSpacing={1.5}>
                <FormGroup>
                  <Grid size={12}>
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.drawerStatic"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.drawerStatic")}
                    />
                  </Grid>
                  <Grid size={12}>
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.drawerVisible"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.drawerVisible")}
                    />
                  </Grid>
                  <Grid size={12}>
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.drawerVisibleMobile"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.drawerVisibleMobile")}
                    />
                  </Grid>
                  <Grid size={12}>
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.drawerPermanent"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.drawerPermanent")}
                    />
                  </Grid>
                </FormGroup>
              </Grid>
              <Grid size={{ xs: 12, md: 10 }}>
                <TextField
                  label={t("map.drawerContent")}
                  fullWidth
                  defaultValue={map?.options?.drawerContent ?? "plugins"}
                  {...register("options.drawerContent")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 10 }}>
                <TextField
                  label={t("map.drawerTitle")}
                  fullWidth
                  defaultValue={map?.options?.drawerTitle ?? "Kartverktyg"}
                  {...register("options.drawerTitle")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 10 }}>
                <TextField
                  label={t("map.drawerButtonTitle")}
                  fullWidth
                  defaultValue={
                    map?.options?.drawerButtonTitle ?? "Kartverktyg"
                  }
                  {...register("options.drawerButtonTitle")}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 10 }}>
                <FormControl fullWidth>
                  <InputLabel id="drawerButtonIcon-label">
                    {t("map.drawerButtonIcon")}
                  </InputLabel>
                  <Controller
                    name="options.drawerButtonIcon"
                    control={control}
                    defaultValue={map?.options?.drawerButtonIcon ?? "MapIcon"}
                    render={({ field }) => (
                      <Select
                        labelId="drawerButtonIcon-label"
                        label={t("map.drawerButtonIcon")}
                        {...field}
                      >
                        <MenuItem value="MapIcon">MapIcon</MenuItem>
                        <MenuItem value="MenuIcon">MenuIcon</MenuItem>
                      </Select>
                    )}
                  />
                </FormControl>
              </Grid>
            </FormAccordion>

            <FormAccordion title={t("map.cookies")}>
              <Grid container rowSpacing={1.5}>
                <Grid size={{ xs: 12, md: 10 }}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.showCookieNotice"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.showCookieNotice")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.cookieUse3dPart"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.cookieUse3dPart")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.showCookieNoticeButton"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.showCookieNoticeButton")}
                    />
                  </FormGroup>
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.cookieLink")}
                    fullWidth
                    defaultValue={
                      map?.options?.cookieLink ??
                      "https://pts.se/sv/bransch/regler/lagar/lag-om-elektronisk-kommunikation/kakor-cookies/"
                    }
                    {...register("options.cookieLink")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.cookieMessage")}
                    fullWidth
                    multiline
                    rows={3}
                    defaultValue={
                      map?.options?.cookieMessage ??
                      "Vi använder cookies för att följa upp användandet och ge en bra upplevelse av kartan. Du kan blockera cookies i webbläsaren men då visas detta meddelande igen."
                    }
                    {...register("options.cookieMessage")}
                  />
                </Grid>
              </Grid>
            </FormAccordion>

            <FormAccordion title={t("map.introGuide")}>
              <Grid container rowSpacing={1.5}>
                <Grid size={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.introductionEnabled"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.introductionEnabled")}
                    />
                    <FormControlLabel
                      control={
                        <Controller
                          name="options.introductionShowControlButton"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          )}
                        />
                      }
                      label={t("map.introductionShowControlButton")}
                    />
                  </FormGroup>
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("map.introductionSteps")}
                    fullWidth
                    multiline
                    rows={8}
                    defaultValue={map?.options?.introductionSteps ?? "[]"}
                    {...register("options.introductionSteps")}
                  />
                </Grid>
              </Grid>
            </FormAccordion>
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
            drawerItems={drawerDZ}
            onDrawerItemsChange={(items) => { setDrawerDZ(items); markToolsDirty(); }}
            widgetLeftItems={widgetLeftDZ}
            onWidgetLeftItemsChange={(items) => { setWidgetLeftDZ(items); markToolsDirty(); }}
            widgetRightItems={widgetRightDZ}
            onWidgetRightItemsChange={(items) => { setWidgetRightDZ(items); markToolsDirty(); }}
            controlButtonItems={controlDZ}
            onControlButtonItemsChange={(items) => { setControlDZ(items); markToolsDirty(); }}
            backgroundImage={backgroundImage}
          />
        )}
      </FormActionPanel>
    </Page>
  );
}
