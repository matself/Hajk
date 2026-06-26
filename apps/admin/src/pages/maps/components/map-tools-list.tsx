import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import type { GridRenderCellParams } from "@mui/x-data-grid";
import { useTranslation } from "react-i18next";
import type { ToolOnMap } from "../../../api/maps";
import StyledDataGrid from "../../../components/data-grid";
import {
  getToolDisplayName,
  getToolPlacementLabelKey,
} from "../map-tools-utils";

interface MapToolsListProps {
  mapTools: ToolOnMap[];
}

export default function MapToolsList({ mapTools }: MapToolsListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const rows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return mapTools
      .slice()
      .sort((a, b) => a.index - b.index)
      .filter((tool) => {
        if (!query) return true;
        const title = getToolDisplayName(tool).toLowerCase();
        return (
          title.includes(query) ||
          tool.tool.type.toLowerCase().includes(query)
        );
      })
      .map((tool) => ({
        id: tool.toolId,
        toolId: tool.toolId,
        title: getToolDisplayName(tool),
        type: tool.tool.type,
        index: tool.index,
        placementKey: getToolPlacementLabelKey(tool),
        tool,
      }));
  }, [mapTools, searchTerm]);

  return (
    <Box>
      <Box sx={{ mb: 2, width: { xs: "100%", sm: "50%", md: "33%" } }}>
        <TextField
          fullWidth
          label={t("tools.searchTitle")}
          variant="outlined"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </Box>

      {rows.length === 0 ? (
        <Typography color="text.secondary">
          {t("maps.toolsListEmpty")}
        </Typography>
      ) : (
        <StyledDataGrid
          storageKey="map-tools"
          customSx={{ height: "calc(100vh - 380px)" }}
          rows={rows}
          columns={[
            {
              field: "title",
              flex: 0.35,
              headerName: t("tools.title"),
            },
            {
              field: "type",
              flex: 0.25,
              headerName: t("tools.type"),
            },
            {
              field: "placementKey",
              flex: 0.25,
              headerName: t("tools.placement"),
              valueGetter: (_value, row) => t(row.placementKey as never),
            },
            {
              field: "index",
              width: 90,
              headerName: t("maps.toolsOrder"),
              align: "center",
              headerAlign: "center",
            },
            {
              field: "actions",
              headerName: "",
              width: 56,
              sortable: false,
              filterable: false,
              disableColumnMenu: true,
              align: "center",
              renderCell: (params: GridRenderCellParams<(typeof rows)[number]>) => (
                <Tooltip title={t("common.settings")}>
                  <IconButton
                    size="small"
                    aria-label={t("common.settings")}
                    onClick={() => void navigate(`/tools/${params.row.toolId}`)}
                  >
                    <SettingsIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ),
            },
          ]}
        />
      )}
    </Box>
  );
}
