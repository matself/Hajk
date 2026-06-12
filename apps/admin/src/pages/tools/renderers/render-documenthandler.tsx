import { useEffect, useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
} from "@mui/material";
import { Control, Controller, FieldValues, UseFormSetValue } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Tool, useMapsByToolName } from "../../../api/tools";
import { useDefaultMap } from "../../../hooks/use-default-map";
import { MenuEditor } from "../components/documenthandler/menu-editor/menu-editor";
import type { MenuConfig } from "../components/documenthandler/menu-editor/types";
import { DocumentsTabPanel } from "../components/documenthandler/documents/documents-tab-panel";
import { DocumentEditorDialog } from "../components/documenthandler/documents/document-editor-dialog";
import { SettingsTabPanel } from "../components/documenthandler/settings/settings-tab-panel";

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
  const [openDocument, setOpenDocument] = useState<{
    folder: string;
    document: string;
  } | null>(null);
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

  const tabs: { key: ActiveTab; label: string }[] = [
    {
      key: "settings",
      label: t("common.settings"),
    },
    {
      key: "menuSettings",
      label: t("tools.documenthandler.menuEditor.tabLabel"),
    },
    {
      key: "documents",
      label: t("tools.documenthandler.documents.tabLabel"),
    },
  ];

  const handleMapChange = (mapName: string) => {
    setSelectedMapName(mapName);
    setOpenDocument(null);
  };

  function handleOpenDocument(folder: string, document: string) {
    setOpenDocument({ folder, document });
  }

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
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value as ActiveTab)}
          sx={{ flex: 1 }}
        >
          {tabs.map((tab) => (
            <Tab key={tab.key} value={tab.key} label={tab.label} />
          ))}
        </Tabs>

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
              onOpenDocument={handleOpenDocument}
            />
          )}
        />
      </Box>

      {/* Documents tab */}
      <Box sx={{ display: activeTab === "documents" ? "block" : "none" }}>
        <DocumentsTabPanel
          key={resolvedMapName ?? "none"}
          mapName={resolvedMapName}
          openDocument={openDocument}
          onOpenDocument={handleOpenDocument}
          onCloseDocument={() => setOpenDocument(null)}
        />
      </Box>

      {resolvedMapName && openDocument && (
        <DocumentEditorDialog
          open
          mapName={resolvedMapName}
          folderName={openDocument.folder}
          docName={openDocument.document}
          onClose={() => setOpenDocument(null)}
        />
      )}
    </>
  );
}
