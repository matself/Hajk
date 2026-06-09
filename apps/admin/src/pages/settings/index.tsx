import { useTranslation } from "react-i18next";
import Page from "../../layouts/root/components/page";
import { Grid2 as Grid } from "@mui/material";
import ThemeSwitcher from "../../components/theme-switcher";
import LanguageSwitcher from "../../components/language-switcher";
import DefaultMapSwitcher from "../../components/default-map-switcher";
import SettingsForm from "./form";

export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <Page title={t("common.settings")}>
      <Grid container gap={2} size={12}>
        <Grid size={12}>
          <LanguageSwitcher />
        </Grid>
        <Grid size={12}>
          <DefaultMapSwitcher />
        </Grid>
        <ThemeSwitcher />
      </Grid>
      <SettingsForm />
    </Page>
  );
}
