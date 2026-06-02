import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import Grid from "@mui/material/Grid2";
import {
  Autocomplete,
  Button,
  TextField,
  useTheme,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { isAxiosError } from "axios";
import Page from "../../../layouts/root/components/page";
import {
  useGroups,
  Group,
  useCreateGroup,
  GroupCreateInput,
  GroupType,
} from "../../../api/groups";
import { useLayers } from "../../../api/layers";
import type { Layer } from "../../../api/layers";
import DialogWrapper from "../../../components/flexible-dialog";
import CreateButton from "../../../components/create-button";
import { SquareSpinnerComponent } from "../../../components/progress/square-progress";
import { useForm, Controller } from "react-hook-form";
import { toast } from "react-toastify";
import StyledDataGrid from "../../../components/data-grid";
import { ApiValidationDetail } from "../../../lib/internal-api-client";

interface GroupCreateForm {
  name: string;
  internalName?: string;
  type: GroupType | "";
  layerIds: string[];
}

interface GroupCreateErrorBody {
  errorId?: string;
  error?: string;
  details?: ApiValidationDetail[] | string;
}

function getCreateGroupErrorMessage(error: unknown, t: TFunction): string {
  if (!isAxiosError<GroupCreateErrorBody>(error) || !error.response) {
    return t("groups.createGroupFailed");
  }

  const data = error.response.data;
  if (Array.isArray(data?.details)) {
    const messages = data.details.map((d) => d.message).filter(Boolean);
    if (messages.length > 0) {
      return messages.join(" · ");
    }
  }

  if (typeof data?.details === "string" && data.details.trim()) {
    return data.details.trim();
  }

  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error.trim();
  }

  return t("groups.createGroupFailed");
}

interface GroupsListProps {
  filterGroups: (groups: Group[]) => Group[];
  showCreateButton?: boolean;
  pageTitleKey: string;
  baseRoute: string;
}

