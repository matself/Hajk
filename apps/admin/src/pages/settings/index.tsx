import { useTranslation } from "react-i18next";
import { Stack } from "@mui/material";
import Page from "../../layouts/root/components/page";
import ThemeSwitcher from "../../components/theme-switcher";
import LanguageSwitcher from "../../components/language-switcher";
import DefaultMapSwitcher from "../../components/default-map-switcher";
import SettingsForm from "./form";

export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <Page title={t("common.settings")}>
      <Stack spacing={2} sx={{ width: "100%", mb: 2 }}>
        <LanguageSwitcher />
        <DefaultMapSwitcher />
        <ThemeSwitcher />
      </Stack>
      <SettingsForm />
    </Page>
  );
}
