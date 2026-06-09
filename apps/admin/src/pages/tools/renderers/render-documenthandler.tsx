import { useEffect, useState } from "react";
import {
  styled,
  Button,
  List,
  ListItem,
  Typography,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuIcon from "@mui/icons-material/Menu";
import DescriptionIcon from "@mui/icons-material/Description";
import { Control, Controller, FieldValues, UseFormSetValue } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Tool, useMapsByToolName } from "../../../api/tools";
import { useDefaultMap } from "../../../hooks/use-default-map";
import { MenuEditor } from "../components/documenthandler/menu-editor/menu-editor";
import type { MenuConfig } from "../components/documenthandler/menu-editor/types";
import { DocumentsTabPanel } from "../components/documenthandler/documents/documents-tab-panel";
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
  setValue: UseFormSetValue<FieldValues>;
}

type ActiveTab = "settings" | "menuSettings" | "documents";

export default function DocumentHandlerRenderer({
  tool,
  control,
  setValue,
}: DocumentHandlerRendererProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>("settings");
  const [activeDocument, setActiveDocument] = useState<
    { folder: string; document: string } | undefined
  >(undefined);
  const [selectedMapName, setSelectedMapName] = useState<string | undefined>(
    undefined
  );

  const { defaultMap } = useDefaultMap();
  const { data: mapsWithTool } = useMapsByToolName(tool.type);
  const maps = mapsWithTool ?? [];
  const defaultMapForTool = maps.find((map) => map.name === defaultMap)?.name;
  const resolvedMapName =
    selectedMapName ??
    defaultMapForTool ??
    (maps.length === 1 ? maps[0].name : undefined);

  useEffect(() => {
    if (!selectedMapName && resolvedMapName) {
      setSelectedMapName(resolvedMapName);
    }
  }, [resolvedMapName, selectedMapName]);

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
  ];

  const handleMapChange = (mapName: string) => {
    setSelectedMapName(mapName);
    setActiveDocument(undefined);
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
      />
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mb: 2,
        }}
      >
        <List
          sx={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 1,
            p: 0,
            flex: 1,
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

        <FormControl
          size="small"
          sx={{ minWidth: 220, flexShrink: 0, pr: 2 }}
          disabled={maps.length === 0}
        >
          <InputLabel id="documenthandler-map-select-label">
            {t("tools.documenthandler.documents.selectMap")}
          </InputLabel>
          <Select
            labelId="documenthandler-map-select-label"
            label={t("tools.documenthandler.documents.selectMap")}
            value={resolvedMapName ?? ""}
            displayEmpty={maps.length === 0}
            onChange={(e) => handleMapChange(e.target.value)}
          >
            {maps.length === 0 ? (
              <MenuItem value="" disabled>
                {t("tools.documenthandler.documents.noMapsWithTool")}
              </MenuItem>
            ) : (
              maps.map((map) => (
                <MenuItem key={map.name} value={map.name}>
                  {map.options?.title ?? map.name}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Box>

      {/* Settings tab */}
      <Box sx={{ display: activeTab === "settings" ? "block" : "none" }}>
        <SettingsTabPanel
          control={control}
          setValue={setValue}
          mapName={resolvedMapName}
        />
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
              mapName={resolvedMapName}
              onOpenDocument={(folder: string, document: string) => {
                setActiveDocument({ folder, document });
                setActiveTab("documents");
              }}
            />
          )}
        />
      </Box>

      {/* Documents tab */}
      <Box sx={{ display: activeTab === "documents" ? "block" : "none" }}>
        <DocumentsTabPanel
          key={resolvedMapName ?? "none"}
          folderName={activeDocument?.folder}
          documentId={activeDocument?.document}
          mapName={resolvedMapName}
        />
      </Box>

    </>
  );
}
