import { Box, Button, IconButton, TextField, Typography } from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { Control, Controller, FieldValues } from "react-hook-form";
import { useTranslation } from "react-i18next";

export interface PdfLink {
  name: string;
  link: string;
}

const EMPTY_PDF_LINK: PdfLink = { name: "", link: "" };

function normalizePdfLinks(value: unknown): PdfLink[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  return value.map((item) => ({
    name: typeof item?.name === "string" ? item.name : "",
    link: typeof item?.link === "string" ? item.link : "",
  }));
}

interface PdfLinksEditorProps {
  control: Control<FieldValues>;
}

export function PdfLinksEditor({ control }: PdfLinksEditorProps) {
  const { t } = useTranslation();

  return (
    <Controller
      name="pdfLinks"
      control={control}
      render={({ field }) => {
        const pdfLinks = normalizePdfLinks(field.value);

        const updateLink = (
          index: number,
          key: keyof PdfLink,
          value: string,
        ) => {
          const next = pdfLinks.map((item, i) =>
            i === index ? { ...item, [key]: value } : item,
          );
          field.onChange(next);
        };

        const addRow = () => {
          field.onChange([...pdfLinks, { ...EMPTY_PDF_LINK }]);
        };

        const removeRow = (index: number) => {
          field.onChange(pdfLinks.filter((_, i) => i !== index));
        };

        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {pdfLinks.map((pdfLink, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ minWidth: 24, textAlign: "right", flexShrink: 0 }}
                >
                  {index + 1}
                </Typography>
                <TextField
                  sx={{ flex: "1 1 220px", maxWidth: 280 }}
                  label={t("tools.documenthandler.attachments.nameLabel")}
                  placeholder={t(
                    "tools.documenthandler.attachments.namePlaceholder",
                  )}
                  value={pdfLink.name}
                  onChange={(event) =>
                    updateLink(index, "name", event.target.value)
                  }
                />
                <TextField
                  sx={{ flex: "1 1 250px", maxWidth: 400 }}
                  label={t("tools.documenthandler.attachments.linkLabel")}
                  placeholder={t(
                    "tools.documenthandler.attachments.linkPlaceholder",
                  )}
                  value={pdfLink.link}
                  onChange={(event) =>
                    updateLink(index, "link", event.target.value)
                  }
                />
                <IconButton
                  color="error"
                  sx={{ flexShrink: 0 }}
                  aria-label={t(
                    "tools.documenthandler.attachments.removeAttachment",
                  )}
                  onClick={() => removeRow(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addRow}
              >
                {t("tools.documenthandler.attachments.addAttachment")}
              </Button>
            </Box>
          </Box>
        );
      }}
    />
  );
}
