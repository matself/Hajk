import { useState } from "react";
import {
  styled,
  Button,
  List,
  ListItem,
  Typography,
  Box,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuIcon from "@mui/icons-material/Menu";
import DescriptionIcon from "@mui/icons-material/Description";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { Control, Controller, FieldValues } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Tool } from "../../../api/tools";
import { MenuEditor } from "../components/documenthandler/menu-editor/menu-editor";
import type { MenuConfig } from "../components/documenthandler/menu-editor/types";
import { DocumentsTabPanel } from "../components/documenthandler/documents/documents-tab-panel";
import { AttachmentsTabPanel } from "../components/documenthandler/attachments/attachments-tab-panel";
import { SettingsTabPanel } from "../components/documenthandler/settings/settings-tab-panel";

const StyledTabButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== "isActive",
})<{ isActive: boolean }>(({ theme, isActive }) => ({
  textTransform: "none",
  width: "100%",
  borderRadius: 14,
  justifyContent: "flex-start",
  color: theme.palette.text.primary,
  paddingTop: theme.spacing(1.8),
  paddingBottom: theme.spacing(1.8),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  minHeight: 48,
  backgroundColor: isActive ? theme.palette.action.focus : "transparent",
  transition: "all 200ms ease",
  "&:hover": {
    backgroundColor: isActive
      ? theme.palette.action.selected
      : theme.palette.action.hover,
  },
  "& .MuiButton-startIcon": {
    fontSize: "1.25rem",
    marginRight: theme.spacing(2),
  },
}));

interface DocumentHandlerRendererProps {
  tool: Tool;
  control: Control<FieldValues>;
}

type ActiveTab = "settings" | "menuSettings" | "documents" | "attachments";

export default function DocumentHandlerRenderer({
  control,
}: DocumentHandlerRendererProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>("settings");
  const [activeDocumentId, setActiveDocumentId] = useState<
    string | undefined
  >(undefined);

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    {
      key: "settings",
      label: t("common.settings"),
      icon: <SettingsIcon />,
    },
    {
      key: "menuSettings",
      label: t("tools.documenthandler.menuEditor.tabLabel"),
      icon: <MenuIcon />,
    },
    {
      key: "documents",
      label: t("tools.documenthandler.documents.tabLabel"),
      icon: <DescriptionIcon />,
    },
    {
      key: "attachments",
      label: t("tools.documenthandler.attachments.tabLabel"),
      icon: <AttachFileIcon />,
    },
  ];

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
      />
      <List
        sx={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 1,
          p: 0,
          mb: 2,
        }}
      >
        {tabs.map((tab) => (
          <ListItem
            key={tab.key}
            disablePadding
            disableGutters
            sx={{ width: "auto" }}
          >
            <StyledTabButton
              isActive={activeTab === tab.key}
              startIcon={tab.icon}
              onClick={() => setActiveTab(tab.key)}
            >
              <Typography>{tab.label}</Typography>
            </StyledTabButton>
          </ListItem>
        ))}
      </List>

      {/* Settings tab */}
      <Box sx={{ display: activeTab === "settings" ? "block" : "none" }}>
        <SettingsTabPanel control={control} />
      </Box>

      {/* Menu settings tab */}
      <Box sx={{ display: activeTab === "menuSettings" ? "block" : "none" }}>
        <Controller
          name="menuConfig"
          control={control}
          render={({ field }) => (
            <MenuEditor
              value={field.value as MenuConfig | undefined}
              onChange={field.onChange}
              onOpenDocument={(docId) => {
                setActiveDocumentId(docId);
                setActiveTab("documents");
              }}
            />
          )}
        />
      </Box>

      {/* Documents tab */}
      <Box sx={{ display: activeTab === "documents" ? "block" : "none" }}>
        <DocumentsTabPanel documentId={activeDocumentId} />
      </Box>

      {/* Attachments tab */}
      <Box sx={{ display: activeTab === "attachments" ? "block" : "none" }}>
        <AttachmentsTabPanel control={control} />
      </Box>
    </>
  );
}