export default function GroupsList({
  filterGroups,
  showCreateButton = true,
  pageTitleKey,
  baseRoute,
}: GroupsListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: groups, isLoading } = useGroups();
  const { data: layers = [] } = useLayers();
  const { mutateAsync: createGroup, isPending: isCreatingGroup } =
    useCreateGroup();
  const { palette } = useTheme();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  const filteredGroups = useMemo(() => {
    if (!groups) return [];

    // First apply the specific filter for this page type
    const typeFilteredGroups = filterGroups(groups);

    // Then apply search filter
    const searchFilter = (group: Group) => {
      const combinedText = `${group.name} ${group.internalName ?? ""} ${
        group.type
      }`.toLowerCase();
      return combinedText.includes(searchTerm.toLowerCase());
    };

    return typeFilteredGroups.filter(searchFilter);
  }, [groups, searchTerm, filterGroups]);

  const defaultValues: GroupCreateForm = {
    name: "",
    internalName: "",
    type: "",
    layerIds: [],
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<GroupCreateForm>({
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const watchGroupType = watch("type");

  useEffect(() => {
    setValue("layerIds", []);
  }, [setValue, watchGroupType]);

  const availableLayerOptions = useMemo(() => {
    if (!watchGroupType) return [];
    const allowedKind =
      watchGroupType === GroupType.SEARCH ? "search" : "display";
    return layers
      .filter((layer) => layer.layerKind === allowedKind)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [layers, watchGroupType]);

  const handleGroupSubmit = async (groupData: GroupCreateForm) => {
    try {
      const payload: GroupCreateInput = {
        name: groupData.name,
        internalName: groupData.internalName,
        type: groupData.type as GroupType,
        layers: groupData.layerIds.map((layerId) => ({
          layerId,
          usage: "FOREGROUND",
        })),
      };
      const response = await createGroup(payload);
      toast.success(t("groups.createGroupSuccess", { name: response?.name }), {
        position: "bottom-left",
        theme: palette.mode,
        hideProgressBar: true,
      });
      void navigate(`${baseRoute}/${response?.id}`);
      reset();
      handleClose();
    } catch (error) {
      console.error("Failed to submit group:", error);
      toast.error(getCreateGroupErrorMessage(error, t), {
        position: "bottom-left",
        theme: palette.mode,
        hideProgressBar: true,
      });
    }
  };

  const onSubmit = (data: GroupCreateForm) => {
    void handleGroupSubmit(data);
  };

  return (
    <Page
      title={t(pageTitleKey)}
      actionButtons={
        showCreateButton ? (
          <CreateButton
            onClick={handleClickOpen}
            label={t("groups.create")}
          />
        ) : undefined
      }
    >
      <DialogWrapper
        fullWidth
        open={open}
        title={t("groups.dialog.title")}
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
            <Button
              type="submit"
              color="primary"
              variant="contained"
              disabled={isCreatingGroup}
            >
              {t("common.dialog.saveBtn")}
            </Button>
          </>
        }
      >
        <Grid container spacing={2}>
          <Grid size={12}>
            <TextField
              label={t("common.name")}
              fullWidth
              {...register("name", {
                required: `${t("common.required")}`,
              })}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              label={t("groups.internalName")}
              fullWidth
              {...register("internalName")}
            />
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth error={!!errors.type}>
              <InputLabel id="type-label">{t("groups.type")}</InputLabel>
              <Controller
                name="type"
                control={control}
                rules={{ required: `${t("common.required")}` }}
                render={({ field }) => (
                  <>
                    <Select
                      labelId="type-label"
                      label={t("groups.type")}
                      error={!!errors.type}
                      {...field}
                    >
                      {Object.keys(GroupType).map((key) => {
                        const value = GroupType[key as keyof typeof GroupType];
                        return (
                          <MenuItem key={key} value={value}>
                            {t(`groupType.${key}`)}
                          </MenuItem>
                        );
                      })}
                    </Select>
                    <FormHelperText error={!!errors.type}>
                      {errors.type?.message}
                    </FormHelperText>
                  </>
                )}
              />
            </FormControl>
          </Grid>
          <Grid size={12}>
            <Controller
              name="layerIds"
              control={control}
              render={({ field }) => {
                const selectedLayers = availableLayerOptions.filter((layer) =>
                  field.value.includes(layer.id)
                );
                return (
                  <Autocomplete<Layer, true, false, false>
                    multiple
                    disabled={!watchGroupType}
                    options={availableLayerOptions}
                    value={selectedLayers}
                    getOptionLabel={(option) => option.name}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    onChange={(_, value) =>
                      field.onChange(value.map((layer) => layer.id))
                    }
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option.name}
                          {...getTagProps({ index })}
                          key={option.id}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={t("groups.layers")}
                        helperText={t("groups.layersHelp")}
                      />
                    )}
                    noOptionsText={t("common.noLayersAvailable")}
                  />
                );
              }}
            />
          </Grid>
        </Grid>
      </DialogWrapper>
      {isLoading ? (
        <SquareSpinnerComponent />
      ) : (
        <>
          <Grid size={12} container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                label={t("groups.search")}
                variant="outlined"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </Grid>
          </Grid>

          <Grid size={12}>
            <StyledDataGrid<Group>
              storageKey="groups"
              customSx={{ height: "calc(100vh - 320px)" }}
              onRowClick={({ row }) => {
                const id: string = row.id;
                if (id) {
                  void navigate(`${baseRoute}/${id}`);
                }
              }}
              rows={filteredGroups}
              columns={[
                {
                  field: "name",
                  headerName: "Visningsnamn",
                  flex: 0.4,
                },
                {
                  field: "type",
                  headerName: "Typ av grupp",
                  flex: 0.5,
                },
                {
                  field: "internalName",
                  headerName: "Intern namn",
                  flex: 0.3,
                },
                {
                  field: "lastSavedDate",
                  flex: 0.3,
                  headerName: t("common.lastSaved"),
                  valueFormatter: (value: string) =>
                    value ? new Date(value).toLocaleDateString("sv-SE") : "–",
                },
              ]}
            />
          </Grid>
        </>
      )}
    </Page>
  );
}
