import { useEffect } from "react";
import { FieldValues, useForm, Controller } from "react-hook-form";
import {
  Grid2 as Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import FormContainer from "../../components/form-components/form-container";
import FormAccordion from "../../components/form-components/form-accordion";

interface SettingsFormValues extends FieldValues {
  availableCoordinateSystem: string;
  preSelectedCoordinateSystem: string;
}

const defaultValues: SettingsFormValues = {
  availableCoordinateSystem: "1",
  preSelectedCoordinateSystem: "1",
};

export default function SettingsForm() {
  const { t, i18n } = useTranslation();

  const { control, handleSubmit, reset } = useForm<SettingsFormValues>({
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    reset(defaultValues);
    // Re-initialize when language changes so translated labels refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const onSubmit = (data: SettingsFormValues) => {
    console.log("All Data: ", data);
  };

  return (
    <FormContainer
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
    >
      <FormAccordion title={t("settings.common.title")}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel id="available-coord-label" shrink>
                {t("settings.available.coordinateSystem")}
              </InputLabel>
              <Controller
                name="availableCoordinateSystem"
                control={control}
                render={({ field }) => (
                  <Select
                    labelId="available-coord-label"
                    label={t("settings.available.coordinateSystem")}
                    displayEmpty
                    {...field}
                  >
                    <MenuItem value="1">Option 1</MenuItem>
                    <MenuItem value="2">Option 2</MenuItem>
                    <MenuItem value="3">Option 3</MenuItem>
                  </Select>
                )}
              />
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth>
              <InputLabel id="preselected-coord-label" shrink>
                {t("settings.preSelected.coordinateSystem")}
              </InputLabel>
              <Controller
                name="preSelectedCoordinateSystem"
                control={control}
                render={({ field }) => (
                  <Select
                    labelId="preselected-coord-label"
                    label={t("settings.preSelected.coordinateSystem")}
                    displayEmpty
                    {...field}
                  >
                    <MenuItem value="1">Option 1</MenuItem>
                    <MenuItem value="2">Option 2</MenuItem>
                    <MenuItem value="3">Option 3</MenuItem>
                  </Select>
                )}
              />
            </FormControl>
          </Grid>
        </Grid>
      </FormAccordion>

      <FormAccordion title={t("settings.service.title")} />
      <FormAccordion title={t("settings.layer.title")} />
      <FormAccordion title={t("settings.map.title")} />
      <FormAccordion title={t("settings.tools.title")} />
      <FormAccordion title={t("settings.authorization.title")} />
    </FormContainer>
  );
}
