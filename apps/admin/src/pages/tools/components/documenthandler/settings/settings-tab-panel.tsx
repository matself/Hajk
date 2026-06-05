import {
  Alert,
  Autocomplete,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid2 as Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
} from "@mui/material";
import { Control, Controller, FieldValues, useController } from "react-hook-form";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import FormAccordion from "@/components/form-components/form-accordion";
import FormColorPicker from "@/components/form-components/form-color-picker";
import FormPanel from "@/components/form-components/form-panel";
import { STUB_AVAILABLE_DOCUMENTS } from "../menu-editor/constants";

interface SettingsTabPanelProps {
  control: Control<FieldValues>;
}

export function SettingsTabPanel({ control }: SettingsTabPanelProps) {
  const { t } = useTranslation();

  const { field: bgColorField } = useController({
    name: "defaultDocumentColorSettings.textAreaBackgroundColor",
    control,
  });
  const { field: dividerColorField } = useController({
    name: "defaultDocumentColorSettings.textAreaDividerColor",
    control,
  });
  const [factBoxColorsEnabled, setFactBoxColorsEnabled] = useState(
    () => !!(bgColorField.value || dividerColorField.value)
  );

  const handleFactBoxToggle = (_: React.SyntheticEvent, checked: boolean) => {
    setFactBoxColorsEnabled(checked);
    if (!checked) {
      bgColorField.onChange("");
      dividerColorField.onChange("");
    }
  };

  return (
    <>
      <FormPanel title={t("common.information")}>
        <Grid container>
          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <TextField
                  label={t("tools.title")}
                  fullWidth
                  {...field}
                  value={(field.value as string) ?? ""}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="drawerButtonTitle"
              control={control}
              render={({ field }) => (
                <TextField
                  label={t("tools.documenthandler.drawerButtonTitle")}
                  fullWidth
                  {...field}
                  value={(field.value as string) ?? ""}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="drawerTitle"
              control={control}
              render={({ field }) => (
                <TextField
                  label={t("tools.documenthandler.drawerTitle")}
                  fullWidth
                  {...field}
                  value={(field.value as string) ?? ""}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="drawerButtonIcon"
              control={control}
              render={({ field }) => (
                <TextField
                  label={t("tools.documenthandler.drawerButtonIcon")}
                  fullWidth
                  {...field}
                  value={(field.value as string) ?? ""}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="documentOnStart"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  freeSolo
                  options={STUB_AVAILABLE_DOCUMENTS}
                  value={(field.value as string) ?? ""}
                  onInputChange={(_, value) => field.onChange(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t("tools.documenthandler.documentOnStart")}
                      fullWidth
                    />
                  )}
                />
              )}
            />
          </Grid>
        </Grid>
      </FormPanel>

      <FormAccordion title={t("tools.windowSettings")} defaultExpanded>
        <Grid container>
          <Grid size={{ xs: 12, md: 10 }}>
            <FormControl fullWidth>
              <InputLabel id="documenthandler-target">{t("tools.placement")}</InputLabel>
              <Controller
                name="target"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="documenthandler-target"
                    label={t("tools.placement")}
                    value={(field.value as string) ?? "hidden"}
                  >
                    <MenuItem value="hidden">
                      {t("tools.documenthandler.targetHidden")}
                    </MenuItem>
                    <MenuItem value="toolbar">Drawer</MenuItem>
                    <MenuItem value="left">Widget left</MenuItem>
                    <MenuItem value="right">Widget right</MenuItem>
                    <MenuItem value="control">Control button</MenuItem>
                  </Select>
                )}
              />
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="width"
              control={control}
              render={({ field }) => (
                <TextField
                  type="number"
                  label={t("tools.windowWidth")}
                  fullWidth
                  {...field}
                  value={(field.value as number | string) ?? ""}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="height"
              control={control}
              render={({ field }) => (
                <TextField
                  label={t("tools.windowHeight")}
                  fullWidth
                  {...field}
                  value={(field.value as string) ?? ""}
                />
              )}
            />
          </Grid>
        </Grid>
      </FormAccordion>

      <FormAccordion title={t("tools.generalSettings")} defaultExpanded>
        <Grid container>
          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="customThemeUrl"
              control={control}
              render={({ field }) => (
                <TextField
                  label={t("tools.documenthandler.customThemeUrl")}
                  fullWidth
                  {...field}
                  value={(field.value as string) ?? ""}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="showScrollButtonLimit"
              control={control}
              render={({ field }) => (
                <TextField
                  type="number"
                  label={t("tools.documenthandler.showScrollButtonLimit")}
                  fullWidth
                  {...field}
                  value={(field.value as number | string) ?? ""}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="searchImplemented"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!field.value}
                      onChange={(_, checked) => field.onChange(checked)}
                    />
                  }
                  label={t("tools.documenthandler.searchImplemented")}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="enablePrint"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!field.value}
                      onChange={(_, checked) => field.onChange(checked)}
                    />
                  }
                  label={t("tools.documenthandler.enablePrint")}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="closePanelOnMapLinkOpen"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!field.value}
                      onChange={(_, checked) => field.onChange(checked)}
                    />
                  }
                  label={t("tools.documenthandler.closePanelOnMapLinkOpen")}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="displayLoadingOnMapLinkOpen"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!field.value}
                      onChange={(_, checked) => field.onChange(checked)}
                    />
                  }
                  label={t("tools.documenthandler.displayLoadingOnMapLinkOpen")}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="resizingEnabled"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!field.value}
                      onChange={(_, checked) => field.onChange(checked)}
                    />
                  }
                  label={t("tools.documenthandler.resizingEnabled")}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="draggingEnabled"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!field.value}
                      onChange={(_, checked) => field.onChange(checked)}
                    />
                  }
                  label={t("tools.documenthandler.draggingEnabled")}
                />
              )}
            />
          </Grid>
        </Grid>
      </FormAccordion>

      <FormAccordion title={t("tools.documenthandler.tableOfContents")}>
        <Grid container>
          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="tableOfContents.active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!field.value}
                      onChange={(_, checked) => field.onChange(checked)}
                    />
                  }
                  label={t("tools.active")}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="tableOfContents.expanded"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!field.value}
                      onChange={(_, checked) => field.onChange(checked)}
                    />
                  }
                  label={t("tools.documenthandler.tocExpanded")}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="tableOfContents.title"
              control={control}
              render={({ field }) => (
                <TextField
                  label={t("tools.title")}
                  fullWidth
                  {...field}
                  value={(field.value as string) ?? ""}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="tableOfContents.chapterLevelsToShow"
              control={control}
              render={({ field }) => (
                <TextField
                  type="number"
                  label={t("tools.documenthandler.chapterLevelsToShow")}
                  fullWidth
                  {...field}
                  value={(field.value as number | string) ?? ""}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="tableOfContents.chapterLevelsToShowForPrint"
              control={control}
              render={({ field }) => (
                <TextField
                  type="number"
                  label={t("tools.documenthandler.chapterLevelsToShowForPrint")}
                  fullWidth
                  {...field}
                  value={(field.value as number | string) ?? ""}
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 10 }}>
            <Controller
              name="tableOfContents.printMode"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel id="toc-print-mode-label">
                    {t("tools.documenthandler.tocPrintMode")}
                  </InputLabel>
                  <Select
                    {...field}
                    labelId="toc-print-mode-label"
                    label={t("tools.documenthandler.tocPrintMode")}
                    value={(field.value as string) ?? "none"}
                  >
                    <MenuItem value="full">
                      {t("tools.documenthandler.tocPrintModeFull")}
                    </MenuItem>
                    <MenuItem value="partial">
                      {t("tools.documenthandler.tocPrintModePartial")}
                    </MenuItem>
                    <MenuItem value="none">
                      {t("tools.documenthandler.tocPrintModeNone")}
                    </MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </Grid>
        </Grid>
      </FormAccordion>

      <FormAccordion title={t("tools.documenthandler.factBox")}>
        <Grid container>
          <Grid size={{ xs: 12, md: 10 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={factBoxColorsEnabled}
                  onChange={handleFactBoxToggle}
                />
              }
              label={t("tools.active")}
            />
          </Grid>

          {factBoxColorsEnabled && (
            <>
              <Grid size={{ xs: 12, md: 10 }}>
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {t("tools.documenthandler.factBoxColorWarning")}
                </Alert>
              </Grid>

              <Grid size={{ xs: 12, md: 10 }}>
                <FormColorPicker
                  label={t("tools.documenthandler.textAreaBackgroundColor")}
                  value={(bgColorField.value as string) ?? ""}
                  onChange={bgColorField.onChange}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 10 }}>
                <FormColorPicker
                  label={t("tools.documenthandler.textAreaDividerColor")}
                  value={(dividerColorField.value as string) ?? ""}
                  onChange={dividerColorField.onChange}
                />
              </Grid>
            </>
          )}
        </Grid>
      </FormAccordion>
    </>
  );
}
