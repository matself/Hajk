import { useEffect, useRef, useState } from "react";
import Grid from "@mui/material/Grid";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
  Divider,
  Typography,
  Tabs,
  Tab,
  IconButton,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { infoClickFormat, sortType } from "../../../api/layers";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import ImageIcon from "@mui/icons-material/Image";
import { TextFieldWithHelp } from "../../../components/form-components/field-label-with-help";
import { useLayerFieldLabels } from "../use-layer-field-labels";

interface LayerInfoClickModalProps {
  open: boolean;
  layerName: string;
  onClose: () => void;
  onSave: (data: {
    caption?: string;
    legendUrl?: string;
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
  }) => void;
  initialValues?: {
    caption?: string;
    legendUrl?: string;
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
  };
  availableStyles?: { name: string }[];
}

export default function LayerInfoClickModal({
  open,
  layerName,
  onClose,
  onSave,
  initialValues,
  availableStyles = [],
}: LayerInfoClickModalProps) {
  const { t } = useTranslation();
  const { fieldLabel, selectLabel } = useLayerFieldLabels();
  const legendUrlFileInputRef = useRef<HTMLInputElement>(null);
  const legendIconFileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"infobox" | "settings">("infobox");
  const markdownInputRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    setValue,
    formState: { isDirty },
  } = useForm({
    defaultValues: {
      caption: initialValues?.caption ?? "",
      legendUrl: initialValues?.legendUrl ?? "",
      legendIcon: initialValues?.legendIcon ?? "",
      style: initialValues?.style ?? "",
      queryable: initialValues?.queryable ?? false,
      infoclickIcon: initialValues?.infoclickIcon ?? "",
      searchDisplayName: initialValues?.searchDisplayName ?? "",
      secondaryLabelFields: initialValues?.secondaryLabelFields ?? "",
      searchShortDisplayName: initialValues?.searchShortDisplayName ?? "",
      searchUrl: initialValues?.searchUrl ?? "",
      searchPropertyName: initialValues?.searchPropertyName ?? "",
      searchOutputFormat: initialValues?.searchOutputFormat ?? "",
      searchGeometryField: initialValues?.searchGeometryField ?? "",
      definition: initialValues?.definition ?? "",
      format: initialValues?.format ?? "application/json",
      sortProperty: initialValues?.sortProperty ?? "",
      sortMethod: initialValues?.sortMethod ?? "text",
      sortDescending: initialValues?.sortDescending ?? false,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        caption: initialValues?.caption ?? "",
        legendUrl: initialValues?.legendUrl ?? "",
        legendIcon: initialValues?.legendIcon ?? "",
        style: initialValues?.style ?? "",
        queryable: initialValues?.queryable ?? false,
        infoclickIcon: initialValues?.infoclickIcon ?? "",
        searchDisplayName: initialValues?.searchDisplayName ?? "",
        secondaryLabelFields: initialValues?.secondaryLabelFields ?? "",
        searchShortDisplayName: initialValues?.searchShortDisplayName ?? "",
        searchUrl: initialValues?.searchUrl ?? "",
        searchPropertyName: initialValues?.searchPropertyName ?? "",
        searchOutputFormat: initialValues?.searchOutputFormat ?? "",
        searchGeometryField: initialValues?.searchGeometryField ?? "",
        definition: initialValues?.definition ?? "",
        format: initialValues?.format ?? "application/json",
        sortProperty: initialValues?.sortProperty ?? "",
        sortMethod: initialValues?.sortMethod ?? "text",
        sortDescending: initialValues?.sortDescending ?? false,
      });
    }
  }, [open, initialValues, reset]);

  const handleLegendUrlFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // For now, just set the filename. In a real implementation,
      // you'd upload the file and get a URL back
      const fileName = file.name;
      setValue("legendUrl", fileName, { shouldDirty: true });
      // Reset file input so same file can be selected again
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleLegendIconFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // For now, just set the filename. In a real implementation,
      // you'd upload the file and get a URL back
      const fileName = file.name;
      setValue("legendIcon", fileName, { shouldDirty: true });
      // Reset file input so same file can be selected again
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const onSubmit = (data: {
    caption: string;
    legendUrl: string;
    legendIcon: string;
    style: string;
    queryable: boolean;
    infoclickIcon: string;
    searchDisplayName: string;
    secondaryLabelFields: string;
    searchShortDisplayName: string;
    searchUrl: string;
    searchPropertyName: string;
    searchOutputFormat: string;
    searchGeometryField: string;
    definition: string;
    format: string;
    sortProperty: string;
    sortMethod: string;
    sortDescending: boolean;
  }) => {
    onSave({
      caption: data.caption || undefined,
      legendUrl: data.legendUrl || undefined,
      legendIcon: data.legendIcon || undefined,
      style: data.style || undefined,
      queryable: data.queryable,
      infoclickIcon: data.infoclickIcon || undefined,
      searchDisplayName: data.searchDisplayName || undefined,
      secondaryLabelFields: data.secondaryLabelFields || undefined,
      searchShortDisplayName: data.searchShortDisplayName || undefined,
      searchUrl: data.searchUrl || undefined,
      searchPropertyName: data.searchPropertyName || undefined,
      searchOutputFormat: data.searchOutputFormat || undefined,
      searchGeometryField: data.searchGeometryField || undefined,
      definition: data.definition || undefined,
      format: data.format,
      sortProperty: data.sortProperty || undefined,
      sortMethod: data.sortMethod,
      sortDescending: data.sortDescending,
    });
    onClose();
  };

  const insertAtCursor = (toInsert: string) => {
    const currentDefinition = getValues("definition") ?? "";
    const el = markdownInputRef.current;

    // If we don't have a live textarea ref, append at end
    if (!el) {
      const nextDefinition = `${currentDefinition}${toInsert}`;
      setValue("definition", nextDefinition, { shouldDirty: true });
      return;
    }

    const pos = el.selectionStart ?? currentDefinition.length;
    const before = currentDefinition.slice(0, pos);
    const after = currentDefinition.slice(pos);
    const nextDefinition = `${before}${toInsert}${after}`;

    setValue("definition", nextDefinition, { shouldDirty: true });

    // Move caret to just after the inserted text
    setTimeout(() => {
      const newPos = pos + toInsert.length;
      el.selectionStart = newPos;
      el.selectionEnd = newPos;
      el.focus();
    }, 0);
  };

  const handleInsertImage = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement)?.files?.[0] as Blob | null;
      if (file) {
        const url = URL.createObjectURL(file);
        insertAtCursor(`![Image Description](${url})`);
      }
    };
    console.log(fileInput);
    fileInput.click();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {t("layers.layerSettings", { name: layerName })}
      </DialogTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(onSubmit)(e);
        }}
      >
        <DialogContent
          sx={{
            height: 1100,
            maxHeight: "80vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, value) => {
              setActiveTab(value as "infobox" | "settings");
            }}
            sx={{ mb: 2, flexShrink: 0 }}
          >
            <Tab label={t("layers.infobox")} value="infobox" />
            <Tab label={t("layers.otherSettings")} value="settings" />
          </Tabs>

          <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            {activeTab === "infobox" ? (
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {fieldLabel("layers.infobox", "layers.help.infobox")}
                    </Typography>
                    <IconButton onClick={handleInsertImage}>
                      <ImageIcon />
                    </IconButton>
                    <Controller
                      name="definition"
                      control={control}
                      render={({ field }) => (
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "1.1fr 1fr",
                            gap: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1,
                            overflow: "hidden",
                            height: 900,
                          }}
                        >
                          <TextField
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            multiline
                            fullWidth
                            inputRef={markdownInputRef}
                            placeholder={t(
                              "layers.markdownEditor.editPlaceholder",
                            )}
                            sx={{
                              "& .MuiInputBase-root": {
                                height: "100%",
                                alignItems: "flex-start",
                                padding: 0,
                              },
                              "& .MuiOutlinedInput-inputMultiline": {
                                padding: 0,
                              },
                              "& textarea": {
                                height: "100%",
                                overflow: "auto",
                                fontFamily: "monospace",
                                fontSize: "0.875rem",
                                padding: "4px 8px",
                                boxSizing: "border-box",
                              },
                            }}
                            slotProps={{
                              input: {
                                sx: {
                                  height: "100%",
                                },
                              },
                            }}
                          />
                          <Box
                            sx={{
                              p: 2,
                              overflow: "auto",
                              backgroundColor: "background.paper",
                              height: "100%",
                              "& *": {
                                marginTop: 0,
                                marginBottom: "0.5rem",
                              },
                              "& table": {
                                borderCollapse: "collapse",
                                width: "100%",
                                "& th, & td": {
                                  border: "1px solid",
                                  borderColor: "divider",
                                },
                                "& th": {
                                  backgroundColor: "action.hover",
                                  fontWeight: "bold",
                                },
                              },
                            }}
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                            >
                              {field.value ?? ""}
                            </ReactMarkdown>
                          </Box>
                        </Box>
                      )}
                    />
                  </Box>
                </Grid>
              </Grid>
            ) : (
              <Grid container spacing={2}>
                {/* General Settings */}
                <Grid size={12}>
                  <TextFieldWithHelp
                    sx={{ mt: 1 }}
                    labelKey="layers.displayName"
                    helpKey="layers.help.displayName"
                    fullWidth
                    {...register("caption")}
                  />
                </Grid>
                <Grid size={12}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 1,
                    }}
                  >
                    <Box sx={{ flex: "1 1 200px", minWidth: 0 }}>
                      <TextFieldWithHelp
                        labelKey="layers.legend"
                        helpKey="layers.help.legend"
                        fullWidth
                        slotProps={{
                          inputLabel: { shrink: true },
                        }}
                        {...register("legendUrl")}
                      />
                    </Box>
                    <input
                      ref={legendUrlFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLegendUrlFileSelect}
                      style={{ display: "none" }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() => legendUrlFileInputRef.current?.click()}
                      sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      {t("layers.uploadFile")}
                    </Button>
                  </Box>
                </Grid>
                <Grid size={12}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 1,
                    }}
                  >
                    <Box sx={{ flex: "1 1 200px", minWidth: 0 }}>
                      <TextFieldWithHelp
                        labelKey="layers.legendIcon"
                        helpKey="layers.help.legendIcon"
                        fullWidth
                        slotProps={{
                          inputLabel: { shrink: true },
                        }}
                        {...register("legendIcon")}
                      />
                    </Box>
                    <input
                      ref={legendIconFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLegendIconFileSelect}
                      style={{ display: "none" }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() => legendIconFileInputRef.current?.click()}
                      sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      {t("layers.uploadFile")}
                    </Button>
                  </Box>
                </Grid>
                <Grid size={12}>
                  <FormControl fullWidth>
                    <InputLabel id="style-label" shrink>
                      {fieldLabel("layers.style", "layers.help.style")}
                    </InputLabel>
                    <Controller
                      name="style"
                      control={control}
                      render={({ field }) => (
                        <Select
                          labelId="style-label"
                          {...selectLabel("layers.style", "layers.help.style")}
                          {...field}
                          displayEmpty
                          value={field.value ?? ""}
                          renderValue={(value) =>
                            value === "" ? "<default>" : value
                          }
                        >
                          <MenuItem value="">{"<default>"}</MenuItem>
                          {availableStyles.map((s) => (
                            <MenuItem key={s.name} value={s.name}>
                              {s.name}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* Infoklick Section */}
                <Grid size={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t("common.infoclick")}
                    </Typography>
                  </Divider>
                </Grid>
                <Grid size={12}>
                  <FormGroup>
                    <Controller
                      name="queryable"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          }
                          label={fieldLabel(
                            "common.infoclick",
                            "layers.help.infoClickActive",
                          )}
                        />
                      )}
                    />
                  </FormGroup>
                </Grid>
                <Grid size={12}>
                  <TextFieldWithHelp
                    labelKey="layers.infoClickIcon"
                    helpKey="layers.help.infoClickIcon"
                    fullWidth
                    {...register("infoclickIcon")}
                    helperText={t("layers.infoClickIconHelp")}
                  />
                </Grid>

                {/* Infoklick och sökning Section */}
                <Grid size={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t("layers.infoClickAndSearch")}
                    </Typography>
                  </Divider>
                </Grid>
                <Grid size={12}>
                  <TextFieldWithHelp
                    labelKey="layers.displayFieldInResultList"
                    helpKey="layers.help.primaryDisplayFields"
                    fullWidth
                    {...register("searchDisplayName")}
                    helperText={t("layers.displayFieldInResultListHelp")}
                  />
                </Grid>
                <Grid size={12}>
                  <TextFieldWithHelp
                    labelKey="layers.secondaryDisplayFieldInResultList"
                    helpKey="layers.help.secondaryDisplayFields"
                    fullWidth
                    {...register("secondaryLabelFields")}
                    helperText={t(
                      "layers.secondaryDisplayFieldInResultListHelp",
                    )}
                  />
                </Grid>
                <Grid size={12}>
                  <TextFieldWithHelp
                    labelKey="layers.shortDisplayField"
                    helpKey="layers.help.shortDisplayFields"
                    fullWidth
                    {...register("searchShortDisplayName")}
                    helperText={t("layers.shortDisplayFieldHelp")}
                  />
                </Grid>

                {/* Sökning Section */}
                <Grid size={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t("layers.search")}
                    </Typography>
                  </Divider>
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextFieldWithHelp
                    labelKey="layers.searchSettings.url"
                    helpKey="layers.help.searchUrl"
                    fullWidth
                    {...register("searchUrl")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextFieldWithHelp
                    labelKey="layers.searchFields"
                    helpKey="layers.help.searchFields"
                    fullWidth
                    {...register("searchPropertyName")}
                    helperText={t("layers.searchFieldsHelp")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextFieldWithHelp
                    labelKey="layers.searchSettings.outputFormat"
                    helpKey="layers.help.searchOutputFormat"
                    fullWidth
                    {...register("searchOutputFormat")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextFieldWithHelp
                    labelKey="layers.searchSettings.geometryField"
                    helpKey="layers.help.geometryField"
                    fullWidth
                    {...register("searchGeometryField")}
                  />
                </Grid>

                {/* Infoklick Sort Settings */}
                <Grid size={{ xs: 12, md: 10 }}>
                  <TextFieldWithHelp
                    labelKey="layers.sortByAttribute"
                    helpKey="layers.help.sortByAttribute"
                    fullWidth
                    {...register("sortProperty")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <FormControl fullWidth>
                    <InputLabel id="format-label" shrink>
                      {fieldLabel(
                        "layers.infoClickFormat",
                        "layers.help.infoClickFormat",
                      )}
                    </InputLabel>
                    <Controller
                      name="format"
                      control={control}
                      render={({ field }) => (
                        <Select
                          labelId="format-label"
                          {...selectLabel(
                            "layers.infoClickFormat",
                            "layers.help.infoClickFormat",
                          )}
                          {...field}
                          value={field.value ?? ""}
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
                <Grid size={{ xs: 12, md: 10 }}>
                  <FormControl fullWidth>
                    <InputLabel id="sortMethod-label" shrink>
                      {fieldLabel(
                        "layers.infoClickSortMethod",
                        "layers.help.infoClickSortMethod",
                      )}
                    </InputLabel>
                    <Controller
                      name="sortMethod"
                      control={control}
                      render={({ field }) => (
                        <Select
                          labelId="sortMethod-label"
                          {...selectLabel(
                            "layers.infoClickSortMethod",
                            "layers.help.infoClickSortMethod",
                          )}
                          {...field}
                          value={field.value ?? ""}
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
                <Grid size={12}>
                  <FormGroup>
                    <Controller
                      name="sortDescending"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          }
                          label={fieldLabel(
                            "layers.sortDescending",
                            "layers.help.sortDescending",
                          )}
                        />
                      )}
                    />
                  </FormGroup>
                </Grid>
              </Grid>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="contained" disabled={!isDirty}>
            {t("common.dialog.saveBtn")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
