import { useState, useMemo } from "react";
import { TextField, Typography, Paper } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useTranslation } from "react-i18next";
import SearchIcon from "@mui/icons-material/Search";
import { GRID_SWEDISH_LOCALE_TEXT } from "../../i18n/translations/datagrid/sv";
import useAppStateStore from "../../store/use-app-state-store";
import { useLayerUsage } from "../../api/layers";

function UsedInMapsGrid({ layerId }: { layerId: string }) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const language = useAppStateStore((state) => state.language);
  const themeMode = useAppStateStore((state) => state.themeMode);
  const isDarkMode = themeMode === "dark";

  const { data: usage = [], isLoading } = useLayerUsage(layerId);

  const filtered = useMemo(
    () =>
      usage
        .filter((u) => {
          const term = searchTerm.toLowerCase();
          const mapName = u.map?.name ?? u.group?.maps.map((m) => m.mapName).join(" ") ?? "";
          const groupName = u.group?.name ?? "";
          return (
            mapName.toLowerCase().includes(term) ||
            groupName.toLowerCase().includes(term)
          );
        })
        .map((u) => ({
          id: u.id,
          map: u.map?.name ?? u.group?.maps.map((m) => m.mapName).join(", ") ?? "—",
          group: u.group?.name ?? "—",
          usage: t(`common.usage.${u.usage}`),
        })),
    [usage, searchTerm, t],
  );

  const columns: GridColDef[] = [
    { field: "map", headerName: t("common.map"), flex: 1 },
    { field: "group", headerName: t("common.group"), flex: 1 },
    { field: "usage", headerName: t("common.usage"), flex: 0.5 },
  ];

  return (
    <Paper
      sx={{
        width: "100%",
        p: 2,
        mb: 3,
        backgroundColor: isDarkMode ? "#121212" : "#efefef",
      }}
    >
      <Typography variant="h6" sx={{ mt: -0.5, mb: 1.5 }}>
        {t("common.usedInMaps")}
      </Typography>
      <TextField
        sx={{
          mb: 3,
          mt: 1,
          width: "100%",
          maxWidth: "400px",
          backgroundColor: isDarkMode ? "#3b3b3b" : "#fbfbfb",
        }}
        label={t("common.search")}
        variant="outlined"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        slotProps={{ input: { endAdornment: <SearchIcon /> } }}
      />
      {!isLoading && filtered.length === 0 ? (
        <Typography sx={{ textAlign: "center", fontSize: "large", mt: 1 }}>
          {t("layers.usedInMapsNone")}
        </Typography>
      ) : (
        <DataGrid
          sx={{
            maxWidth: "100%",
            mb: 2,
            mt: 1,
            height: "auto",
            backgroundColor: isDarkMode ? "#3b3b3b" : "#fbfbfb",
          }}
          rows={filtered}
          columns={columns}
          loading={isLoading}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          slotProps={{
            loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" },
          }}
          hideFooter={filtered.length <= 10}
          pageSizeOptions={[10, 25, 50, 100]}
          pagination
          localeText={language === "sv" ? GRID_SWEDISH_LOCALE_TEXT : undefined}
          disableRowSelectionOnClick
        />
      )}
    </Paper>
  );
}

export default UsedInMapsGrid;
