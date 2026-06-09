import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import Grid from "@mui/material/Grid";
import { Box, Chip, TextField, Tooltip, Typography } from "@mui/material";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import { useTranslation } from "react-i18next";
import Page from "../../../layouts/root/components/page";
import { useTools, Tool } from "../../../api/tools";
import StyledDataGrid from "../../../components/data-grid";

function ToolUsedInMapsCell({
  count,
  mapNames,
}: {
  count: number;
  mapNames: string[];
}) {
  const { t } = useTranslation();

  if (count === 0) {
    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          height: "100%",
          color: "text.disabled",
        }}
      >
        <MapOutlinedIcon sx={{ fontSize: 18, opacity: 0.55 }} />
        <Typography variant="body2" color="text.disabled">
          0
        </Typography>
      </Box>
    );
  }

  return (
    <Tooltip
      enterDelay={400}
      slotProps={{ tooltip: { sx: { maxWidth: 280 } } }}
      title={
        <Box sx={{ py: 0.25 }}>
          <Typography
            variant="caption"
            sx={{ display: "block", fontWeight: 600, mb: 0.75 }}
          >
            {t("common.usedInMaps")}
          </Typography>
          {mapNames.map((mapName) => (
            <Typography
              key={mapName}
              variant="caption"
              sx={{ display: "block" }}
            >
              {mapName}
            </Typography>
          ))}
        </Box>
      }
    >
      <Box
        component="span"
        sx={{ display: "inline-flex", alignItems: "center", height: "100%" }}
      >
        <Chip
          icon={<MapOutlinedIcon />}
          label={count}
          size="small"
          color="primary"
          variant="outlined"
          sx={{
            height: 26,
            fontWeight: 600,
            "& .MuiChip-icon": { fontSize: 16, ml: 0.75 },
            "& .MuiChip-label": { px: 0.75 },
          }}
        />
      </Box>
    </Tooltip>
  );
}

interface ToolsListProps {
  filterTools: (tools: Tool[]) => Tool[];
  pageTitleKey: string;
  baseRoute: string;
}

export default function ToolsList({
  filterTools,
  pageTitleKey,
  baseRoute,
}: ToolsListProps) {
  const { t } = useTranslation();
  const { data: tools, isLoading } = useTools();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>("");

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredTools = useMemo(() => {
    if (!tools) return [];

    // First apply the specific filter for this page type
    const typeFilteredTools = filterTools(tools);

    // Then apply search filter
    const searchFilter = (tool: Tool) => {
      const rawTitle = tool.options?.title;
      const titleText =
        typeof rawTitle === "string" || typeof rawTitle === "number"
          ? String(rawTitle)
          : "";
      const combinedText = `${tool.type} ${titleText}`.toLowerCase();
      return combinedText.includes(searchTerm.toLowerCase());
    };

    return typeFilteredTools.filter(searchFilter);
  }, [tools, searchTerm, filterTools]);

  return (
    <Page title={t(pageTitleKey)}>
      {isLoading ? (
        <Typography variant="h6">{t("common.loading")}</Typography>
      ) : (
        <>
          <Grid size={12} container sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label={t("tools.searchTitle")}
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </Grid>

          <Grid size={12}>
            <StyledDataGrid
              storageKey="tools"
              customSx={{ height: "calc(100vh - 320px)" }}
              rows={filteredTools}
              columns={[
                {
                  field: "options",
                  headerName: "Titel",
                  flex: 0.3,
                  valueGetter: (params: { title: string }) => {
                    return params ? params.title : null;
                  },
                },
                {
                  field: "type",
                  headerName: "Beskrivning",
                  flex: 0.4,
                },
                {
                  field: "mapsCount",
                  headerName: t("tools.usedInHajk"),
                  flex: 0.4,
                  align: "center",
                  headerAlign: "center",
                  renderCell: (params: { row: Tool }) => (
                    <ToolUsedInMapsCell
                      count={params.row.mapsCount}
                      mapNames={params.row.mapNames}
                    />
                  ),
                },
                {
                  field: "lastSavedDate",
                  flex: 0.3,
                  headerName: t("common.lastSaved"),
                  valueFormatter: (value: string) =>
                    value ? new Date(value).toLocaleDateString("sv-SE") : "–",
                },
                {
                  field: "actions",
                  headerName: t("common.actions"),
                  flex: 0.2,
                },
              ]}
              onRowClick={({ row }) => {
                const toolName: string = row.type;
                if (toolName) {
                  void navigate(`${baseRoute}/${toolName}`);
                }
              }}
            />
          </Grid>
        </>
      )}
    </Page>
  );
}
