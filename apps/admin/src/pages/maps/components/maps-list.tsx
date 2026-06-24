import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import Grid from "@mui/material/Grid";
import { Button, Box, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import Page from "../../../layouts/root/components/page";
import type { Map as MapRecord } from "../../../api/maps/types";
import { useMaps } from "../../../api/maps";
import CreateButton from "../../../components/create-button";
import { SquareSpinnerComponent } from "../../../components/progress/square-progress";
import StyledDataGrid from "../../../components/data-grid";
import { GridColDef } from "@mui/x-data-grid";
import MoreIcon from "@mui/icons-material/More";
import { useDebounce } from "use-debounce";
import CreateMapDialog from "./create-map-dialog";

interface MapsListProps {
  filterMaps: (maps: MapRecord[]) => MapRecord[];
  showCreateButton?: boolean;
  pageTitleKey: string;
  baseRoute: string;
}

export default function MapsList({
  filterMaps,
  showCreateButton = true,
  pageTitleKey,
  baseRoute,
}: MapsListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: maps, isLoading } = useMaps();

  const [searchString, setSearchString] = useState("");
  const [debouncedSearchString] = useDebounce(searchString, 200);
  const [open, setOpen] = useState<boolean>(false);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchString(event.target.value);
  };

  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  const filteredMaps = useMemo(() => {
    if (!maps) return [];

    // First apply the specific filter for this page type
    const typeFilteredMaps = filterMaps(maps);

    // Then apply search filter
    const searchFilter = (map: MapRecord) => {
      return (
        debouncedSearchString === "" ||
        Object.values(map).some((value) => {
          return (
            ((typeof value === "string" &&
              value
                .toLowerCase()
                .includes(debouncedSearchString.toLowerCase())) ||
              (value &&
                typeof value === "object" &&
                Object.values(map).some(
                  (v) =>
                    typeof v === "string" &&
                    v
                      .toLowerCase()
                      .includes(debouncedSearchString.toLowerCase()),
                ))) ??
            (typeof map === "object" &&
              typeof map.options === "object" &&
              Object.values(map.options).some(
                (v) =>
                  typeof v === "string" &&
                  v.toLowerCase().includes(debouncedSearchString.toLowerCase()),
              ))
          );
        })
      );
    };

    return typeFilteredMaps.filter(searchFilter);
  }, [maps, debouncedSearchString, filterMaps]);

  const columns: GridColDef<MapRecord>[] = [
    { field: "name", flex: 1, headerName: t("map.name") },
    {
      field: "description",
      flex: 1,
      headerName: t("map.description"),
      valueGetter: (_value, row) =>
        row.options?.description ?? "(to be implemented)",
    },
    {
      field: "title",
      flex: 1,
      headerName: t("map.title"),
      valueGetter: (_value, row) => {
        return row.options?.title;
      },
    },
    { field: "locked", flex: 1, headerName: t("map.locked") },
    {
      field: "lastSavedDate",
      flex: 0.8,
      headerName: t("common.lastSaved"),
      valueFormatter: (value: string) =>
        value ? new Date(value).toLocaleDateString("sv-SE") : "–",
    },
    {
      field: "more",
      headerName: "",
      flex: 0.2,
      renderCell: () => (
        <Button
          color="info"
          size="small"
          //   onClick={() => {}}
        >
          <MoreIcon />
        </Button>
      ),
    },
  ];

  return (
    <Page
      title={t(pageTitleKey)}
      actionButtons={
        showCreateButton ? (
          <CreateButton onClick={handleClickOpen} label={t("map.createMap")} />
        ) : undefined
      }
    >
      <CreateMapDialog
        open={open}
        onClose={handleClose}
        baseRoute={baseRoute}
        existingMaps={maps ?? []}
      />
      {isLoading ? (
        <SquareSpinnerComponent />
      ) : (
        <>
          <Box sx={{ mb: 2, width: { xs: "100%", sm: "50%", md: "33%" } }}>
            <TextField
              fullWidth
              label={t("map.searchTitle")}
              variant="outlined"
              value={searchString}
              onChange={handleSearchChange}
            />
          </Box>

          <Grid size={12}>
            <StyledDataGrid<MapRecord>
              storageKey="maps"
              customSx={{ height: "calc(100vh - 320px)" }}
              onRowClick={({ row }) => {
                const id = row.id;
                if (id !== undefined && id !== null) {
                  void navigate(`${baseRoute}/${id}`);
                }
              }}
              rows={filteredMaps}
              columns={columns}
              loading={isLoading}
            />
          </Grid>
        </>
      )}
    </Page>
  );
}
