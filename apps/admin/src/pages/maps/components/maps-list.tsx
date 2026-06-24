import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import Grid from "@mui/material/Grid";
import { Button, Box, TextField, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { isAxiosError } from "axios";
import Page from "../../../layouts/root/components/page";
import type { Map as MapRecord } from "../../../api/maps/types";
import type { MapCreateInput } from "../../../api/maps/map-create-types";
import { useMaps, useCreateMap } from "../../../api/maps";
import DialogWrapper from "../../../components/flexible-dialog";
import CreateButton from "../../../components/create-button";
import { SquareSpinnerComponent } from "../../../components/progress/square-progress";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
import StyledDataGrid from "../../../components/data-grid";
import { GridColDef } from "@mui/x-data-grid";
import MoreIcon from "@mui/icons-material/More";
import { useDebounce } from "use-debounce";
import type { ApiValidationDetail } from "../../../lib/internal-api-client";

interface MapCreateFormValues {
  name: string;
  locked: boolean;
  options: {
    title: string;
    description: string;
  };
}

interface MapsListProps {
  filterMaps: (maps: MapRecord[]) => MapRecord[];
  showCreateButton?: boolean;
  pageTitleKey: string;
  baseRoute: string;
}

interface MapCreateErrorBody {
  errorId?: string;
  error?: string;
  details?: ApiValidationDetail[];
}

function getCreateMapErrorMessage(error: unknown, t: TFunction): string {
  if (!isAxiosError<MapCreateErrorBody>(error) || !error.response) {
    return t("maps.createMapFailed");
  }

  const status = error.response.status;
  const data = error.response.data;

  if (status === 409) {
    if (typeof data?.error === "string" && data.error.trim()) {
      return data.error.trim();
    }
    return t("maps.createMapConflict");
  }

  if (status === 400 && Array.isArray(data?.details)) {
    const messages = data.details.map((d) => d.message).filter(Boolean);
    if (messages.length > 0) {
      return messages.join(" · ");
    }
  }

  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error.trim();
  }

  return t("maps.createMapFailed");
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
  const { mutateAsync: createMap } = useCreateMap();
  const { palette } = useTheme();

  const [searchString, setSearchString] = useState("");
  const [debouncedSearchString] = useDebounce(searchString, 200);
  const [open, setOpen] = useState<boolean>(false);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchString(event.target.value);
  };

  const defaultValues: MapCreateFormValues = {
    name: "",
    locked: false,
    options: {
      title: "",
      description: "",
    },
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<MapCreateFormValues>({
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const watchedName = useWatch({ control, name: "name" });

  const isDuplicateMapName = useMemo(() => {
    const normalizedName = watchedName?.trim().toLowerCase() ?? "";
    if (!normalizedName || !maps?.length) return false;
    return maps.some((map) => map.name.toLowerCase() === normalizedName);
  }, [watchedName, maps]);

  const handleClickOpen = () => {
    reset(defaultValues);
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

  const handleMapSubmit = async (mapData: MapCreateFormValues) => {
    try {
      const payload: MapCreateInput = {
        name: mapData.name.trim(),
        locked: mapData.locked,
        options: mapData.options,
      };
      const response = await createMap(payload);
      if (response.id == null) {
        toast.error(t("maps.createMapFailed"), {
          position: "bottom-left",
          theme: palette.mode,
          hideProgressBar: true,
        });
        return;
      }
      toast.success(t("maps.createMapSuccess", { name: mapData.name }), {
        position: "bottom-left",
        theme: palette.mode,
        hideProgressBar: true,
      });
      void navigate(`${baseRoute}/${response.id}`);
      reset(defaultValues);
      handleClose();
    } catch (error) {
      console.error("Failed to submit map:", error);
      toast.error(getCreateMapErrorMessage(error, t), {
        position: "bottom-left",
        theme: palette.mode,
        hideProgressBar: true,
      });
    }
  };

  const onSubmit = (data: MapCreateFormValues) => {
    void handleMapSubmit(data);
  };

  return (
    <Page
      title={t(pageTitleKey)}
      actionButtons={
        showCreateButton ? (
          <CreateButton onClick={handleClickOpen} label={t("map.createMap")} />
        ) : undefined
      }
    >
      <DialogWrapper
        fullWidth
        open={open}
        title={t("maps.dialog.title")}
        onClose={handleClose}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(onSubmit)(e);
        }}
        actions={
          <>
            <Button variant="text" onClick={handleClose} color="primary">
              {t("common.dialog.closeBtn")}
            </Button>
            <Button type="submit" color="primary" variant="contained">
              {t("common.dialog.saveBtn")}
            </Button>
          </>
        }
      >
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              label={t("map.name")}
              fullWidth
              {...register("name", {
                validate: (value) => {
                  const trimmed = value.trim();
                  if (!trimmed) return `${t("common.required")}`;
                  if (isDuplicateMapName) return t("maps.createMapConflict");
                  return true;
                },
              })}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label={t("map.title")}
              fullWidth
              {...register("options.title")}
              error={!!errors.options?.title}
              helperText={errors.options?.title?.message}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label={t("map.description")}
              fullWidth
              multiline
              rows={3}
              {...register("options.description")}
              error={!!errors.options?.description}
              helperText={errors.options?.description?.message}
            />
          </Grid>
        </Grid>
      </DialogWrapper>
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
