import { useEffect, useRef, useState } from "react";
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
  Grid2 as Grid,
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

interface LayerInfoClickModalProps {
  open: boolean;
  layerName: string;
  onClose: () => void;
  onSave: (data: {
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
  }) => void;
  initialValues?: {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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
                      {t("layers.infobox")}
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
                  <TextField
                    label={t("layers.displayName")}
                    fullWidth
                    {...register("caption")}
                  />
                </Grid>
                <Grid size={12}>
                  <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                    <TextField
                      label={t("layers.legendIcon")}
                      fullWidth
                      sx={{ flex: "1 1 200px", minWidth: 0 }}
                      slotProps={{
                        inputLabel: { shrink: true },
                      }}
                      {...register("legendIcon")}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      style={{ display: "none" }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      {t("layers.uploadFile")}
                    </Button>
                  </Box>
                </Grid>
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
                          value={field.value ?? ""}
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
                          label={t("common.infoclick")}
                        />
                      )}
                    />
                  </FormGroup>
                </Grid>
                <Grid size={12}>
                  <TextField
                    label={`${t("layers.infoClickIcon")} ${t("layers.listLink")} (?)`}
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
                  <TextField
                    label={`${t("layers.displayFieldInResultList")} (?)`}
                    fullWidth
                    {...register("searchDisplayName")}
                    helperText={t("layers.displayFieldInResultListHelp")}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label={`${t("layers.secondaryDisplayFieldInResultList")} (?)`}
                    fullWidth
                    {...register("secondaryLabelFields")}
                    helperText={t(
                      "layers.secondaryDisplayFieldInResultListHelp",
                    )}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label={`${t("layers.shortDisplayField")} (?)`}
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
                <Grid size={12}>
                  <TextField label="Url" fullWidth {...register("searchUrl")} />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label={`${t("layers.searchFields")} (?)`}
                    fullWidth
                    {...register("searchPropertyName")}
                    helperText={t("layers.searchFieldsHelp")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t("layers.searchSettings.outputFormat")}
                    fullWidth
                    {...register("searchOutputFormat")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t("layers.searchSettings.geometryField")}
                    fullWidth
                    {...register("searchGeometryField")}
                  />
                </Grid>

                {/* Infoklick Sort Settings */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t("layers.sortByAttribute")}
                    fullWidth
                    {...register("sortProperty")}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="format-label">
                      {t("layers.infoClickFormat")}
                    </InputLabel>
                    <Controller
                      name="format"
                      control={control}
                      render={({ field }) => (
                        <Select
                          labelId="format-label"
                          label={t("layers.infoClickFormat")}
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
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel id="sortMethod-label">
                      {t("layers.infoClickSortMethod")}
                    </InputLabel>
                    <Controller
                      name="sortMethod"
                      control={control}
                      render={({ field }) => (
                        <Select
                          labelId="sortMethod-label"
                          label={t("layers.infoClickSortMethod")}
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
                          label={t("layers.sortDescending")}
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
