import {
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  Typography,
  Autocomplete,
  IconButton,
  Tooltip,
  Alert,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Icon,
} from "@mui/material";
import {
  Description as DescriptionIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import FormColorPicker from "@/components/form-components/form-color-picker";
import type { MenuConfigItem, MenuTreeNode } from "./types";
import { isNodeValid, updateNodeById } from "./utils";
import {
  STUB_AVAILABLE_DOCUMENTS,
  STUB_FOLDERS,
  STUB_USE_DOCUMENT_FOLDERS,
} from "./constants";

interface MenuItemPropertiesProps {
  node: MenuTreeNode | null;
  tree: MenuTreeNode[];
  onNodeChange: (next: MenuTreeNode[]) => void;
  onOpenDocument: (docId: string) => void;
}

const FONT_SIZE_OPTIONS = ["small", "medium", "large"];

export function MenuItemProperties({
  node,
  tree,
  onNodeChange,
  onOpenDocument,
}: MenuItemPropertiesProps) {
  const { t } = useTranslation();

  if (!node) {
    return (
      <Box
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "text.secondary",
        }}
      >
        <Typography variant="body2">
          {t("tools.documenthandler.menuEditor.noSelection")}
        </Typography>
      </Box>
    );
  }

  const selectedNode = node;
  const valid = isNodeValid(selectedNode);
  const d = selectedNode.data;
  const hasChildren = selectedNode.children.length > 0;

  type MenuNodeMeta = Pick<
    MenuTreeNode,
    | "userTouchedFolder"
    | "userTouchedExpandedSubMenu"
    | "hadFolder"
    | "hadExpandedSubMenu"
  >;

  function patch(
    dataChanges: Partial<MenuConfigItem>,
    metaChanges?: Partial<MenuNodeMeta>
  ) {
    const next = updateNodeById(tree, selectedNode.id, (n) => ({
      ...n,
      ...metaChanges,
      data: { ...n.data, ...dataChanges },
    }));
    onNodeChange(next);
  }

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      {!valid && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {t("tools.documenthandler.menuEditor.invalidNodeWarning")}
        </Alert>
      )}

      {/* Title */}
      <TextField
        label={t("tools.documenthandler.menuEditor.fields.title")}
        fullWidth
        size="small"
        value={d.title}
        onChange={(e) => patch({ title: e.target.value })}
      />

      <Divider />

      {/* Icon */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <TextField
          label={t("tools.documenthandler.menuEditor.fields.icon")}
          fullWidth
          size="small"
          value={d.icon.materialUiIconName}
          onChange={(e) =>
            patch({ icon: { ...d.icon, materialUiIconName: e.target.value } })
          }
          InputProps={
            d.icon.materialUiIconName
              ? {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon sx={{ fontSize: 18 }}>
                        {d.icon.materialUiIconName}
                      </Icon>
                    </InputAdornment>
                  ),
                }
              : undefined
          }
        />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>
            {t("tools.documenthandler.menuEditor.fields.fontSize")}
          </InputLabel>
          <Select
            label={t("tools.documenthandler.menuEditor.fields.fontSize")}
            value={d.icon.fontSize}
            onChange={(e) =>
              patch({ icon: { ...d.icon, fontSize: e.target.value } })
            }
          >
            {FONT_SIZE_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Color */}
      <FormColorPicker
        label={t("tools.documenthandler.menuEditor.fields.color")}
        value={d.color}
        onChange={(hex) => patch({ color: hex })}
      />

      <Divider />

      {/* Document */}
      <Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <Autocomplete
            freeSolo
            options={STUB_AVAILABLE_DOCUMENTS}
            value={d.document}
            onInputChange={(_, value) => patch({ document: value })}
            size="small"
            sx={{ flex: 1 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("tools.documenthandler.menuEditor.fields.document")}
              />
            )}
          />
          <Tooltip title={t("tools.documenthandler.menuEditor.openDocument")}>
            <span>
              <IconButton
                size="small"
                disabled={!d.document.trim()}
                onClick={() => onOpenDocument(d.document.trim())}
                sx={{ mt: 0.5, flexShrink: 0 }}
              >
                <DescriptionIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Folder selector — only shown when folder feature is enabled */}
        {STUB_USE_DOCUMENT_FOLDERS && (
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>
              {t("tools.documenthandler.menuEditor.fields.folder")}
            </InputLabel>
            <Select
              label={t("tools.documenthandler.menuEditor.fields.folder")}
              value={d.folder ?? ""}
              onChange={(e) => {
                patch(
                  { folder: e.target.value },
                  { userTouchedFolder: true, hadFolder: true }
                );
              }}
            >
              <MenuItem value="">
                <em>
                  {t("tools.documenthandler.menuEditor.fields.noFolder")}
                </em>
              </MenuItem>
              {STUB_FOLDERS.map((f) => (
                <MenuItem key={f} value={f}>
                  {f}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Map link */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <TextField
          label={t("tools.documenthandler.menuEditor.fields.maplink")}
          fullWidth
          size="small"
          value={d.maplink}
          onChange={(e) => patch({ maplink: e.target.value })}
          sx={{ flex: 1 }}
        />
        <Tooltip title={t("tools.documenthandler.menuEditor.openMapLink")}>
          <span>
            <IconButton
              size="small"
              disabled={!d.maplink.trim()}
              onClick={() =>
                window.open(d.maplink.trim(), "_blank", "noopener,noreferrer")
              }
              sx={{ mt: 0.5, flexShrink: 0 }}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Link */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <TextField
          label={t("tools.documenthandler.menuEditor.fields.link")}
          fullWidth
          size="small"
          value={d.link}
          onChange={(e) => patch({ link: e.target.value })}
          sx={{ flex: 1 }}
        />
        <Tooltip title={t("tools.documenthandler.menuEditor.openLink")}>
          <span>
            <IconButton
              size="small"
              disabled={!d.link.trim()}
              onClick={() =>
                window.open(d.link.trim(), "_blank", "noopener,noreferrer")
              }
              sx={{ mt: 0.5, flexShrink: 0 }}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Expanded sub-menu — only when node has children */}
      {hasChildren && (
        <>
          <Divider />
          <FormControlLabel
            control={
              <Checkbox
                checked={d.expandedSubMenu ?? false}
                onChange={(_, checked) => {
                  patch(
                    { expandedSubMenu: checked },
                    { userTouchedExpandedSubMenu: true }
                  );
                }}
              />
            }
            label={t(
              "tools.documenthandler.menuEditor.fields.expandedSubMenu"
            )}
          />
        </>
      )}
    </Box>
  );
}
