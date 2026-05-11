import { useState, useRef, useMemo, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router";
import Page from "../../layouts/root/components/page";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  Grid2 as Grid,
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
  IconButton,
  Box,
  List,
  ListItem,
  Typography,
  styled,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import TuneIcon from "@mui/icons-material/Tune";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import LayersIcon from "@mui/icons-material/Layers";
import MapIcon from "@mui/icons-material/Map";
import { GridRowSelectionModel } from "@mui/x-data-grid";
import { Controller, FieldValues, useForm } from "react-hook-form";
import UsedInMapsGrid from "./used-in-maps-grid";
import {
  useLayerById,
  useDeleteLayer,
  LayerUpdateInput,
  useUpdateLayer,
  infoClickFormat,
  sortType,
  searchOutputFormat,
  useServiceByLayerId,
  useCreateAndUpdateRoleOnLayer,
  useGetRoleOnLayerByLayerId,
} from "../../api/layers";
import { SquareSpinnerComponent } from "../../components/progress/square-progress";
import FormActionPanel from "../../components/form-action-panel";
import { toast } from "react-toastify";
import {
  useServices,
  useServiceCapabilities,
  SERVICE_TYPE,
} from "../../api/services";
import AvailableLayersGrid from "./available-layers-grid";
import { useRoles } from "../../api/users";
import { HttpError } from "../../lib/http-error";
import FormContainer from "../../components/form-components/form-container";
import FormPanel from "../../components/form-components/form-panel";
import LayerInfoClickModal from "./components/layer-infoclick-modal";

const StyledTabButton = styled(Button)<{ isActive: boolean }>(
  ({ theme, isActive }) => ({
    textTransform: "none",
    width: "100%",
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
  }),
);

export default function LayerSettings() {
  const { t } = useTranslation();
  const { layerId } = useParams<{ layerId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fromService = searchParams.get("fromService");
  const { data: layer, isLoading, isError } = useLayerById(layerId ?? "");
  const { mutateAsync: updateLayer, status: updateStatus } = useUpdateLayer();
  const { mutateAsync: createRoleOnLayer } = useCreateAndUpdateRoleOnLayer();
  const { mutateAsync: deleteLayer } = useDeleteLayer(fromService ?? "");
  const queryClient = useQueryClient();
  const { palette } = useTheme();
  const { data: services } = useServices();
  const { data: roles } = useRoles();
  const { data: roleOnLayer } = useGetRoleOnLayerByLayerId(layerId ?? "");

  const formRef = useRef<HTMLFormElement | null>(null);
  const { data: service, isLoading: serviceLoading } = useServiceByLayerId(
    layer?.id ?? "",
    !!layer?.id,
  );

  const handleCancelNewLayer =
    fromService && layerId
      ? async () => {
          await deleteLayer(layerId);
          void navigate(`/services/${fromService}?tab=layers`);
        }
      : undefined;
  const [activeTab, setActiveTab] = useState<
    "general" | "display" | "infoclick" | "layers" | "maps"
  >("general");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectGridId, setSelectGridId] = useState<GridRowSelectionModel>();
  const [useCustomDpiList, setUseCustomDpiList] = useState<boolean>(false);
  const [customDpiList, setCustomDpiList] = useState<
    { pxRatio: number; dpi: number }[]
  >([
    { pxRatio: 0, dpi: 90 },
    { pxRatio: 2, dpi: 180 },
  ]);
  const {
    layers: getCapLayers,
    styles: getCapStyles,
    isError: capabilitiesError,
    isLoading: capabilitiesLoading,
    refetch: refetchCapabilities,
  } = useServiceCapabilities({
    baseUrl: service?.url ?? "",
    type:
      service?.type === SERVICE_TYPE.WMS
        ? SERVICE_TYPE.WMS
        : service?.type === SERVICE_TYPE.WMTS
          ? SERVICE_TYPE.WMS
          : service?.type === SERVICE_TYPE.WFS
            ? SERVICE_TYPE.WFS
            : service?.type === SERVICE_TYPE.WFST
              ? SERVICE_TYPE.WFS
              : service?.type === SERVICE_TYPE.VECTOR
                ? SERVICE_TYPE.WFS
                : service?.type,
  });

  const styles = layer?.selectedLayers.flatMap(
    (key) => getCapStyles[key] || [],
  );
  const handleExternalSubmit = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FieldValues>({
    mode: "onChange",
    reValidateMode: "onChange",
  });

  // Reset form with layer data when it loads
  useEffect(() => {
    if (layer) {
      reset({
        name: layer.name ?? "",
        serviceId: layer.serviceId ?? "",
        internalName: layer.internalName ?? "",
        description: layer.description ?? "",
        hidpi: layer.hidpi ?? false,
        singleTile: layer.singleTile ?? false,
        customRatio: layer.customRatio,
        style: layer.style ?? "",
        opacity: layer.opacity,
        minZoom: layer.minZoom,
        maxZoom: layer.maxZoom,
        minMaxZoomAlertOnToggleOnly: layer.minMaxZoomAlertOnToggleOnly ?? false,
        infoClickActive: layer.infoClickActive ?? false,
        showMetadata: layer.showMetadata ?? false,
        legendUrl: layer.legendUrl ?? "",
        legendIconUrl: layer.legendIconUrl ?? "",
        legendOptions: layer.legendOptions ?? "",
        useCustomDpiList: false,
        roleId: roleOnLayer?.roleId ?? "",
        metadata: {
          title: layer.metadata?.title ?? "",
          url: layer.metadata?.url ?? "",
          urlTitle: layer.metadata?.urlTitle ?? "",
          attribution: layer.metadata?.attribution ?? "",
        },
        searchSettings: {
          active: layer.searchSettings?.active ?? false,
          url: layer.searchSettings?.url ?? "",
          searchFields: (layer.searchSettings?.searchFields ?? []).join(", "),
          primaryDisplayFields: (
            layer.searchSettings?.primaryDisplayFields ?? []
          ).join(", "),
          secondaryDisplayFields: (
            layer.searchSettings?.secondaryDisplayFields ?? []
          ).join(", "),
          shortDisplayFields: (
            layer.searchSettings?.shortDisplayFields ?? []
          ).join(", "),
          geometryField: layer.searchSettings?.geometryField ?? "",
          outputFormat: layer.searchSettings?.outputFormat ?? "",
        },
        infoClickSettings: {
          definition: layer.infoClickSettings?.definition ?? "",
          icon: layer.infoClickSettings?.icon ?? "",
          format: layer.infoClickSettings?.format ?? "",
          sortProperty: layer.infoClickSettings?.sortProperty ?? "",
          sortMethod: layer.infoClickSettings?.sortMethod ?? "",
          sortDescending: layer.infoClickSettings?.sortDescending ?? false,
        },
        options: {
          keyword: layer.options?.keyword ?? "",
          category: layer.options?.category ?? "",
          layerDisplayDescription: layer.options?.layerDisplayDescription ?? "",
          geoWebCache: layer.options?.geoWebCache ?? false,
          showAttributeTableButton:
            layer.options?.showAttributeTableButton ?? false,
        },
      });
    }
  }, [layer, roleOnLayer, reset]);

  const watchRoleIdInput = watch("roleId") as string | undefined;

  const filteredLayers = useMemo(() => {
    if (!getCapLayers) return [];

    const searchAndSelectedFilteredLayers = getCapLayers
      .map((layer, index) => {
        const isSelected = selectGridId?.includes(index);
        return {
          id: index,
          layer,
          infoClick: "",
          publications: "",
          selected: isSelected,
        };
      })
      .filter(
        (layer) =>
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          layer?.selected || // Disable lint here since ?? is messing with the data-grid search logic
          layer.layer.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .sort((a, b) => {
        const aMatches = a.layer
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const bMatches = b.layer
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return 0;
      });
    return searchAndSelectedFilteredLayers;
  }, [getCapLayers, searchTerm, selectGridId]);

  const selectedRowsData = useMemo(
    () =>
      selectGridId?.map((id) => filteredLayers.find((row) => row.id === id)),
    [selectGridId, filteredLayers],
  );

  const selectedRowObjects = useMemo(
    () => selectedRowsData?.map((row) => row?.layer ?? ""),
    [selectedRowsData],
  );

  const [openInfoClickModal, setOpenInfoClickModal] = useState(false);
  const [selectedInfoClickLayer, setSelectedInfoClickLayer] =
    useState<string>("");

  const handleLayerClick = (layerName: string) => {
    setSelectedInfoClickLayer(layerName);
    setOpenInfoClickModal(true);
  };

  const handleCloseModal = () => {
    setOpenInfoClickModal(false);
    setSelectedInfoClickLayer("");
  };

  const handleSaveLayerInfoClick = async (data: {
    caption?: string;
    legendIcon?: string;
    style?: string;
    queryable?: boolean;
    infoclickIcon?: string;
    searchDisplayName?: string;
    secondaryLabelFields?: string;
    searchShortDisplayName?: string;
    searchUrl?: string;
    searchPropertyName?: string;
    searchOutputFormat?: string;
    searchGeometryField?: string;
    definition?: string;
    format: string;
    sortProperty?: string;
    sortMethod: string;
    sortDescending: boolean;
  }) => {
    // Store per-layer-instance settings in layer.options.layersInfo
    if (!layer) return;

    // Get existing layersInfo from options or initialize empty object
    const existingLayersInfo =
      (layer.options?.layersInfo as Record<
        string,
        {
          caption?: string;
          legendIcon?: string;
          style?: string;
          queryable?: boolean;
          infoclickIcon?: string;
          searchDisplayName?: string;
          secondaryLabelFields?: string;
          searchShortDisplayName?: string;
          searchUrl?: string;
          searchPropertyName?: string;
          searchOutputFormat?: string;
          searchGeometryField?: string;
          definition?: string;
          format?: string;
          sortProperty?: string;
          sortMethod?: string;
          sortDescending?: boolean;
        }
      >) ?? {};

    // Update only the selected layer's settings
    // Merge with existing settings for this layer instance to preserve unchanged fields
    const existingLayerInstanceSettings =
      existingLayersInfo[selectedInfoClickLayer] ?? {};

    // Only include fields that have actual values (not empty strings or undefined)
    const layerInstanceData: Record<string, unknown> = {
      ...existingLayerInstanceSettings,
    };

    // Update fields that were provided (including falsy values like false for booleans)
    if (data.caption !== undefined)
      layerInstanceData.caption = data.caption || undefined;
    if (data.legendIcon !== undefined)
      layerInstanceData.legendIcon = data.legendIcon || undefined;
    if (data.style !== undefined)
      layerInstanceData.style = data.style || undefined;
    if (data.queryable !== undefined)
      layerInstanceData.queryable = data.queryable;
    if (data.infoclickIcon !== undefined)
      layerInstanceData.infoclickIcon = data.infoclickIcon || undefined;
    if (data.searchDisplayName !== undefined)
      layerInstanceData.searchDisplayName = data.searchDisplayName || undefined;
    if (data.secondaryLabelFields !== undefined)
      layerInstanceData.secondaryLabelFields =
        data.secondaryLabelFields || undefined;
    if (data.searchShortDisplayName !== undefined)
      layerInstanceData.searchShortDisplayName =
        data.searchShortDisplayName || undefined;
    if (data.searchUrl !== undefined)
      layerInstanceData.searchUrl = data.searchUrl || undefined;
    if (data.searchPropertyName !== undefined)
      layerInstanceData.searchPropertyName =
        data.searchPropertyName || undefined;
    if (data.searchOutputFormat !== undefined)
      layerInstanceData.searchOutputFormat =
        data.searchOutputFormat || undefined;
    if (data.searchGeometryField !== undefined)
      layerInstanceData.searchGeometryField =
        data.searchGeometryField || undefined;
    if (data.definition !== undefined)
      layerInstanceData.definition = data.definition || undefined;
    if (data.format !== undefined) layerInstanceData.format = data.format;
    if (data.sortProperty !== undefined)
      layerInstanceData.sortProperty = data.sortProperty || undefined;
    if (data.sortMethod !== undefined)
      layerInstanceData.sortMethod = data.sortMethod;
    if (data.sortDescending !== undefined)
      layerInstanceData.sortDescending = data.sortDescending;

    const updatedLayersInfo = {
      ...existingLayersInfo,
      [selectedInfoClickLayer]: layerInstanceData,
    };

    // Merge with existing options to preserve all other fields
    const existingOptions: Record<string, unknown> =
      layer.options &&
      typeof layer.options === "object" &&
      !Array.isArray(layer.options)
        ? layer.options
        : {};
    const mergedOptions: Record<string, unknown> = {
      ...existingOptions,
      layersInfo: updatedLayersInfo,
      keyword: (existingOptions.keyword as string | undefined) ?? "",
      category: (existingOptions.category as string | undefined) ?? "",
      layerDisplayDescription:
        (existingOptions.layerDisplayDescription as string | undefined) ?? "",
      geoWebCache:
        (existingOptions.geoWebCache as boolean | undefined) ?? false,
      showAttributeTableButton:
        (existingOptions.showAttributeTableButton as boolean | undefined) ??
        false,
    };

    const currentValues = {
      name: layer.name ?? "",
      serviceId: layer.serviceId ?? "",
      selectedLayers: layer.selectedLayers ?? [],
      internalName: layer.internalName ?? "",
      description: layer.description ?? "",
      hidpi: layer.hidpi ?? false,
      singleTile: layer.singleTile ?? false,
      customRatio: layer.customRatio,
      style: layer.style ?? "",
      opacity: layer.opacity,
      minZoom: layer.minZoom,
      maxZoom: layer.maxZoom,
      minMaxZoomAlertOnToggleOnly: layer.minMaxZoomAlertOnToggleOnly ?? false,
      infoClickActive: layer.infoClickActive ?? false,
      showMetadata: layer.showMetadata ?? false,
      legendUrl: layer.legendUrl ?? "",
      legendIconUrl: layer.legendIconUrl ?? "",
      legendOptions: layer.legendOptions ?? "",
      options: mergedOptions,
      metadata: {
        title: layer.metadata?.title ?? "",
        url: layer.metadata?.url ?? "",
        urlTitle: layer.metadata?.urlTitle ?? "",
        attribution: layer.metadata?.attribution ?? "",
      },
      searchSettings: {
        active: layer.searchSettings?.active ?? false,
        url: layer.searchSettings?.url ?? "",
        searchFields: layer.searchSettings?.searchFields ?? [],
        outputFormat: layer.searchSettings?.outputFormat ?? "",
        geometryField: layer.searchSettings?.geometryField ?? "",
        primaryDisplayFields: layer.searchSettings?.primaryDisplayFields ?? [],
        secondaryDisplayFields:
          layer.searchSettings?.secondaryDisplayFields ?? [],
        shortDisplayFields: layer.searchSettings?.shortDisplayFields ?? [],
      },
      infoClickSettings: {
        definition: layer.infoClickSettings?.definition,
        icon: layer.infoClickSettings?.icon,
        format: layer.infoClickSettings?.format ?? "application/json",
        sortProperty: layer.infoClickSettings?.sortProperty,
        sortMethod: layer.infoClickSettings?.sortMethod ?? "text",
        sortDescending: layer.infoClickSettings?.sortDescending ?? false,
      },
    };

    try {
      await handleUpdateLayer(currentValues);
      // Manually update the query cache to ensure layersInfo is included
      // The API response might not include the full nested options structure
      queryClient.setQueryData(
        ["layers", layer.id],
        (oldData: typeof layer) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            options: {
              ...oldData.options,
              layersInfo: updatedLayersInfo,
            },
          };
        },
      );
      toast.success(
        t("layers.updateLayerInfoClickSuccess", {
          layerName: selectedInfoClickLayer,
        }),
        {
          position: "bottom-left",
          theme: palette.mode,
          hideProgressBar: true,
        },
      );
    } catch (error) {
      console.error("Failed to update layer infoclick settings:", error);
      toast.error(
        t("layers.updateLayerInfoClickFailed", {
          layerName: selectedInfoClickLayer,
        }),
        {
          position: "bottom-left",
          theme: palette.mode,
          hideProgressBar: true,
        },
      );
    }
  };

  const handleUpdateDpiList = (
    index: number,
    key: "pxRatio" | "dpi",
    value: string,
  ) => {
    if (value.includes(".") || value.includes(",")) {
      return; // Don't allow decimals
    }
    const numValue = parseInt(value, 10) || 0;
    const newList = [...customDpiList];
    newList[index] = { ...newList[index], [key]: numValue };
    setCustomDpiList(newList);
  };

  const handleRemoveDpiListRow = (index: number) => {
    if (customDpiList.length <= 1) {
      return; // Keep at least one row
    }
    const newList = [...customDpiList];
    newList.splice(index, 1);
    setCustomDpiList(newList);
  };

  const handleAddDpiListRow = () => {
    setCustomDpiList([...customDpiList, { pxRatio: 0, dpi: 90 }]);
  };

  const handleUpdateLayer = async (layerData: LayerUpdateInput) => {
    try {
      // Preserve existing options (including layersInfo) and merge with new options
      const existingOptions =
        layer?.options &&
        typeof layer.options === "object" &&
        !Array.isArray(layer.options)
          ? layer.options
          : ({} as Record<string, unknown>);
      const newOptions =
        layerData.options &&
        typeof layerData.options === "object" &&
        !Array.isArray(layerData.options)
          ? layerData.options
          : ({} as Record<string, unknown>);

      // Use layersInfo from newOptions if provided, otherwise preserve from existingOptions
      const layersInfoToUse =
        newOptions.layersInfo &&
        typeof newOptions.layersInfo === "object" &&
        !Array.isArray(newOptions.layersInfo)
          ? newOptions.layersInfo
          : existingOptions.layersInfo &&
              typeof existingOptions.layersInfo === "object" &&
              !Array.isArray(existingOptions.layersInfo)
            ? existingOptions.layersInfo
            : undefined;

      const updatedOptions: Record<string, unknown> = {
        ...existingOptions,
        ...newOptions,
        // Use the appropriate layersInfo (new takes precedence)
        ...(layersInfoToUse && { layersInfo: layersInfoToUse }),
        // Override with new values if provided
        keyword:
          (newOptions.keyword as string | undefined) ??
          (existingOptions.keyword as string | undefined),
        category:
          (newOptions.category as string | undefined) ??
          (existingOptions.category as string | undefined),
        geoWebCache:
          (newOptions.geoWebCache as boolean | undefined) ??
          (existingOptions.geoWebCache as boolean | undefined),
        showAttributeTableButton:
          (newOptions.showAttributeTableButton as boolean | undefined) ??
          (existingOptions.showAttributeTableButton as boolean | undefined),
        layerDisplayDescription:
          (newOptions.layerDisplayDescription as string | undefined) ??
          (existingOptions.layerDisplayDescription as string | undefined),
      };

      const payload = {
        name: layerData.name,
        serviceId: layerData.serviceId,
        selectedLayers: layerData.selectedLayers,
        internalName: layerData.internalName,
        description: layerData.description,
        hidpi: layerData.hidpi,
        singleTile: layerData.singleTile,
        customRatio: layerData.customRatio,
        style: layerData.style,
        opacity: layerData.opacity,
        minMaxZoomAlertOnToggleOnly: layerData.minMaxZoomAlertOnToggleOnly,
        minZoom: layerData.minZoom,
        maxZoom: layerData.maxZoom,
        infoClickActive: layerData?.infoClickActive,
        showMetadata: layerData?.showMetadata,
        legendUrl: layerData?.legendUrl,
        legendIconUrl: layerData?.legendIconUrl,
        legendOptions: layerData?.legendOptions,
        options: updatedOptions,
        metadata: {
          title: layerData?.metadata?.title,
          url: layerData?.metadata?.url,
          urlTitle: layerData?.metadata?.urlTitle,
          attribution: layerData?.metadata?.attribution,
        },
        searchSettings: {
          active: layerData?.searchSettings?.active,
          url: layerData?.searchSettings?.url,
          searchFields: layerData?.searchSettings?.searchFields,
          outputFormat: layerData?.searchSettings?.outputFormat,
          geometryField: layerData?.searchSettings?.geometryField,
          primaryDisplayFields: layerData?.searchSettings?.primaryDisplayFields,
          secondaryDisplayFields:
            layerData?.searchSettings?.secondaryDisplayFields,
          shortDisplayFields: layerData?.searchSettings?.shortDisplayFields,
        },
        infoClickSettings: {
          sortDescending: layerData?.infoClickSettings?.sortDescending,
          definition: layerData?.infoClickSettings?.definition,
          icon: layerData?.infoClickSettings?.icon,
          sortProperty: layerData?.infoClickSettings?.sortProperty,
          format: layerData?.infoClickSettings?.format,
          sortMethod: layerData?.infoClickSettings?.sortMethod,
        },
      };

      await updateLayer({
        layerId: layer?.id ?? "",
        data: payload,
      });
      toast.success(t("layers.updateLayerSuccess", { name: layerData.name }), {
        position: "bottom-left",
        theme: palette.mode,
        hideProgressBar: true,
      });

      if (watchRoleIdInput) {
        await createRoleOnLayer({
          layerId: layer?.id ?? "",
          roleId: watchRoleIdInput,
        });
      }

      // Reset form with updated data to clear dirty state after successful save
      // This ensures the form reflects the saved state
      if (layer) {
        reset(
          {
            name: layerData.name,
            serviceId: layerData.serviceId,
            internalName: layerData.internalName,
            description: layerData.description,
            hidpi: layerData.hidpi,
            singleTile: layerData.singleTile,
            customRatio: layerData.customRatio,
            style: layerData.style,
            opacity: layerData.opacity,
            minZoom: layerData.minZoom,
            maxZoom: layerData.maxZoom,
            minMaxZoomAlertOnToggleOnly: layerData.minMaxZoomAlertOnToggleOnly,
            infoClickActive: layerData.infoClickActive,
            showMetadata: layerData.showMetadata,
            legendUrl: layerData.legendUrl,
            legendIconUrl: layerData.legendIconUrl,
            legendOptions: layerData.legendOptions,
            useCustomDpiList: false,
            roleId: watchRoleIdInput,
            metadata: {
              title: layerData.metadata?.title,
              url: layerData.metadata?.url,
              urlTitle: layerData.metadata?.urlTitle,
              attribution: layerData.metadata?.attribution,
            },
            searchSettings: {
              active: layerData.searchSettings?.active,
              url: layerData.searchSettings?.url,
              searchFields: (layerData.searchSettings?.searchFields ?? []).join(
                ", ",
              ),
              primaryDisplayFields: (
                layerData.searchSettings?.primaryDisplayFields ?? []
              ).join(", "),
              secondaryDisplayFields: (
                layerData.searchSettings?.secondaryDisplayFields ?? []
              ).join(", "),
              shortDisplayFields: (
                layerData.searchSettings?.shortDisplayFields ?? []
              ).join(", "),
              geometryField: layerData.searchSettings?.geometryField,
              outputFormat: layerData.searchSettings?.outputFormat,
            },
            infoClickSettings: {
              definition: layerData.infoClickSettings?.definition,
              icon: layerData.infoClickSettings?.icon,
              format: layerData.infoClickSettings?.format,
              sortProperty: layerData.infoClickSettings?.sortProperty,
              sortMethod: layerData.infoClickSettings?.sortMethod,
              sortDescending: layerData.infoClickSettings?.sortDescending,
            },
            options: {
              keyword: layerData.options?.keyword,
              category: layerData.options?.category,
              layerDisplayDescription:
                layerData.options?.layerDisplayDescription,
              geoWebCache: layerData.options?.geoWebCache,
              showAttributeTableButton:
                layerData.options?.showAttributeTableButton,
            },
          },
          {
            keepDefaultValues: true,
          },
        );
      }
    } catch (error) {
      console.error("Failed to update layer:", error);
      toast.error(t("layers.updateLayerFailed", { name: layer?.name }), {
        position: "bottom-left",
        theme: palette.mode,
        hideProgressBar: true,
      });
    }
  };
  // TODO?: Add delete layer
  /*
  const handleDeleteLayer = async () => {
    if (!isLoading && layer?.id) {
      try {
        await deleteLayer(layer.id ?? "");
        toast.success(t("layers.deleteLayerSuccess", { name: layer?.name }), {
          position: "bottom-left",
          theme: palette.mode,
          hideProgressBar: true,
        });
      } catch (error) {
        console.log(error);
        toast.error(t("layers.deleteLayerFailed", { name: layer?.name }), {
          position: "bottom-left",
          theme: palette.mode,
          hideProgressBar: true,
        });
      }
    } else {
      console.log("Layer data is still loading or unavailable.");
    }
  };
  */
  // removed createOnSubmitHandler; handled inline in FormContainer onSubmit

  if (isLoading) {
    return <SquareSpinnerComponent />;
  }
  if (!layer) {
    throw new HttpError(404, "Layer not found");
  }
  if (isError) return <div>Error fetching layer details.</div>;

  return (
    <Page
      title={
        layer?.name
          ? `${t("common.settings")} - ${layer.name}`
          : t("common.settings")
      }
    >
      <FormActionPanel
        updateStatus={updateStatus}
        onUpdate={handleExternalSubmit}
        onCancel={handleCancelNewLayer}
        saveButtonText="Spara"
        backLink={
          service
            ? {
                label: t("services.goToService"),
                href: `/services/${service.id}?tab=layers`,
              }
            : undefined
        }
        createdBy={layer?.createdBy}
        createdDate={layer?.createdDate}
        lastSavedBy={layer?.lastSavedBy}
        lastSavedDate={layer?.lastSavedDate}
        isDirty={isDirty}
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
              {
                key: "general",
                label: t("common.settings"),
                icon: <SettingsIcon />,
              },
              {
                key: "display",
                label: t("layers.display"),
                icon: <TuneIcon />,
              },
              {
                key: "infoclick",
                label: t("common.infoclick"),
                icon: <TouchAppIcon />,
              },
              {
                key: "layers",
                label: t("layers.availableLayers"),
                icon: <LayersIcon />,
              },
              { key: "maps", label: t("common.usedInMaps"), icon: <MapIcon /> },
            ] as const
          ).map((tab) => (
            <ListItem
              key={tab.key}
              disablePadding
              disableGutters
              sx={{ width: "auto" }}
            >
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
        <FormContainer
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit((data: FieldValues) => {
              const toNumber = (v: unknown) =>
                typeof v === "string" && v.trim() !== ""
                  ? Number(v)
                  : (v as number | undefined);
              const toArray = (v: unknown) =>
                Array.isArray(v)
                  ? (v as string[])
                  : typeof v === "string"
                    ? v
                        .split(",")
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0)
                    : undefined;

              const normalized: LayerUpdateInput = {
                name: data.name as string | undefined,
                serviceId: data.serviceId as string | undefined,
                internalName: data.internalName as string | undefined,
                description: data.description as string | undefined,
                opacity: toNumber(data.opacity),
                minZoom: toNumber(data.minZoom),
                maxZoom: toNumber(data.maxZoom),
                minMaxZoomAlertOnToggleOnly:
                  data.minMaxZoomAlertOnToggleOnly as boolean | undefined,
                singleTile: data.singleTile as boolean | undefined,
                hidpi: data.hidpi as boolean | undefined,
                customRatio: toNumber(data.customRatio),
                showMetadata: data.showMetadata as boolean | undefined,
                infoClickActive: data.infoClickActive as boolean | undefined,
                style: data.style as string | undefined,
                metadata: {
                  title: (data.metadata as { title?: string })?.title,
                  url: (data.metadata as { url?: string })?.url,
                  urlTitle: (data.metadata as { urlTitle?: string })?.urlTitle,
                  attribution: (data.metadata as { attribution?: string })
                    ?.attribution,
                },
                searchSettings: {
                  active: (data.searchSettings as { active?: boolean })?.active,
                  url: (data.searchSettings as { url?: string })?.url,
                  searchFields: toArray(
                    (data.searchSettings as { searchFields?: unknown })
                      ?.searchFields,
                  ),
                  primaryDisplayFields: toArray(
                    (data.searchSettings as { primaryDisplayFields?: unknown })
                      ?.primaryDisplayFields,
                  ),
                  secondaryDisplayFields: toArray(
                    (
                      data.searchSettings as {
                        secondaryDisplayFields?: unknown;
                      }
                    )?.secondaryDisplayFields,
                  ),
                  shortDisplayFields: toArray(
                    (data.searchSettings as { shortDisplayFields?: unknown })
                      ?.shortDisplayFields,
                  ),
                  geometryField: (
                    data.searchSettings as { geometryField?: string }
                  )?.geometryField,
                  outputFormat: (
                    data.searchSettings as { outputFormat?: string }
                  )?.outputFormat,
                },
                infoClickSettings: {
                  definition: (
                    data.infoClickSettings as { definition?: string }
                  )?.definition,
                  icon: (data.infoClickSettings as { icon?: string })?.icon,
                  format: (data.infoClickSettings as { format?: string })
                    ?.format,
                  sortProperty: (
                    data.infoClickSettings as { sortProperty?: string }
                  )?.sortProperty,
                  sortMethod: (
                    data.infoClickSettings as { sortMethod?: string }
                  )?.sortMethod,
                },
                options: {
                  keyword: (data.options as { keyword?: string })?.keyword,
                  category: (data.options as { category?: string })?.category,
                  layerDisplayDescription: (
                    data.options as { layerDisplayDescription?: string }
                  )?.layerDisplayDescription,
                } as Record<string, unknown>,
                selectedLayers: selectedRowObjects,
              };

              if (
                selectedRowObjects !== undefined &&
                selectedRowObjects.length === 0
              ) {
                toast.warning(t("layers.noLayersSelected"), {
                  position: "bottom-left",
                  theme: palette.mode,
                  hideProgressBar: true,
                });
                return;
              }

              void handleUpdateLayer(normalized);
            })(e);
          }}
          formRef={formRef}
          noValidate={false}
        >
          <Box sx={{ display: activeTab === "general" ? "block" : "none" }}>
            <FormPanel title={t("common.information")}>
              <Grid container rowSpacing={2}>
                <Grid size={12}>
                  <TextField
                    label={t("common.name")}
                    fullWidth
                    {...register("name", {
                      required: `${t("common.required")}`,
                    })}
                    error={!!errors.name}
                    helperText={
                      (errors.name as unknown as { message?: string })?.message
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <Controller
                    name="serviceId"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel id="serviceId-label">
                          {t("layers.common.service")}
                        </InputLabel>
                        <Select
                          labelId="serviceId-label"
                          label={t("layers.common.service")}
                          {...field}
                          value={(field.value as string) ?? ""}
                        >
                          {(services ?? []).map((service) => (
                            <MenuItem key={service.id} value={service.id}>
                              {service.name}({service.type})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                {service && (
                  <Grid size={12}>
                    <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                      <Typography variant="body2" component="span">
                        {t("layers.serviceConnectionSummary", {
                          type: service.type,
                          url: service.url,
                          version: service.version,
                          imageFormat: service.imageFormat,
                          projection: service.projection?.code ?? "—",
                        })}
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("layers.internalName")}
                    fullWidth
                    {...register("internalName")}
                  />
                </Grid>
                <Grid size={10}>
                  <TextField
                    label={t("layers.copyRight")}
                    fullWidth
                    {...register("metadata.attribution")}
                  />
                </Grid>
                <Grid size={10}>
                  <TextField
                    label={t("map.description")}
                    fullWidth
                    multiline
                    rows={3}
                    {...register("description")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("layers.keyword")}
                    fullWidth
                    {...register("options.keyword")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextField
                    label={t("layers.category")}
                    fullWidth
                    {...register("options.category")}
                  />
                </Grid>
              </Grid>
            </FormPanel>

            <FormPanel title={t("layers.permissions")}>
              <FormControl fullWidth>
                <InputLabel id="roleId-label">
                  {t("layers.permission")}
                </InputLabel>
                <Controller
                  name="roleId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      labelId="roleId-label"
                      label={t("layers.permission")}
                      {...field}
                      value={(field.value as string) ?? ""}
                    >
                      {(roles ?? []).map((role) => (
                        <MenuItem key={role.id} value={role.id}>
                          {role.title}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </FormPanel>
          </Box>

          <Box sx={{ display: activeTab === "display" ? "block" : "none" }}>
            <FormPanel title={t("services.settings.request")}>
              <Grid container rowSpacing={2}>
                <Grid size={12}>
                  <FormGroup>
                    <Controller
                      name="hidpi"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(field.value as boolean)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          }
                          label={t("layers.hidpi")}
                        />
                      )}
                    />
                    <Controller
                      name="singleTile"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(field.value as boolean)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          }
                          label="Single tile"
                        />
                      )}
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            </FormPanel>

            <FormPanel title={t("layers.customDpi")}>
              <Grid container rowSpacing={2}>
                <Grid size={12}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Controller
                          name="useCustomDpiList"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              {...field}
                              checked={Boolean(field.value as boolean)}
                              onChange={(e) => {
                                field.onChange(e.target.checked);
                                setUseCustomDpiList(e.target.checked);
                              }}
                            />
                          )}
                        />
                      }
                      label={t("layers.useCustomDpiList")}
                    />
                  </FormGroup>
                </Grid>
                {useCustomDpiList && (
                  <Grid container rowSpacing={2}>
                    {customDpiList.map((item, index) => (
                      <Grid size={12} key={index}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <TextField
                            label={t("layers.pxRatio")}
                            type="number"
                            value={item.pxRatio}
                            onChange={(e) =>
                              handleUpdateDpiList(
                                index,
                                "pxRatio",
                                e.target.value,
                              )
                            }
                            sx={{ width: 150 }}
                          />
                          <TextField
                            label={t("layers.dpi")}
                            type="number"
                            value={item.dpi}
                            onChange={(e) =>
                              handleUpdateDpiList(index, "dpi", e.target.value)
                            }
                            sx={{ width: 150 }}
                          />
                          <IconButton
                            onClick={() => handleRemoveDpiListRow(index)}
                            disabled={customDpiList.length <= 1}
                            color="error"
                            aria-label={t("common.delete")}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Grid>
                    ))}
                    <Grid size={12}>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleAddDpiListRow}
                      >
                        {t("layers.addDpiRow")}
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </FormPanel>

            <FormPanel title={t("layers.settings")}>
              <Grid container rowSpacing={2}>
                <Grid size={12}>
                  <FormControl fullWidth>
                    <InputLabel id="style-label">
                      {t("layers.style")}
                    </InputLabel>
                    <Controller
                      name="style"
                      control={control}
                      render={({ field }) => (
                        <Select
                          labelId="style-label"
                          label={t("layers.style")}
                          {...field}
                          value={(field.value as string) ?? ""}
                        >
                          <MenuItem value="">{"<default>"}</MenuItem>
                          {(styles ?? []).map((s) => (
                            <MenuItem key={s.name} value={s.name}>
                              {s.name}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t("layers.opacity")}
                    fullWidth
                    type="number"
                    {...register("opacity")}
                  />
                </Grid>
              </Grid>
            </FormPanel>

            <FormPanel title={t("layers.settings.displayFields")}>
              <Grid container rowSpacing={2}>
                <Grid size={12}>
                  <TextField
                    label={t("layers.primaryDisplayFields")}
                    fullWidth
                    {...register("searchSettings.primaryDisplayFields")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t("layers.secondaryDisplayFields")}
                    fullWidth
                    {...register("searchSettings.secondaryDisplayFields")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t("layers.shortDisplayFields")}
                    fullWidth
                    {...register("searchSettings.shortDisplayFields")}
                  />
                </Grid>
              </Grid>
            </FormPanel>

            <FormPanel title={t("common.infobutton")}>
              <Grid container rowSpacing={2}>
                <Grid size={12}>
                  <FormGroup>
                    <Controller
                      name="showMetadata"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(field.value as boolean)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          }
                          label={t("layers.showMetadata")}
                        />
                      )}
                    />
                  </FormGroup>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t("layers.metadata.title")}
                    fullWidth
                    {...register("metadata.title")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t("layers.metadata.urlTitle")}
                    fullWidth
                    {...register("metadata.urlTitle")}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Url"
                    fullWidth
                    {...register("metadata.url")}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label={t("layers.layerDisplayDescription")}
                    fullWidth
                    multiline
                    rows={3}
                    {...register("options.layerDisplayDescription")}
                  />
                </Grid>
              </Grid>
            </FormPanel>
          </Box>

          <Box sx={{ display: activeTab === "infoclick" ? "block" : "none" }}>
            <FormPanel title={t("common.infoclick")}>
              <Grid container rowSpacing={2}>
                <Grid size={12}>
                  <FormGroup>
                    <Controller
                      name="infoClickActive"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(field.value as boolean)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          }
                          label={t("common.infoclick")}
                        />
                      )}
                    />
                  </FormGroup>
                </Grid>
                <Grid size={12}>
                  <TextField
                    label={t("layers.infobox")}
                    fullWidth
                    multiline
                    rows={3}
                    {...register("infoClickSettings.definition")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t("layers.infoClickIcon")}
                    fullWidth
                    {...register("infoClickSettings.icon")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t("layers.sortByAttribute")}
                    fullWidth
                    {...register("infoClickSettings.sortProperty")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="format-label">
                      {t("layers.infoClickFormat")}
                    </InputLabel>
                    <Controller
                      name="infoClickSettings.format"
                      control={control}
                      render={({ field }) => (
                        <Select
                          labelId="format-label"
                          label={t("layers.infoClickFormat")}
                          {...field}
                          value={(field.value as string) ?? ""}
                        >
                          {infoClickFormat.map((format) => (
                            <MenuItem key={format.value} value={format.value}>
                              {format.title}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="sortMethod-label">
                      {t("layers.infoClickSortMethod")}
                    </InputLabel>
                    <Controller
                      name="infoClickSettings.sortMethod"
                      control={control}
                      render={({ field }) => (
                        <Select
                          labelId="sortMethod-label"
                          label={t("layers.infoClickSortMethod")}
                          {...field}
                          value={(field.value as string) ?? ""}
                        >
                          {sortType.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.title}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
              </Grid>
            </FormPanel>

            <FormPanel title={t("layers.settings.searchSettings")}>
              <Grid container rowSpacing={2}>
                <Grid size={12}>
                  <FormGroup>
                    <Controller
                      name="searchSettings.active"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(field.value as boolean)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          }
                          label={t("layers.searchSettings.active")}
                        />
                      )}
                    />
                  </FormGroup>
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Url"
                    fullWidth
                    helperText={
                      service &&
                      [
                        SERVICE_TYPE.WFS,
                        SERVICE_TYPE.WFST,
                        SERVICE_TYPE.VECTOR,
                      ].includes(service.type)
                        ? t("layers.searchSettings.urlServiceHint", {
                            url: service.url,
                          })
                        : undefined
                    }
                    {...register("searchSettings.url")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="outputFormat-label">
                      {t("layers.searchSettings.outputFormat")}
                    </InputLabel>
                    <Controller
                      name="searchSettings.outputFormat"
                      control={control}
                      render={({ field }) => (
                        <Select
                          labelId="outputFormat-label"
                          label={t("layers.searchSettings.outputFormat")}
                          {...field}
                          value={(field.value as string) ?? ""}
                        >
                          {searchOutputFormat.map((format) => (
                            <MenuItem key={format} value={format}>
                              {format}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t("layers.searchSettings.geometryField")}
                    fullWidth
                    {...register("searchSettings.geometryField")}
                  />
                </Grid>
              </Grid>
            </FormPanel>
          </Box>

          <Box sx={{ display: activeTab === "layers" ? "block" : "none" }}>
            {layer && (
              <AvailableLayersGrid
                isLoading={serviceLoading || capabilitiesLoading}
                isError={capabilitiesError}
                onRetry={() => void refetchCapabilities()}
                getCapLayers={getCapLayers}
                selectedLayers={layer?.selectedLayers ?? []}
                filteredLayers={filteredLayers}
                setSearchTerm={setSearchTerm}
                setSelectGridId={setSelectGridId}
                searchTerm={searchTerm}
                selectGridId={selectGridId}
                selectedRowObjects={selectedRowObjects}
                onLayerClick={handleLayerClick}
              />
            )}
          </Box>

          <Box sx={{ display: activeTab === "maps" ? "block" : "none" }}>
            <UsedInMapsGrid layerId={layerId ?? ""} />
          </Box>
        </FormContainer>
      </FormActionPanel>
      <LayerInfoClickModal
        open={openInfoClickModal}
        layerName={selectedInfoClickLayer}
        onClose={handleCloseModal}
        onSave={(data) => {
          void handleSaveLayerInfoClick(data);
        }}
        initialValues={(() => {
          // Get per-layer-instance settings from options.layersInfo, fallback to main layer settings
          const layersInfo =
            (layer?.options?.layersInfo as Record<
              string,
              {
                caption?: string;
                legendIcon?: string;
                style?: string;
                queryable?: boolean;
                infoclickIcon?: string;
                searchDisplayName?: string;
                secondaryLabelFields?: string;
                searchShortDisplayName?: string;
                searchUrl?: string;
                searchPropertyName?: string;
                searchOutputFormat?: string;
                searchGeometryField?: string;
                definition?: string;
                format?: string;
                sortProperty?: string;
                sortMethod?: string;
                sortDescending?: boolean;
              }
            >) ?? {};
          const layerInstanceSettings =
            selectedInfoClickLayer && layersInfo[selectedInfoClickLayer]
              ? layersInfo[selectedInfoClickLayer]
              : {};

          return {
            caption: layerInstanceSettings.caption ?? "",
            legendIcon:
              layerInstanceSettings.legendIcon ?? layer?.legendIconUrl ?? "",
            style: layerInstanceSettings.style ?? layer?.style ?? "",
            queryable:
              layerInstanceSettings.queryable ??
              layer?.infoClickActive ??
              false,
            infoclickIcon:
              layerInstanceSettings.infoclickIcon ??
              layer?.infoClickSettings?.icon ??
              "",
            searchDisplayName:
              layerInstanceSettings.searchDisplayName ??
              layer?.searchSettings?.primaryDisplayFields?.join(", ") ??
              "",
            secondaryLabelFields:
              layerInstanceSettings.secondaryLabelFields ??
              layer?.searchSettings?.secondaryDisplayFields?.join(", ") ??
              "",
            searchShortDisplayName:
              layerInstanceSettings.searchShortDisplayName ??
              layer?.searchSettings?.shortDisplayFields?.join(", ") ??
              "",
            searchUrl:
              layerInstanceSettings.searchUrl ??
              layer?.searchSettings?.url ??
              "",
            searchPropertyName:
              layerInstanceSettings.searchPropertyName ??
              layer?.searchSettings?.searchFields?.join(", ") ??
              "",
            searchOutputFormat:
              layerInstanceSettings.searchOutputFormat ??
              layer?.searchSettings?.outputFormat ??
              "",
            searchGeometryField:
              layerInstanceSettings.searchGeometryField ??
              layer?.searchSettings?.geometryField ??
              "",
            definition:
              layerInstanceSettings.definition ??
              layer?.infoClickSettings?.definition ??
              "",
            format:
              layerInstanceSettings.format ??
              layer?.infoClickSettings?.format ??
              "application/json",
            sortProperty:
              layerInstanceSettings.sortProperty ??
              layer?.infoClickSettings?.sortProperty ??
              "",
            sortMethod:
              layerInstanceSettings.sortMethod ??
              layer?.infoClickSettings?.sortMethod ??
              "text",
            sortDescending:
              layerInstanceSettings.sortDescending ??
              layer?.infoClickSettings?.sortDescending ??
              false,
          };
        })()}
        availableStyles={
          selectedInfoClickLayer && getCapStyles[selectedInfoClickLayer]
            ? getCapStyles[selectedInfoClickLayer]
            : []
        }
      />
    </Page>
  );
}
