import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  TextField,
  Typography,
  useTheme,
  IconButton,
  Button,
  Dialog,
  DialogContent,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import CircularProgress from "../../components/progress/circular-progress";
import { DataGrid } from "@mui/x-data-grid";
import { useTranslation } from "react-i18next";
import { LayersGridProps, useLayersByServiceId } from "../../api/services";
import { GRID_SWEDISH_LOCALE_TEXT } from "../../i18n/translations/datagrid/sv";
import useAppStateStore from "../../store/use-app-state-store";
import { useCreateLayer, LayerCreateInput } from "../../api/layers";
import { SERVICE_TYPE } from "../../api/services/types";

function LayersGrid({
  layers,
  serviceId,
  isError,
  isLoading,
  type,
}: LayersGridProps) {
  const { palette } = useTheme();
  const { t } = useTranslation();
  const [dialogSearchTerm, setDialogSearchTerm] = useState("");
  const [serviceLayerSearch, setServiceLayerSearch] = useState("");
  const language = useAppStateStore((state) => state.language);
  const themeMode = useAppStateStore((state) => state.themeMode);
  const isDarkMode = themeMode === "dark";
  const { mutateAsync: createLayer } = useCreateLayer(serviceId ?? "");
  const [selectedRowObjects, setSelectedRowObjects] = useState<string[]>();
  const { data: layersByService, isLoading: isLoadingLayersByService } =
    useLayersByServiceId(serviceId);
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleClose = () => {
    setOpen(false);
    setSelectedRowObjects(undefined);
  };

  const capabilitiesColumns = [
    { field: "layer", headerName: t("common.layerName"), flex: 1 },
    { field: "infoClick", headerName: t("common.infoclick"), flex: 0.3 },
    { field: "publications", headerName: t("common.publications"), flex: 0.5 },
  ];

  // Capabilities layers filtered by dialog search
  const filteredCapabilityLayers = useMemo(() => {
    if (!layers) return [];
    return layers
      .map((layer, index) => {
        const isSelected = selectedRowObjects?.some(
          (selected) => selected.toLowerCase() === layer.toLowerCase()
        );
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
          layer?.selected ||
          layer.layer.toLowerCase().includes(dialogSearchTerm.toLowerCase())
      );
  }, [layers, dialogSearchTerm, selectedRowObjects]);

  // Existing service layers filtered by main search
  const filteredLayersByService = useMemo(() => {
    if (!layersByService?.layers) return [];
    return layersByService.layers
      .filter((layer) =>
        layer.name.toLowerCase().includes(serviceLayerSearch.toLowerCase())
      )
      .map((layer) => ({ id: layer.id, name: layer.name }));
  }, [layersByService?.layers, serviceLayerSearch]);

  const handleCreateLayer = async (layer: LayerCreateInput) => {
    try {
      const response = await createLayer({
        serviceId,
        selectedLayers: layer.selectedLayers ?? [],
      });
      void navigate(
        type === SERVICE_TYPE.WMS
          ? "/display-layers/" + response?.id
          : type === SERVICE_TYPE.WFS
            ? "/search-layers/" + response?.id
            : type === SERVICE_TYPE.WFST
              ? "/editing-layers/" + response?.id
              : "/display-layers/" + response?.id
      );
    } catch (error) {
      console.error("Failed to create layer:", error);
    }
  };

  const hasExistingLayers = (layersByService?.layers?.length ?? 0) > 0;

  return (
    <Paper
      sx={{
        width: "100%",
        p: 2,
        mb: 3,
        backgroundColor: isDarkMode ? "#121212" : "#efefef",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.5,
          mt: -0.5,
        }}
      >
        <Typography variant="h6">
          {t("services.publishedLayers")}
        </Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          {hasExistingLayers
            ? t("layers.createNewLayer")
            : t("services.publishLayer")}
        </Button>
      </Box>

      <TextField
        sx={{
          mb: 3,
          mt: 1,
          width: "100%",
          maxWidth: "400px",
          backgroundColor: isDarkMode ? "#3b3b3b" : "#fbfbfb",
        }}
        label={t("layers.searchTitle")}
        variant="outlined"
        value={serviceLayerSearch}
        onChange={(e) => setServiceLayerSearch(e.target.value)}
        slotProps={{
          input: { endAdornment: <SearchIcon /> },
        }}
      />

      {!hasExistingLayers && (
        <Typography sx={{ textAlign: "center", fontSize: "large", mt: 1 }}>
          {t("services.layerInServiceNone")}
        </Typography>
      )}

      {hasExistingLayers && (
          <DataGrid
            sx={{
              maxWidth: "100%",
              mb: 2,
              mt: 1,
              height: 400,
              backgroundColor: isDarkMode ? "#3b3b3b" : "#fbfbfb",
              "& .MuiDataGrid-row": { cursor: "pointer" },
            }}
            rows={filteredLayersByService}
            columns={[{ field: "name", headerName: t("common.name"), flex: 1 }]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            slotProps={{
              loadingOverlay: {
                variant: "skeleton",
                noRowsVariant: "skeleton",
              },
            }}
            hideFooterPagination={(layersByService?.layers?.length ?? 0) < 10}
            pageSizeOptions={[10, 25, 50, 100]}
            pagination
            loading={isLoadingLayersByService}
            localeText={
              language === "sv" ? GRID_SWEDISH_LOCALE_TEXT : undefined
            }
            onRowClick={({ row }) => {
              const id = row.id as string;
              void navigate(
                type === SERVICE_TYPE.WFS
                  ? `/search-layers/${id}`
                  : type === SERVICE_TYPE.WFST
                    ? `/editing-layers/${id}`
                    : `/display-layers/${id}`
              );
            }}
            disableMultipleRowSelection
            disableRowSelectionOnClick
          />
      )}

      <Dialog open={open} fullWidth onClose={handleClose} maxWidth="lg">
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              mb: 1,
            }}
          >
            <TextField
              sx={{
                mt: 1,
                width: "100%",
                maxWidth: "400px",
                backgroundColor: isDarkMode ? "#3b3b3b" : "#fbfbfb",
              }}
              label={t("layers.searchTitle")}
              variant="outlined"
              value={dialogSearchTerm}
              onChange={(e) => setDialogSearchTerm(e.target.value)}
              slotProps={{
                input: { endAdornment: <SearchIcon /> },
              }}
            />
            <IconButton onClick={handleClose} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>

          <Button
            variant="contained"
            onClick={() => {
              if (!selectedRowObjects || selectedRowObjects.length === 0) return;
              void handleCreateLayer({
                serviceId,
                selectedLayers: selectedRowObjects,
              });
            }}
            disabled={!selectedRowObjects || selectedRowObjects.length === 0}
            sx={{ display: "block", mb: 1 }}
          >
            {t("common.create")}
          </Button>

          {(!selectedRowObjects || selectedRowObjects.length === 0) && (
            <Typography align="center" color={palette.error.main} sx={{ mb: 1 }}>
              {!isLoading && !isError && t("services.atLeastOneLayerRequired")}
            </Typography>
          )}

          {isLoading ? (
            <CircularProgress
              color="primary"
              size={40}
              typographyText={t("services.loadingLayers")}
            />
          ) : isError ? (
            <Typography align="center" color={palette.error.main}>
              {t("services.error.url")}
            </Typography>
          ) : filteredCapabilityLayers.length === 0 ? (
            <Typography align="center" color={palette.error.main}>
              {t("services.error.layers")}
            </Typography>
          ) : (
              <DataGrid
                onRowSelectionModelChange={(ids) => {
                  const selectedRowsData = ids.map((id) =>
                    filteredCapabilityLayers.find((row) => row.id === id)
                  );
                  setSelectedRowObjects(
                    selectedRowsData.map((row) => row?.layer ?? "")
                  );
                }}
                sx={{
                  maxWidth: "100%",
                  mb: 2,
                  mt: 1,
                  height: 400,
                  backgroundColor: isDarkMode ? "#3b3b3b" : "#fbfbfb",
                }}
                rows={filteredCapabilityLayers}
                columns={capabilitiesColumns}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10 } },
                }}
                slotProps={{
                  loadingOverlay: {
                    variant: "skeleton",
                    noRowsVariant: "skeleton",
                  },
                }}
                hideFooterPagination={layers && layers.length < 10}
                pageSizeOptions={[10, 25, 50, 100]}
                pagination
                loading={isLoading}
                localeText={
                  language === "sv" ? GRID_SWEDISH_LOCALE_TEXT : undefined
                }
                checkboxSelection
                disableRowSelectionOnClick
              />
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
}

export default LayersGrid;
