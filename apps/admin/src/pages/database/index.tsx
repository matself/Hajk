import { Box, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";

import Page from "../../layouts/root/components/page";
import DatabaseExportCard from "./components/export-card";
import DatabaseImportCard from "./components/import-card";
import DatabaseStatusCard from "./components/status-card";
import DatabaseExportsList from "./components/exports-list";

export default function DatabasePage() {
  const { t } = useTranslation();

  return (
    <Page title={t("database.title")}>
      <Stack spacing={3} sx={{ width: "100%" }}>
        <DatabaseStatusCard />
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
            alignItems: "stretch",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <DatabaseExportCard />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <DatabaseImportCard />
          </Box>
        </Box>
        <DatabaseExportsList />
      </Stack>
    </Page>
  );
}
