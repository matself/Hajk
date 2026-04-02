import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import {
  getDatabaseStatus,
  checkDatabaseTools,
  exportDatabase,
  importDatabase,
} from "./requests";

export const useDatabaseStatus = () => {
  return useQuery({
    queryKey: ["database-status"],
    queryFn: getDatabaseStatus,
  });
};

export const useDatabaseTools = () => {
  return useQuery({
    queryKey: ["database-tools"],
    queryFn: checkDatabaseTools,
  });
};

export const useExportDatabase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: exportDatabase,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["database-status"] });
    },
  });
};

export const useImportDatabase = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: importDatabase,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["database-status"] });

      if (data.requiresLogout) {
        toast.info(t("database.import.reloadToast"), {
          autoClose: 7000,
        });

        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    },
  });
};
