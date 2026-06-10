import { Stack } from "@mui/material";
import { useTranslation } from "react-i18next";

import Page from "../../layouts/root/components/page";
import UserTable from "./components/user-table";
import CreateUserForm from "./components/create-user-form";

export default function UsersPage() {
  const { t } = useTranslation();

  return (
    <Page title={t("common.users")}>
      <Stack spacing={2} sx={{ width: "100%" }}>
        <UserTable />
        <CreateUserForm />
      </Stack>
    </Page>
  );
}
