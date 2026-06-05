import { AttachFile as AttachFileIcon } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";
import { Control, FieldValues } from "react-hook-form";
import { useTranslation } from "react-i18next";
import FormPanel from "@/components/form-components/form-panel";
import { PdfLinksEditor } from "./pdf-links-editor";

interface AttachmentsTabPanelProps {
  control: Control<FieldValues>;
}

export function AttachmentsTabPanel({ control }: AttachmentsTabPanelProps) {
  const { t } = useTranslation();

  return (
    <FormPanel title={t("tools.documenthandler.attachments.title")}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <AttachFileIcon color="action" />
        <Typography variant="body2" color="text.secondary">
          {t("tools.documenthandler.attachments.description")}
        </Typography>
      </Box>
      <PdfLinksEditor control={control} />
    </FormPanel>
  );
}
