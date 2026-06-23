import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { Control, Controller, FieldValues, UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
import FormPanel from "../../../components/form-components/form-panel";
import FormFieldGrid, {
  FormFieldRow,
} from "../../../components/form-components/form-field-grid";
import SearchablePanel from "../../../components/form-components/searchable-panel";
import { SettingsSearchField } from "../../../components/form-components/searchable-field";
import { useSettingsSearchLabels } from "../../../hooks/use-settings-search-labels";
import type { Map } from "../../../api/maps";

export type MapSettingsSection =
  | "map"
  | "controls"
  | "appearance"
  | "content"
  | "search";

interface MapSettingsFormProps {
  map: Map;
  register: UseFormRegister<FieldValues>;
  control: Control<FieldValues>;
  activeSection: MapSettingsSection;
  settingsSearchTerm: string;
  showSettingsSearchUi: boolean;
  getValues: () => FieldValues;
}

function MapCheckboxField({
  name,
  labelKey,
  control,
  settingsSearchTerm,
  showSettingsSearchUi,
  getValues,
}: {
  name: string;
  labelKey: string;
  control: Control<FieldValues>;
  settingsSearchTerm: string;
  showSettingsSearchUi: boolean;
  getValues: () => FieldValues;
}) {
  const { t } = useTranslation();

  return (
    <SettingsSearchField
      labelKeys={[labelKey]}
      fields={[name]}
      searchTerm={settingsSearchTerm}
      allValues={showSettingsSearchUi ? getValues() : undefined}
    >
      <FormControlLabel
        control={
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <Checkbox
                checked={Boolean(field.value)}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
        }
        label={t(labelKey as never)}
      />
    </SettingsSearchField>
  );
}

export default function MapSettingsForm({
  map,
  register,
  control,
  activeSection,
  settingsSearchTerm,
  showSettingsSearchUi,
  getValues,
}: MapSettingsFormProps) {
  const { t } = useTranslation();
  const settingsSearchLabels = useSettingsSearchLabels();

  const showMapSection = activeSection === "map" || showSettingsSearchUi;
  const showControlsSection =
    activeSection === "controls" || showSettingsSearchUi;
  const showAppearanceSection =
    activeSection === "appearance" || showSettingsSearchUi;
  const showContentSection =
    activeSection === "content" || showSettingsSearchUi;

  const searchValues = showSettingsSearchUi ? getValues() : undefined;

  return (
    <>
      {showMapSection && (
        <>
          <SearchablePanel
            panelTitleKeywords={settingsSearchLabels("map.baseSettings")}
            keywords={[
              ...settingsSearchLabels(
                "map.projection",
                "map.startZoom",
                "map.maxZoom",
                "map.minZoom",
                "map.centerCoordinate",
                "map.origin",
                "map.extent",
                "map.resolutions",
                "map.printResolutions",
              ),
              "projection",
              "zoom",
              "extent",
              "resolution",
            ]}
            fields={[
              "options.projection",
              "options.startZoom",
              "options.maxZoom",
              "options.minZoom",
              "options.centerCoordinate",
              "options.origin",
              "options.extent",
              "options.resolutions",
              "options.printResolutions",
            ]}
            allValues={searchValues}
            searchTerm={settingsSearchTerm}
          >
            <FormPanel title={t("map.baseSettings")}>
              <FormFieldGrid>
                <SettingsSearchField
                  labelKeys={["map.projection"]}
                  fields={["options.projection"]}
                  synonyms={["projection", "epsg"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.projection")}
                      fullWidth
                      defaultValue={map?.options?.projection ?? "EPSG:3006"}
                      {...register("options.projection")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
                <SettingsSearchField
                  labelKeys={["map.startZoom"]}
                  fields={["options.startZoom"]}
                  synonyms={["zoom", "start"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.startZoom")}
                      fullWidth
                      type="number"
                      defaultValue={map?.options?.startZoom ?? 1.33}
                      {...register("options.startZoom")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
                <SettingsSearchField
                  labelKeys={["map.maxZoom"]}
                  fields={["options.maxZoom"]}
                  synonyms={["zoom", "max"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.maxZoom")}
                      fullWidth
                      type="number"
                      defaultValue={map?.options?.maxZoom ?? 8}
                      {...register("options.maxZoom")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
                <SettingsSearchField
                  labelKeys={["map.minZoom"]}
                  fields={["options.minZoom"]}
                  synonyms={["zoom", "min"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.minZoom")}
                      fullWidth
                      type="number"
                      defaultValue={map?.options?.minZoom ?? 0}
                      {...register("options.minZoom")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
                <SettingsSearchField
                  labelKeys={["map.centerCoordinate"]}
                  fields={["options.centerCoordinate"]}
                  synonyms={["center", "coordinate"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.centerCoordinate")}
                      fullWidth
                      defaultValue={
                        map?.options?.centerCoordinate ?? "576357, 6386049"
                      }
                      {...register("options.centerCoordinate")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
                <SettingsSearchField
                  labelKeys={["map.origin"]}
                  fields={["options.origin"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.origin")}
                      fullWidth
                      defaultValue={map?.options?.origin ?? "0,0"}
                      {...register("options.origin")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
                <SettingsSearchField
                  labelKeys={["map.extent"]}
                  fields={["options.extent"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.extent")}
                      fullWidth
                      defaultValue={
                        map?.options?.extent ??
                        "-1200000, 4700000, 2600000, 8500000"
                      }
                      {...register("options.extent")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
                <SettingsSearchField
                  labelKeys={["map.resolutions"]}
                  fields={["options.resolutions"]}
                  synonyms={["resolution"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.resolutions")}
                      fullWidth
                      defaultValue={
                        map?.options?.resolutions ??
                        "2048, 1024, 512, 256, 128, 64, 32, 16, 8"
                      }
                      {...register("options.resolutions")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
                <SettingsSearchField
                  labelKeys={["map.printResolutions"]}
                  fields={["options.printResolutions"]}
                  synonyms={["print", "resolution"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.printResolutions")}
                      fullWidth
                      defaultValue={map?.options?.printResolutions ?? ""}
                      {...register("options.printResolutions")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
              </FormFieldGrid>
            </FormPanel>
          </SearchablePanel>

          <SearchablePanel
            panelTitleKeywords={settingsSearchLabels("map.extraSettings")}
            keywords={[
              ...settingsSearchLabels(
                "map.constrainResolution",
                "map.constrainOnlyCenter",
                "map.constrainResolutionMobile",
                "map.enableDownloadLink",
                "map.enableAppStateInHash",
                "map.confirmOnWindowClose",
                "map.logoLight",
                "map.logoDark",
                "map.legendOptions",
                "map.crossOrigin",
              ),
              "logo",
              "cookie",
              "download",
            ]}
            fields={[
              "options.constrainResolution",
              "options.constrainOnlyCenter",
              "options.constrainResolutionMobile",
              "options.enableDownloadLink",
              "options.enableAppStateInHash",
              "options.confirmOnWindowClose",
              "options.logoLight",
              "options.logoDark",
              "options.legendOptions",
              "options.crossOrigin",
            ]}
            allValues={searchValues}
            searchTerm={settingsSearchTerm}
          >
            <FormPanel title={t("map.extraSettings")}>
              <FormFieldGrid>
                <FormFieldRow>
                  <FormGroup>
                    <MapCheckboxField
                      name="options.constrainResolution"
                      labelKey="map.constrainResolution"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.constrainOnlyCenter"
                      labelKey="map.constrainOnlyCenter"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.constrainResolutionMobile"
                      labelKey="map.constrainResolutionMobile"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.enableDownloadLink"
                      labelKey="map.enableDownloadLink"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.enableAppStateInHash"
                      labelKey="map.enableAppStateInHash"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.confirmOnWindowClose"
                      labelKey="map.confirmOnWindowClose"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                  </FormGroup>
                </FormFieldRow>
                <SettingsSearchField
                  labelKeys={["map.logoLight"]}
                  fields={["options.logoLight"]}
                  synonyms={["logo", "light"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.logoLight")}
                      fullWidth
                      defaultValue={map?.options?.logoLight ?? "/logoLight.png"}
                      {...register("options.logoLight")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
                <SettingsSearchField
                  labelKeys={["map.logoDark"]}
                  fields={["options.logoDark"]}
                  synonyms={["logo", "dark"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.logoDark")}
                      fullWidth
                      defaultValue={map?.options?.logoDark ?? ""}
                      {...register("options.logoDark")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
                <SettingsSearchField
                  labelKeys={["map.legendOptions"]}
                  fields={["options.legendOptions"]}
                  synonyms={["legend"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.legendOptions")}
                      fullWidth
                      defaultValue={map?.options?.legendOptions ?? ""}
                      {...register("options.legendOptions")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
                <SettingsSearchField
                  labelKeys={["map.crossOrigin"]}
                  fields={["options.crossOrigin"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.crossOrigin")}
                      fullWidth
                      defaultValue={map?.options?.crossOrigin ?? "anonymous"}
                      {...register("options.crossOrigin")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
              </FormFieldGrid>
            </FormPanel>
          </SearchablePanel>
        </>
      )}

      {showControlsSection && (
        <>
          <SearchablePanel
            panelTitleKeywords={settingsSearchLabels("map.extraMapControls")}
            keywords={[
              ...settingsSearchLabels(
                "map.mapselector",
                "map.mapcleaner",
                "map.mapresetter",
                "map.showThemeToggler",
                "map.showUserAvatar",
                "map.showRecentlyUsedPlugins",
              ),
              "theme",
              "avatar",
              "plugin",
            ]}
            fields={[
              "options.mapselector",
              "options.mapcleaner",
              "options.mapresetter",
              "options.showThemeToggler",
              "options.showUserAvatar",
              "options.showRecentlyUsedPlugins",
            ]}
            allValues={searchValues}
            searchTerm={settingsSearchTerm}
          >
            <FormPanel title={t("map.extraMapControls")}>
              <FormFieldGrid>
                <FormFieldRow>
                  <FormGroup>
                    <MapCheckboxField
                      name="options.mapselector"
                      labelKey="map.mapselector"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.mapcleaner"
                      labelKey="map.mapcleaner"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.mapresetter"
                      labelKey="map.mapresetter"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.showThemeToggler"
                      labelKey="map.showThemeToggler"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.showUserAvatar"
                      labelKey="map.showUserAvatar"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.showRecentlyUsedPlugins"
                      labelKey="map.showRecentlyUsedPlugins"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                  </FormGroup>
                </FormFieldRow>
              </FormFieldGrid>
            </FormPanel>
          </SearchablePanel>

          <SearchablePanel
            panelTitleKeywords={settingsSearchLabels("map.interactions")}
            keywords={[
              ...settingsSearchLabels(
                "map.altShiftDragRotate",
                "map.onFocusOnly",
                "map.doubleClickZoom",
                "map.keyboard",
                "map.mouseWheelZoom",
                "map.shiftDragZoom",
                "map.dragPan",
                "map.pinchRotate",
                "map.pinchZoom",
                "map.zoomLevelDelta",
                "map.zoomAnimationDuration",
              ),
              "interaction",
              "zoom",
              "pan",
            ]}
            fields={[
              "options.altShiftDragRotate",
              "options.onFocusOnly",
              "options.doubleClickZoom",
              "options.keyboard",
              "options.mouseWheelZoom",
              "options.shiftDragZoom",
              "options.dragPan",
              "options.pinchRotate",
              "options.pinchZoom",
              "options.zoomLevelDelta",
              "options.zoomAnimationDuration",
            ]}
            allValues={searchValues}
            searchTerm={settingsSearchTerm}
          >
            <FormPanel title={t("map.interactions")}>
              <FormFieldGrid>
                <FormFieldRow>
                  <FormGroup>
                    <MapCheckboxField
                      name="options.altShiftDragRotate"
                      labelKey="map.altShiftDragRotate"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.onFocusOnly"
                      labelKey="map.onFocusOnly"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.doubleClickZoom"
                      labelKey="map.doubleClickZoom"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.keyboard"
                      labelKey="map.keyboard"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.mouseWheelZoom"
                      labelKey="map.mouseWheelZoom"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.shiftDragZoom"
                      labelKey="map.shiftDragZoom"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.dragPan"
                      labelKey="map.dragPan"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.pinchRotate"
                      labelKey="map.pinchRotate"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.pinchZoom"
                      labelKey="map.pinchZoom"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                  </FormGroup>
                </FormFieldRow>
                <SettingsSearchField
                  labelKeys={["map.zoomLevelDelta"]}
                  fields={["options.zoomLevelDelta"]}
                  synonyms={["zoom"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.zoomLevelDelta")}
                      fullWidth
                      type="number"
                      defaultValue={map?.options?.zoomLevelDelta ?? ""}
                      {...register("options.zoomLevelDelta")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
                <SettingsSearchField
                  labelKeys={["map.zoomAnimationDuration"]}
                  fields={["options.zoomAnimationDuration"]}
                  synonyms={["zoom", "animation"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.zoomAnimationDuration")}
                      fullWidth
                      type="number"
                      defaultValue={map?.options?.zoomAnimationDuration ?? ""}
                      {...register("options.zoomAnimationDuration")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
              </FormFieldGrid>
            </FormPanel>
          </SearchablePanel>
        </>
      )}

      {showAppearanceSection && (
        <SearchablePanel
          panelTitleKeywords={settingsSearchLabels("map.colors")}
          keywords={[
            ...settingsSearchLabels(
              "map.preferredColorScheme",
              "map.primaryColor",
              "map.secondaryColor",
              "map.colorSchemeUser",
              "map.colorSchemeLight",
              "map.colorSchemeDark",
            ),
            "color",
            "theme",
            "dark",
            "light",
          ]}
          fields={[
            "options.preferredColorScheme",
            "options.primaryColor",
            "options.secondaryColor",
          ]}
          allValues={searchValues}
          searchTerm={settingsSearchTerm}
        >
          <FormPanel title={t("map.colors")}>
            <FormFieldGrid>
              <SettingsSearchField
                labelKeys={["map.preferredColorScheme"]}
                fields={["options.preferredColorScheme"]}
                synonyms={["color", "theme", "dark", "light"]}
                searchTerm={settingsSearchTerm}
                allValues={searchValues}
              >
                <FormFieldRow>
                  <FormControl fullWidth>
                    <InputLabel id="preferredColorScheme-label">
                      {t("map.preferredColorScheme")}
                    </InputLabel>
                    <Controller
                      name="options.preferredColorScheme"
                      control={control}
                      defaultValue={map?.options?.preferredColorScheme ?? "user"}
                      render={({ field }) => (
                        <Select
                          labelId="preferredColorScheme-label"
                          label={t("map.preferredColorScheme")}
                          {...field}
                        >
                          <MenuItem value="user">
                            {t("map.colorSchemeUser")}
                          </MenuItem>
                          <MenuItem value="light">
                            {t("map.colorSchemeLight")}
                          </MenuItem>
                          <MenuItem value="dark">
                            {t("map.colorSchemeDark")}
                          </MenuItem>
                        </Select>
                      )}
                    />
                  </FormControl>
                </FormFieldRow>
              </SettingsSearchField>
              <SettingsSearchField
                labelKeys={["map.primaryColor"]}
                fields={["options.primaryColor"]}
                synonyms={["color"]}
                searchTerm={settingsSearchTerm}
                allValues={searchValues}
              >
                <FormFieldRow>
                  <TextField
                    label={t("map.primaryColor")}
                    fullWidth
                    defaultValue={map?.options?.primaryColor ?? "#333333"}
                    {...register("options.primaryColor")}
                  />
                </FormFieldRow>
              </SettingsSearchField>
              <SettingsSearchField
                labelKeys={["map.secondaryColor"]}
                fields={["options.secondaryColor"]}
                synonyms={["color"]}
                searchTerm={settingsSearchTerm}
                allValues={searchValues}
              >
                <FormFieldRow>
                  <TextField
                    label={t("map.secondaryColor")}
                    fullWidth
                    defaultValue={map?.options?.secondaryColor ?? "#ffa000"}
                    {...register("options.secondaryColor")}
                  />
                </FormFieldRow>
              </SettingsSearchField>
            </FormFieldGrid>
          </FormPanel>
        </SearchablePanel>
      )}

      {showAppearanceSection && (
        <SearchablePanel
          panelTitleKeywords={settingsSearchLabels("map.sidepanel")}
          keywords={[
            ...settingsSearchLabels(
              "map.drawerStatic",
              "map.drawerVisible",
              "map.drawerVisibleMobile",
              "map.drawerPermanent",
              "map.drawerContent",
              "map.drawerTitle",
              "map.drawerButtonTitle",
              "map.drawerButtonIcon",
            ),
            "drawer",
            "panel",
            "sidebar",
          ]}
          fields={[
            "options.drawerStatic",
            "options.drawerVisible",
            "options.drawerVisibleMobile",
            "options.drawerPermanent",
            "options.drawerContent",
            "options.drawerTitle",
            "options.drawerButtonTitle",
            "options.drawerButtonIcon",
          ]}
          allValues={searchValues}
          searchTerm={settingsSearchTerm}
        >
          <FormPanel title={t("map.sidepanel")}>
            <FormFieldGrid>
              <FormFieldRow>
                <FormGroup>
                  <MapCheckboxField
                    name="options.drawerStatic"
                    labelKey="map.drawerStatic"
                    control={control}
                    settingsSearchTerm={settingsSearchTerm}
                    showSettingsSearchUi={showSettingsSearchUi}
                    getValues={getValues}
                  />
                  <MapCheckboxField
                    name="options.drawerVisible"
                    labelKey="map.drawerVisible"
                    control={control}
                    settingsSearchTerm={settingsSearchTerm}
                    showSettingsSearchUi={showSettingsSearchUi}
                    getValues={getValues}
                  />
                  <MapCheckboxField
                    name="options.drawerVisibleMobile"
                    labelKey="map.drawerVisibleMobile"
                    control={control}
                    settingsSearchTerm={settingsSearchTerm}
                    showSettingsSearchUi={showSettingsSearchUi}
                    getValues={getValues}
                  />
                  <MapCheckboxField
                    name="options.drawerPermanent"
                    labelKey="map.drawerPermanent"
                    control={control}
                    settingsSearchTerm={settingsSearchTerm}
                    showSettingsSearchUi={showSettingsSearchUi}
                    getValues={getValues}
                  />
                </FormGroup>
              </FormFieldRow>
              <SettingsSearchField
                labelKeys={["map.drawerContent"]}
                fields={["options.drawerContent"]}
                synonyms={["drawer"]}
                searchTerm={settingsSearchTerm}
                allValues={searchValues}
              >
                <FormFieldRow>
                  <TextField
                    label={t("map.drawerContent")}
                    fullWidth
                    defaultValue={map?.options?.drawerContent ?? "plugins"}
                    {...register("options.drawerContent")}
                  />
                </FormFieldRow>
              </SettingsSearchField>
              <SettingsSearchField
                labelKeys={["map.drawerTitle"]}
                fields={["options.drawerTitle"]}
                synonyms={["drawer", "title"]}
                searchTerm={settingsSearchTerm}
                allValues={searchValues}
              >
                <FormFieldRow>
                  <TextField
                    label={t("map.drawerTitle")}
                    fullWidth
                    defaultValue={map?.options?.drawerTitle ?? "Kartverktyg"}
                    {...register("options.drawerTitle")}
                  />
                </FormFieldRow>
              </SettingsSearchField>
              <SettingsSearchField
                labelKeys={["map.drawerButtonTitle"]}
                fields={["options.drawerButtonTitle"]}
                synonyms={["drawer", "button"]}
                searchTerm={settingsSearchTerm}
                allValues={searchValues}
              >
                <FormFieldRow>
                  <TextField
                    label={t("map.drawerButtonTitle")}
                    fullWidth
                    defaultValue={
                      map?.options?.drawerButtonTitle ?? "Kartverktyg"
                    }
                    {...register("options.drawerButtonTitle")}
                  />
                </FormFieldRow>
              </SettingsSearchField>
              <SettingsSearchField
                labelKeys={["map.drawerButtonIcon"]}
                fields={["options.drawerButtonIcon"]}
                synonyms={["drawer", "icon"]}
                searchTerm={settingsSearchTerm}
                allValues={searchValues}
              >
                <FormFieldRow>
                  <FormControl fullWidth>
                    <InputLabel id="drawerButtonIcon-label">
                      {t("map.drawerButtonIcon")}
                    </InputLabel>
                    <Controller
                      name="options.drawerButtonIcon"
                      control={control}
                      defaultValue={map?.options?.drawerButtonIcon ?? "MapIcon"}
                      render={({ field }) => (
                        <Select
                          labelId="drawerButtonIcon-label"
                          label={t("map.drawerButtonIcon")}
                          {...field}
                        >
                          <MenuItem value="MapIcon">MapIcon</MenuItem>
                          <MenuItem value="MenuIcon">MenuIcon</MenuItem>
                        </Select>
                      )}
                    />
                  </FormControl>
                </FormFieldRow>
              </SettingsSearchField>
            </FormFieldGrid>
          </FormPanel>
        </SearchablePanel>
      )}

      {showContentSection && (
        <>
          <SearchablePanel
            panelTitleKeywords={settingsSearchLabels("map.cookies")}
            keywords={[
              ...settingsSearchLabels(
                "map.showCookieNotice",
                "map.cookieUse3dPart",
                "map.showCookieNoticeButton",
                "map.cookieLink",
                "map.cookieMessage",
              ),
              "cookie",
              "gdpr",
            ]}
            fields={[
              "options.showCookieNotice",
              "options.cookieUse3dPart",
              "options.showCookieNoticeButton",
              "options.cookieLink",
              "options.cookieMessage",
            ]}
            allValues={searchValues}
            searchTerm={settingsSearchTerm}
          >
            <FormPanel title={t("map.cookies")}>
              <FormFieldGrid>
                <FormFieldRow>
                  <FormGroup>
                    <MapCheckboxField
                      name="options.showCookieNotice"
                      labelKey="map.showCookieNotice"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.cookieUse3dPart"
                      labelKey="map.cookieUse3dPart"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.showCookieNoticeButton"
                      labelKey="map.showCookieNoticeButton"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                  </FormGroup>
                </FormFieldRow>
                <SettingsSearchField
                  labelKeys={["map.cookieLink"]}
                  fields={["options.cookieLink"]}
                  synonyms={["cookie", "link"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.cookieLink")}
                      fullWidth
                      defaultValue={
                        map?.options?.cookieLink ??
                        "https://pts.se/sv/bransch/regler/lagar/lag-om-elektronisk-kommunikation/kakor-cookies/"
                      }
                      {...register("options.cookieLink")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
                <SettingsSearchField
                  labelKeys={["map.cookieMessage"]}
                  fields={["options.cookieMessage"]}
                  synonyms={["cookie", "message"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.cookieMessage")}
                      fullWidth
                      multiline
                      rows={3}
                      defaultValue={
                        map?.options?.cookieMessage ??
                        "Vi använder cookies för att följa upp användandet och ge en bra upplevelse av kartan. Du kan blockera cookies i webbläsaren men då visas detta meddelande igen."
                      }
                      {...register("options.cookieMessage")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
              </FormFieldGrid>
            </FormPanel>
          </SearchablePanel>

          <SearchablePanel
            panelTitleKeywords={settingsSearchLabels("map.introGuide")}
            keywords={[
              ...settingsSearchLabels(
                "map.introductionEnabled",
                "map.introductionShowControlButton",
                "map.introductionSteps",
              ),
              "intro",
              "guide",
              "onboarding",
            ]}
            fields={[
              "options.introductionEnabled",
              "options.introductionShowControlButton",
              "options.introductionSteps",
            ]}
            allValues={searchValues}
            searchTerm={settingsSearchTerm}
          >
            <FormPanel title={t("map.introGuide")}>
              <FormFieldGrid>
                <FormFieldRow>
                  <FormGroup>
                    <MapCheckboxField
                      name="options.introductionEnabled"
                      labelKey="map.introductionEnabled"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                    <MapCheckboxField
                      name="options.introductionShowControlButton"
                      labelKey="map.introductionShowControlButton"
                      control={control}
                      settingsSearchTerm={settingsSearchTerm}
                      showSettingsSearchUi={showSettingsSearchUi}
                      getValues={getValues}
                    />
                  </FormGroup>
                </FormFieldRow>
                <SettingsSearchField
                  labelKeys={["map.introductionSteps"]}
                  fields={["options.introductionSteps"]}
                  synonyms={["intro", "guide", "steps"]}
                  searchTerm={settingsSearchTerm}
                  allValues={searchValues}
                >
                  <FormFieldRow>
                    <TextField
                      label={t("map.introductionSteps")}
                      fullWidth
                      multiline
                      rows={8}
                      defaultValue={map?.options?.introductionSteps ?? "[]"}
                      {...register("options.introductionSteps")}
                    />
                  </FormFieldRow>
                </SettingsSearchField>
              </FormFieldGrid>
            </FormPanel>
          </SearchablePanel>
        </>
      )}
    </>
  );
}
