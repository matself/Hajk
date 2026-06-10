import { useEffect } from "react";
import { Switch } from "@mui/material";
import { TextField, FormControlLabel, Checkbox } from "@mui/material";
import { useForm, Controller, FieldValues, Control } from "react-hook-form";
import FormAccordion from "../../../components/form-components/form-accordion";
import FormPanel from "../../../components/form-components/form-panel";
import FormFieldGrid, { FormFieldRow } from "../../../components/form-components/form-field-grid";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import { useTranslation } from "react-i18next";
import { SketchPicker } from "react-color";
import { Tool } from "../../../api/tools";

interface SearchRendererProps {
  tool: Tool;
  control?: Control<FieldValues>;
}

export default function SearchRenderer({
  tool,
  control: parentControl,
}: SearchRendererProps) {
  const { t } = useTranslation();
  const { control: localControl, reset } = useForm<FieldValues>({
    mode: "onChange",
    reValidateMode: "onChange",
  });

  // Use parent control if provided, otherwise use local
  const control = parentControl ?? localControl;

  // Reset form with tool data when it loads (only for local control)
  useEffect(() => {
    if (tool && !parentControl) {
      reset({
        searchInfoText: tool.options?.searchInfoText ?? "",
        maxHitsPerDataset: tool.options?.maxHitsPerDataset ?? 1000,
        autoSearchDelay: tool.options?.autoSearchDelay ?? 500,
        showInfoWhenExceeded: tool.options?.showInfoWhenExceeded ?? false,
        disableAutocomplete: tool.options?.disableAutocomplete ?? false,
        disableAutoCombinations: tool.options?.disableAutoCombinations ?? false,
        wildcardBeforeSearch: tool.options?.wildcardBeforeSearch ?? false,
        autofocusSearch: tool.options?.autofocusSearch ?? false,
        enablePolygonSearch: tool.options?.enablePolygonSearch ?? true,
        enableRadiusSearch: tool.options?.enableRadiusSearch ?? true,
        enableAreaSearch: tool.options?.enableAreaSearch ?? true,
        searchWithinView: tool.options?.searchWithinView ?? false,
        searchVisibleLayers: tool.options?.searchVisibleLayers ?? true,
        wildcardBefore: tool.options?.wildcardBefore ?? true,
        wildcardAfter: tool.options?.wildcardAfter ?? true,
        caseSensitive: tool.options?.caseSensitive ?? true,
        requireFullObject: tool.options?.requireFullObject ?? true,
        showResultLabel: tool.options?.showResultLabel ?? true,
        preSelected: tool.options?.preSelected ?? true,
        autoShowAllResultsOnMap: tool.options?.autoShowAllResultsOnMap ?? false,
        allowResultFiltering: tool.options?.allowResultFiltering ?? false,
        allowResultSorting: tool.options?.allowResultSorting ?? false,
        allowQuickClearSelection:
          tool.options?.allowQuickClearSelection ?? false,
        allowDownloadResults: tool.options?.allowDownloadResults ?? false,
        showPreviewOnHover: tool.options?.showPreviewOnHover ?? false,
        collectSelectedResults: tool.options?.collectSelectedResults ?? false,
        showPrevNextButtons: tool.options?.showPrevNextButtons ?? false,
        maxZoomLevel: tool.options?.maxZoomLevel ?? -1,
        hitIcon: tool.options?.hitIcon ?? "",
        iconDisplacementX: tool.options?.iconDisplacementX ?? 0,
        iconDisplacementY: tool.options?.iconDisplacementY ?? 0,
        iconScale: tool.options?.iconScale ?? 1,
        strokeColor: tool.options?.strokeColor ?? "",
        strokeOpacity: tool.options?.strokeOpacity ?? "",
        standardResultsMarkedFillColor:
          tool.options?.standardResultsMarkedFillColor ?? "",
        standardResultsMarkedFrameColor:
          tool.options?.standardResultsMarkedFrameColor ?? "",
        markedResultsTextFillColor:
          tool.options?.markedResultsTextFillColor ?? "",
        markedResultsTextFrameColor:
          tool.options?.markedResultsTextFrameColor ?? "",
        markedResultsMarkedFillColor:
          tool.options?.markedResultsMarkedFillColor ?? "",
        markedResultsMarkedFrameColor:
          tool.options?.markedResultsMarkedFrameColor ?? "",
        activeResultTextFillColor:
          tool.options?.activeResultTextFillColor ?? "",
        activeResultTextFrameColor:
          tool.options?.activeResultTextFrameColor ?? "",
        activeResultMarkedFillColor:
          tool.options?.activeResultMarkedFillColor ?? "",
        activeResultMarkedFrameColor:
          tool.options?.activeResultMarkedFrameColor ?? "",
      });
    }
  }, [tool, reset, parentControl]);

  return (
    <>
      <FormPanel title={t("tools.search.generalSettings")}>
        <FormFieldGrid>
          {/* Infotext */}
          <FormFieldRow>
            <Controller
              name="searchInfoText"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label={t("tools.search.infoText")}
                  placeholder={t("tools.search.infoTextPlaceholder")}
                />
              )}
            />
          </FormFieldRow>

          {/* Max hits */}
          <FormFieldRow>
            <Controller
              name="maxHitsPerDataset"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  fullWidth
                  label={t("tools.search.maxHitsPerDataset")}
                />
              )}
            />
          </FormFieldRow>

          {/* Delay */}
          <FormFieldRow>
            <Controller
              name="autoSearchDelay"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  fullWidth
                  label={t("tools.search.autoSearchDelay")}
                />
              )}
            />
          </FormFieldRow>

          {/* Checkboxes */}
          <FormFieldRow>
            <Controller
              name="showInfoWhenExceeded"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.showInfoWhenExceeded")}
                />
              )}
            />
          </FormFieldRow>

          <FormFieldRow>
            <Controller
              name="disableAutocomplete"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.disableAutocomplete")}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="disableAutoCombinations"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.disableAutoCombinations")}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="wildcardBeforeSearch"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.wildcardBeforeSearch")}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="autofocusSearch"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.autofocusSearch")}
                />
              )}
            />
          </FormFieldRow>
        </FormFieldGrid>
      </FormPanel>

      <FormAccordion title={t("tools.search.spatialSettings")}>
        <FormFieldGrid>
          {/* Spatial search checkboxes */}
          <FormFieldRow>
            <Controller
              name="enablePolygonSearch"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.spatial.polygon")}
                />
              )}
            />
          </FormFieldRow>

          <FormFieldRow>
            <Controller
              name="enableRadiusSearch"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.spatial.radius")}
                />
              )}
            />
          </FormFieldRow>

          <FormFieldRow>
            <Controller
              name="enableAreaSearch"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.spatial.area")}
                />
              )}
            />
          </FormFieldRow>

          <FormFieldRow>
            <Controller
              name="searchWithinView"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.spatial.withinView")}
                />
              )}
            />
          </FormFieldRow>
        </FormFieldGrid>
        <FormFieldGrid>
          <FormFieldRow>
            <FormControl fullWidth>
              <InputLabel id="strokeColor" shrink>
                {t("tools.strokeColor")}
              </InputLabel>
              <Controller
                name="strokeColor"
                control={control}
                render={({ field }) => (
                  <SketchPicker
                    width="220px"
                    color={
                      typeof field.value === "string" ? field.value : "#000000"
                    }
                    onChange={(color) => field.onChange(color.hex)}
                  />
                )}
              />
            </FormControl>
          </FormFieldRow>
          <FormFieldRow>
            <FormControl fullWidth>
              <InputLabel id="strokeOpacity" shrink>
                {t("tools.strokeOpacity")}
              </InputLabel>
              <Controller
                name="strokeOpacity"
                control={control}
                render={({ field }) => (
                  <SketchPicker
                    width="220px"
                    color={
                      typeof field.value === "string" ? field.value : "#000000"
                    }
                    onChange={(color) => field.onChange(color.hex)}
                  />
                )}
              />
            </FormControl>
          </FormFieldRow>
        </FormFieldGrid>
      </FormAccordion>

      <FormAccordion title={t("tools.search.userSettings.title")}>
        <FormFieldGrid>
          <FormFieldRow>
            <Controller
              name="searchVisibleLayers"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.userSettings.searchVisibleLayers")}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="preSelected"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={!!field.value} />}
                  label={t("tools.search.userSettings.preSelected")}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="wildcardBefore"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.userSettings.wildcardBefore")}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="wildcardAfter"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.userSettings.wildcardAfter")}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="caseSensitive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.userSettings.caseSensitive")}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="requireFullObject"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.userSettings.requireFullObject")}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="showResultLabel"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t("tools.search.userSettings.showResultLabel")}
                />
              )}
            />
          </FormFieldRow>
        </FormFieldGrid>
      </FormAccordion>

      <FormAccordion
        title={t("tools.search.resultDisplayOptions.title", {
          defaultValue: "Alternativ för visning av resultat",
        })}
      >
        <FormFieldGrid>
          <FormFieldRow>
            <Controller
              name="autoShowAllResultsOnMap"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t(
                    "tools.search.resultDisplayOptions.autoShowAllResultsOnMap",
                  )}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="allowResultFiltering"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t(
                    "tools.search.resultDisplayOptions.allowResultFiltering",
                  )}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="allowResultSorting"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t(
                    "tools.search.resultDisplayOptions.allowResultSorting",
                  )}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="allowQuickClearSelection"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t(
                    "tools.search.resultDisplayOptions.allowQuickClearSelection",
                  )}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="allowDownloadResults"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t(
                    "tools.search.resultDisplayOptions.allowDownloadResults",
                  )}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="showPreviewOnHover"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t(
                    "tools.search.resultDisplayOptions.showPreviewOnHover",
                  )}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="collectSelectedResults"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t(
                    "tools.search.resultDisplayOptions.collectSelectedResults",
                  )}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="showPrevNextButtons"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} checked={!!field.value} />}
                  label={t(
                    "tools.search.resultDisplayOptions.showPrevNextButtons",
                  )}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="maxZoomLevel"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  fullWidth
                  label={t(
                    "tools.search.resultDisplayOptions.maxZoomLevel",
                    {},
                  )}
                />
              )}
            />
          </FormFieldRow>
        </FormFieldGrid>
      </FormAccordion>

      <FormAccordion title={t("tools.search.hitIconandResultsInMap")}>
        <FormFieldGrid>
          {/* Hit icon */}
          <FormFieldRow>
            <Controller
              name="hitIcon"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="text"
                  fullWidth
                  label={t("tools.search.hitIcon")}
                  placeholder={t("tools.search.hitIconPlaceholder")}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="iconDisplacementX"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  fullWidth
                  label={t("tools.search.iconDisplacementX")}
                  placeholder={t("tools.search.iconDisplacementXPlaceholder")}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="iconDisplacementY"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  fullWidth
                  label={t("tools.search.iconDisplacementY")}
                  placeholder={t("tools.search.iconDisplacementYPlaceholder")}
                />
              )}
            />
          </FormFieldRow>
          <FormFieldRow>
            <Controller
              name="iconScale"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  fullWidth
                  label={t("tools.search.iconScale")}
                  placeholder={t("tools.search.iconScalePlaceholder")}
                />
              )}
            />
          </FormFieldRow>
        </FormFieldGrid>
      </FormAccordion>

      <FormAccordion title={t("tools.search.standardAppearance")}>
        <FormFieldGrid>
          <FormFieldRow>
            <FormControl fullWidth>
              <InputLabel id="standardResultsMarkedFillColor" shrink>
                {t("tools.search.standardResultsMarkedFillColor")}
              </InputLabel>
              <Controller
                name="standardResultsMarkedFillColor"
                control={control}
                render={({ field }) => (
                  <SketchPicker
                    width="220px"
                    color={
                      typeof field.value === "string" ? field.value : "#000000"
                    }
                    onChange={(color) => field.onChange(color.hex)}
                  />
                )}
              />
            </FormControl>
          </FormFieldRow>
          <FormFieldRow>
            <FormControl fullWidth>
              <InputLabel id="standardResultsMarkedFrameColor" shrink>
                {t("tools.search.standardResultsMarkedFrameColor")}
              </InputLabel>
              <Controller
                name="standardResultsMarkedFrameColor"
                control={control}
                render={({ field }) => (
                  <SketchPicker
                    width="220px"
                    color={
                      typeof field.value === "string" ? field.value : "#000000"
                    }
                    onChange={(color) => field.onChange(color.hex)}
                  />
                )}
              />
            </FormControl>
          </FormFieldRow>
        </FormFieldGrid>
      </FormAccordion>

      <FormAccordion title={t("tools.search.markedResultsAppearance")}>
        <FormFieldGrid>
          <FormFieldRow>
            <FormControl fullWidth>
              <InputLabel id="markedResultsTextFillColor" shrink>
                {t("tools.search.markedResultsTextFillColor")}
              </InputLabel>
              <Controller
                name="markedResultsTextFillColor"
                control={control}
                render={({ field }) => (
                  <SketchPicker
                    width="220px"
                    color={
                      typeof field.value === "string" ? field.value : "#000000"
                    }
                    onChange={(color) => field.onChange(color.hex)}
                  />
                )}
              />
            </FormControl>
          </FormFieldRow>
          <FormFieldRow>
            <FormControl fullWidth>
              <InputLabel id="markedResultsTextFrameColor" shrink>
                {t("tools.search.markedResultsTextFrameColor")}
              </InputLabel>
              <Controller
                name="markedResultsTextFrameColor"
                control={control}
                render={({ field }) => (
                  <SketchPicker
                    width="220px"
                    color={
                      typeof field.value === "string" ? field.value : "#000000"
                    }
                    onChange={(color) => field.onChange(color.hex)}
                  />
                )}
              />
            </FormControl>
          </FormFieldRow>
          <FormFieldRow>
            <FormControl fullWidth>
              <InputLabel id="markedResultsMarkedFillColor" shrink>
                {t("tools.search.markedResultsMarkedFillColor")}
              </InputLabel>
              <Controller
                name="markedResultsMarkedFillColor"
                control={control}
                render={({ field }) => (
                  <SketchPicker
                    width="220px"
                    color={
                      typeof field.value === "string" ? field.value : "#000000"
                    }
                    onChange={(color) => field.onChange(color.hex)}
                  />
                )}
              />
            </FormControl>
          </FormFieldRow>
          <FormFieldRow>
            <FormControl fullWidth>
              <InputLabel id="markedResultsMarkedFrameColor" shrink>
                {t("tools.search.markedResultsMarkedFrameColor")}
              </InputLabel>
              <Controller
                name="markedResultsMarkedFrameColor"
                control={control}
                render={({ field }) => (
                  <SketchPicker
                    width="220px"
                    color={
                      typeof field.value === "string" ? field.value : "#000000"
                    }
                    onChange={(color) => field.onChange(color.hex)}
                  />
                )}
              />
            </FormControl>
          </FormFieldRow>
        </FormFieldGrid>
      </FormAccordion>
      {/* Utseende för det aktiva ("highlightade") resultatet */}
      <FormAccordion title={t("tools.search.activeResultAppearance")}>
        <FormFieldGrid>
          <FormFieldRow>
            <FormControl fullWidth>
              <InputLabel id="activeResultTextFillColor" shrink>
                {t("tools.search.activeResultTextFillColor")}
              </InputLabel>
              <Controller
                name="activeResultTextFillColor"
                control={control}
                render={({ field }) => (
                  <SketchPicker
                    width="220px"
                    color={
                      typeof field.value === "string" ? field.value : "#000000"
                    }
                    onChange={(color) => field.onChange(color.hex)}
                  />
                )}
              />
            </FormControl>
          </FormFieldRow>
          <FormFieldRow>
            <FormControl fullWidth>
              <InputLabel id="activeResultTextFrameColor" shrink>
                {t("tools.search.activeResultTextFrameColor")}
              </InputLabel>
              <Controller
                name="activeResultTextFrameColor"
                control={control}
                render={({ field }) => (
                  <SketchPicker
                    width="220px"
                    color={
                      typeof field.value === "string" ? field.value : "#000000"
                    }
                    onChange={(color) => field.onChange(color.hex)}
                  />
                )}
              />
            </FormControl>
          </FormFieldRow>
          <FormFieldRow>
            <FormControl fullWidth>
              <InputLabel id="activeResultMarkedFillColor" shrink>
                {t("tools.search.activeResultMarkedFillColor")}
              </InputLabel>
              <Controller
                name="activeResultMarkedFillColor"
                control={control}
                render={({ field }) => (
                  <SketchPicker
                    width="220px"
                    color={
                      typeof field.value === "string" ? field.value : "#000000"
                    }
                    onChange={(color) => field.onChange(color.hex)}
                  />
                )}
              />
            </FormControl>
          </FormFieldRow>
          <FormFieldRow>
            <FormControl fullWidth>
              <InputLabel id="activeResultMarkedFrameColor" shrink>
                {t("tools.search.activeResultMarkedFrameColor")}
              </InputLabel>
              <Controller
                name="activeResultMarkedFrameColor"
                control={control}
                render={({ field }) => (
                  <SketchPicker
                    width="220px"
                    color={
                      typeof field.value === "string" ? field.value : "#000000"
                    }
                    onChange={(color) => field.onChange(color.hex)}
                  />
                )}
              />
            </FormControl>
          </FormFieldRow>
        </FormFieldGrid>
      </FormAccordion>
      {/* <FormPanel title={t("tools.search.availableLayers")}>
        {layer && (
          <AvailableLayersGrid
            isLoading={serviceLoading}
            getCapLayers={getCapLayers}
            selectedLayers={layer?.selectedLayers ?? []}
            filteredLayers={filteredLayers}
            setSearchTerm={setSearchTerm}
            setSelectGridId={setSelectGridId}
            searchTerm={searchTerm}
            selectGridId={selectGridId}
            selectedRowObjects={selectedRowObjects}
          />
        )}{" "}
      </FormPanel> */}
    </>
  );
}
