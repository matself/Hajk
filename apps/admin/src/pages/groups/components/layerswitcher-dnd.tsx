import React, { useState, useMemo, useEffect } from "react";
import {
  SimpleTreeItemWrapper,
  SortableTree,
  TreeItemComponentProps,
  TreeItems,
  TreeItem,
} from "dnd-kit-sortable-tree";
import {
  Tabs,
  Tab,
  Typography,
  TextField,
  List,
  ListItem,
  Grid2 as Grid,
  Paper,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  Divider,
} from "@mui/material";
import {
  Close as CloseIcon,
  DragIndicator,
  Add as AddIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from "@mui/icons-material";
import { useLayers } from "../../../api/layers";
import type { Layer, LayerKind } from "../../../api/layers";
import { Group, useGroups, getLayersByGroupId } from "../../../api/groups";
import type { LayerSwitcherTreeNode } from "../../../api/groups/types";
import {
  buildInitialTreeItems,
  buildNestedGroupTreeItem,
  collectLayerIdsFromTree,
  serializeLayerSwitcherTree,
  unwrapEditingGroupContainer,
  type LayerSwitcherTreeItem,
} from "../utils/layer-switcher-tree";
import useAppStateStore from "../../../store/use-app-state-store";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useTranslation } from "react-i18next";

interface TreeItemData {
  id: string;
  name: string;
  type: "group" | "layer";
}

export interface LayerSwitcherCompositionLayer {
  layerId: string;
  usage: "FOREGROUND" | "BACKGROUND";
  zIndex: number;
  visibleAtStart?: boolean;
  options?: Record<string, unknown>;
}

export interface LayerSwitcherComposition {
  layers: LayerSwitcherCompositionLayer[];
  layerSwitcherTree: LayerSwitcherTreeNode[];
}

export type GroupPlacementLayer = Layer & {
  drawOrder?: number;
  visibleAtStart?: boolean;
  placementOptions?: Record<string, unknown>;
};

interface LayerSwitcherDnDProps {
  initialLayers?: GroupPlacementLayer[];
  initialTree?: LayerSwitcherTreeNode[];
  /** The group being edited; layers are shown inside this node in the tree. */
  editingGroup?: { id: string; name: string };
  layerKind?: LayerKind;
  onCompositionChange?: (composition: LayerSwitcherComposition) => void;
  /** When true, omit outer panel chrome (for use inside settings tabs). */
  embedded?: boolean;
}

const EMPTY_LAYERS: Layer[] = [];
const EMPTY_GROUPS: Group[] = [];

const DraggableSourceItem: React.FC<{
  item: { id: string; name: string };
  type: "group" | "layer";
}> = ({ item, type }) => {
  const themeMode = useAppStateStore((state) => state.themeMode);
  const isDarkMode = themeMode === "dark";

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `source-${type}-${item.id}`,
    data: {
      type,
      item,
    },
  });

  return (
    <ListItem
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        backgroundColor: isDarkMode ? "#1a1a1a" : "#fff",
        cursor: "grab",
        border: "1px solid #ddd",
        borderRadius: 2,
        mb: 1,
        px: 2,
        py: 1.5,
        opacity: isDragging ? 0.5 : 1,
        transition: "opacity 0.2s ease",
        position: "relative",
        "&:hover": {
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
        },
        "&:active": {
          cursor: "grabbing",
        },
      }}
    >
      <DragIndicator sx={{ mr: 1, color: "text.secondary" }} />
      <Typography variant="body2">{item.name}</Typography>
    </ListItem>
  );
};

const TreeItemComponent = React.forwardRef<
  HTMLDivElement,
  TreeItemComponentProps<TreeItemData> & {
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onAdd?: () => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    rootNumber?: number;
  }
>((props, ref) => {
  const {
    item,
    isOver,
    isOverParent,
    onMoveUp,
    onMoveDown,
    onAdd,
    canMoveUp,
    canMoveDown,
    depth,
    rootNumber,
  } = props;
  const themeMode = useAppStateStore((state) => state.themeMode);
  const isDarkMode = themeMode === "dark";
  const isGroup = item.type === "group";
  const isTopLevelGroup = isGroup && depth === 0 && rootNumber != null;

  const { t } = useTranslation();
  const handleRemove = React.useCallback(() => {
    if (props.onRemove) {
      props.onRemove();
    }
  }, [props]);

  const isTargetGroup = isGroup && isOverParent;
  const isReorderTarget = isOver && !isOverParent;

  return (
    <SimpleTreeItemWrapper {...props} ref={ref}>
      {isTopLevelGroup && (
        <Box
          sx={{
            position: "absolute",
            left: 3,
            top: 2,
            width: 22,
            height: 22,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            backgroundColor: isDarkMode
              ? "rgba(66,165,245,0.25)"
              : "rgba(25,118,210,0.12)",
            border: `1px solid ${
              isDarkMode ? "rgba(66,165,245,0.7)" : "rgba(25,118,210,0.7)"
            }`,
            color: isDarkMode ? "#90caf9" : "#1976d2",
            pointerEvents: "none",
            zIndex: 20,
          }}
        >
          {rootNumber}
        </Box>
      )}

      {isReorderTarget && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            backgroundColor: isDarkMode ? "#42a5f5" : "#1976d2",
            zIndex: 10,
            pointerEvents: "none",
            boxShadow: `0 0 4px ${isDarkMode ? "#42a5f5" : "#1976d2"}`,
          }}
        />
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 1.5,
          minWidth: 0,
          maxWidth: "100%",
          overflow: "hidden",
          backgroundColor: isTargetGroup
            ? isDarkMode
              ? "rgba(66, 165, 245, 0.2)"
              : "rgba(25, 118, 210, 0.12)"
            : isReorderTarget
            ? isDarkMode
              ? "rgba(66, 165, 245, 0.1)"
              : "rgba(25, 118, 210, 0.06)"
            : isDarkMode
            ? "#1a1a1a"
            : "#fff",
          border:
            isTargetGroup || isReorderTarget
              ? `2px solid ${isDarkMode ? "#42a5f5" : "#1976d2"}`
              : "1px solid #ddd",
          borderRadius: 1,
          mb: 0.5,
          ml: 2,
          minHeight: 48,
          position: "relative",
          transition: "all 0.2s ease",
          boxShadow: isTargetGroup
            ? `0 0 8px ${
                isDarkMode
                  ? "rgba(66, 165, 245, 0.4)"
                  : "rgba(25, 118, 210, 0.3)"
              }`
            : "none",
          "& > *": {
            position: "relative",
            zIndex: 2,
          },
        }}
      >
        <Box
          {...(props.handleProps as Record<string, unknown>)}
          sx={{
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            pointerEvents: "auto",
            "&:active": {
              cursor: "grabbing",
            },
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <Typography
            variant="body2"
            fontWeight={isGroup ? 600 : 400}
            noWrap
            sx={{
              color: isGroup ? "primary.main" : "text.primary",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.name ?? ""}
          </Typography>

          {isGroup && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t("common.group")}
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            alignItems: "center",
            flexShrink: 0,
            position: "relative",
            zIndex: 10,
            pointerEvents: "auto",
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {onMoveUp && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              disabled={canMoveUp === false}
              sx={{
                "&:hover": {
                  backgroundColor: isDarkMode ? "#2a2a2a" : "#f5f5f5",
                },
                opacity: canMoveUp === false ? 0.3 : 1,
                position: "relative",
                zIndex: 11,
              }}
              title={t("common.moveUp")}
            >
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
          )}

          {onMoveDown && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              disabled={canMoveDown === false}
              sx={{
                "&:hover": {
                  backgroundColor: isDarkMode ? "#2a2a2a" : "#f5f5f5",
                },
                opacity: canMoveDown === false ? 0.3 : 1,
                position: "relative",
                zIndex: 11,
              }}
              title={t("common.moveDown")}
            >
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          )}

          {isGroup && onAdd && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              sx={{
                "&:hover": {
                  backgroundColor: isDarkMode ? "#2a2a2a" : "#f5f5f5",
                },
                position: "relative",
                zIndex: 11,
              }}
              title={t("common.addToGroup")}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          )}

          {props.onRemove && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              sx={{
                "&:hover": {
                  backgroundColor: isDarkMode ? "#2a2a2a" : "#f5f5f5",
                },
                position: "relative",
                zIndex: 11,
              }}
              title={t("common.delete")}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {isReorderTarget && (
        <Box
          sx={{
            position: "absolute",
            bottom: -2,
            left: 0,
            right: 0,
            height: "2px",
            backgroundColor: isDarkMode ? "#42a5f5" : "#1976d2",
            zIndex: 10,
            pointerEvents: "none",
            boxShadow: `0 0 4px ${isDarkMode ? "#42a5f5" : "#1976d2"}`,
          }}
        />
      )}
    </SimpleTreeItemWrapper>
  );
});

TreeItemComponent.displayName = "TreeItemComponent";

const parseTreeItemId = (
  itemId: string
): { type: "layer" | "group"; id: string } | null => {
  if (itemId.startsWith("layer-")) {
    return { type: "layer", id: itemId.slice("layer-".length) };
  }
  if (itemId.startsWith("group-")) {
    return { type: "group", id: itemId.slice("group-".length) };
  }
  return null;
};

const enforceLayerRules = (
  treeItems: TreeItems<TreeItemData>
): TreeItems<TreeItemData> => {
  return treeItems.map((item) => {
    const updatedItem: TreeItem<TreeItemData> = {
      ...item,
      // Layers cannot have children
      canHaveChildren: item.type === "group",
      children:
        item.type === "layer"
          ? undefined
          : item.children
          ? enforceLayerRules(item.children)
          : item.children,
    };
    return updatedItem;
  });
};

export type GroupDropPlacement = "above" | "below" | "insert";

const GroupDropDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: (action: GroupDropPlacement) => void;
  draggedGroupName: string;
  targetGroupName: string;
  isDarkMode: boolean;
}> = ({
  open,
  onClose,
  onConfirm,
  draggedGroupName,
  targetGroupName,
  isDarkMode,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: isDarkMode ? "#1a1a1a" : "#fff",
        },
      }}
    >
      <DialogTitle>{t("common.groupDropAction")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {t("common.groupDropQuestion", {
            dragged: draggedGroupName,
            target: targetGroupName,
          })}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => onConfirm("above")}
            sx={{ justifyContent: "flex-start", textAlign: "left", py: 1.5 }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <Typography variant="body1" fontWeight={600}>
                {t("common.placeAboveGroup")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("common.placeAboveGroupDescription")}
              </Typography>
            </Box>
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => onConfirm("below")}
            sx={{ justifyContent: "flex-start", textAlign: "left", py: 1.5 }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <Typography variant="body1" fontWeight={600}>
                {t("common.placeBelowGroup")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("common.placeBelowGroupDescription")}
              </Typography>
            </Box>
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => onConfirm("insert")}
            sx={{ justifyContent: "flex-start", textAlign: "left", py: 1.5 }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <Typography variant="body1" fontWeight={600}>
                {t("common.insertAsChild")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("common.insertAsChildDescription")}
              </Typography>
            </Box>
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
      </DialogActions>
    </Dialog>
  );
};

const AddItemsDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedLayerIds: string[], selectedGroupIds: string[]) => void;
  layers: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  addedItemIds: Set<string>;
  excludeGroupId?: string;
  isDarkMode: boolean;
}> = ({
  open,
  onClose,
  onConfirm,
  layers,
  groups,
  addedItemIds,
  excludeGroupId,
  isDarkMode,
}) => {
  const [selectedLayers, setSelectedLayers] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const { t } = useTranslation();
  const availableLayers = useMemo(
    () =>
      layers
        .filter(
          (layer) =>
            !addedItemIds.has(`layer-${layer.id}`) &&
            layer.name.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [layers, addedItemIds, search]
  );

  const availableGroups = useMemo(
    () =>
      groups
        .filter(
          (group) =>
            group.id !== excludeGroupId &&
            !addedItemIds.has(`group-${group.id}`) &&
            group.name.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [groups, addedItemIds, search, excludeGroupId]
  );

  const handleLayerToggle = (layerId: string) => {
    setSelectedLayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(layerId)) {
        newSet.delete(layerId);
      } else {
        newSet.add(layerId);
      }
      return newSet;
    });
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedLayers), Array.from(selectedGroups));
    setSelectedLayers(new Set());
    setSelectedGroups(new Set());
    setSearch("");
    onClose();
  };

  const handleClose = () => {
    setSelectedLayers(new Set());
    setSelectedGroups(new Set());
    setSearch("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: isDarkMode ? "#1a1a1a" : "#fff",
        },
      }}
    >
      <DialogTitle>{t("common.addItemsToGroup")}</DialogTitle>
      <DialogContent>
        <TextField
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          sx={{ mb: 2, mt: 1 }}
          size="small"
        />
        <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
          {availableLayers.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                {t("common.layers")}
              </Typography>
              <List dense>
                {availableLayers.map((layer) => (
                  <ListItem key={layer.id} disablePadding>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedLayers.has(layer.id)}
                          onChange={() => handleLayerToggle(layer.id)}
                        />
                      }
                      label={layer.name}
                      sx={{ width: "100%" }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
          {availableGroups.length > 0 && (
            <>
              {availableLayers.length > 0 && <Divider sx={{ my: 2 }} />}
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                {t("common.groups")}
              </Typography>
              <List dense>
                {availableGroups.map((group) => (
                  <ListItem key={group.id} disablePadding>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedGroups.has(group.id)}
                          onChange={() => handleGroupToggle(group.id)}
                        />
                      }
                      label={group.name}
                      sx={{ width: "100%" }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
          {availableLayers.length === 0 && availableGroups.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              {t("common.noAvailableItemsToAdd")}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t("common.cancel")}</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={selectedLayers.size === 0 && selectedGroups.size === 0}
        >
          {t("common.add")} ({selectedLayers.size + selectedGroups.size})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DraggableRitordningItem: React.FC<{
  layerId: string;
  layerName: string;
  index: number;
  onRemove: () => void;
  dragOver?: { layerId: string; position: "above" | "below" } | null;
}> = ({ layerId, layerName, index, onRemove, dragOver }) => {
  const themeMode = useAppStateStore((state) => state.themeMode);
  const isDarkMode = themeMode === "dark";
  const { t } = useTranslation();

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: `ritordning-${layerId}`,
    data: {
      type: "ritordning-item",
      layerId,
      index,
    },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `ritordning-${layerId}`,
    data: {
      accepts: ["source-layer", "ritordning-item"],
    },
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };

  const showArrowAbove =
    dragOver?.layerId === layerId && dragOver.position === "above";
  const showArrowBelow =
    dragOver?.layerId === layerId && dragOver.position === "below";

  return (
    <ListItem
      id={`ritordning-${layerId}`}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        backgroundColor: isOver
          ? isDarkMode
            ? "rgba(66, 165, 245, 0.2)"
            : "rgba(25, 118, 210, 0.12)"
          : isDarkMode
          ? "#1a1a1a"
          : "#fff",
        cursor: "grab",
        border: isOver
          ? `2px solid ${isDarkMode ? "#42a5f5" : "#1976d2"}`
          : "1px solid #ddd",
        borderRadius: 2,
        mb: 1,
        px: 2,
        py: 1.5,
        opacity: isDragging ? 0.5 : 1,
        transition: "all 0.2s ease",
        position: "relative",
        "&:hover": {
          boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
        },
        "&:active": {
          cursor: "grabbing",
        },
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      {showArrowAbove || showArrowBelow ? (
        showArrowAbove ? (
          <ArrowUpwardIcon
            sx={{
              color: isDarkMode ? "#42a5f5" : "#1976d2",
              fontSize: "20px",
            }}
          />
        ) : (
          <ArrowDownwardIcon
            sx={{
              color: isDarkMode ? "#42a5f5" : "#1976d2",
              fontSize: "20px",
            }}
          />
        )
      ) : (
        <DragIndicator sx={{ color: "text.secondary" }} />
      )}
      <Typography variant="body2" sx={{ flex: 1 }}>
        {layerName}
      </Typography>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        sx={{
          "&:hover": {
            backgroundColor: isDarkMode ? "#2a2a2a" : "#f5f5f5",
          },
        }}
        title={t("common.delete")}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </ListItem>
  );
};

const TreeDropZone: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const themeMode = useAppStateStore((state) => state.themeMode);
  const isDarkMode = themeMode === "dark";
  const { setNodeRef, isOver } = useDroppable({
    id: "tree-drop-zone",
    data: {
      accepts: ["source-layer", "source-group"],
    },
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: "100%",
        maxWidth: "100%",
        p: 2,
        boxSizing: "border-box",
        backgroundColor: isOver
          ? isDarkMode
            ? "#1e293b"
            : "#e3f2fd"
          : isDarkMode
          ? "#121212"
          : "#fafafa",
        border: isOver ? "2px dashed" : "1px solid",
        borderColor: isOver ? "primary.main" : "#ddd",
        borderRadius: 2,
        transition: "all 0.2s ease",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {children}
    </Box>
  );
};

const RitordningDropZone: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const themeMode = useAppStateStore((state) => state.themeMode);
  const isDarkMode = themeMode === "dark";
  const { setNodeRef, isOver } = useDroppable({
    id: "ritordning-drop-zone",
    data: {
      accepts: ["source-layer"],
    },
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: "100%",
        maxWidth: "100%",
        p: 2,
        boxSizing: "border-box",
        backgroundColor: isOver
          ? isDarkMode
            ? "#1e293b"
            : "#e3f2fd"
          : isDarkMode
          ? "#121212"
          : "#fafafa",
        border: isOver ? "2px dashed" : "1px solid",
        borderColor: isOver ? "primary.main" : "#ddd",
        borderRadius: 2,
        transition: "all 0.2s ease",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {children}
    </Box>
  );
};

export default function LayerSwitcherDnD({
  initialLayers = [],
  initialTree,
  editingGroup,
  layerKind,
  onCompositionChange,
  embedded = false,
}: LayerSwitcherDnDProps) {
  const themeMode = useAppStateStore((state) => state.themeMode);
  const isDarkMode = themeMode === "dark";
  const { t } = useTranslation();
  const [leftTab, setLeftTab] = useState(0);
  const [rightTab, setRightTab] = useState(0);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<TreeItems<TreeItemData>>([]);
  const [ritordningItems, setRitordningItems] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showRightScrollbar, setShowRightScrollbar] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [groupDropDialogOpen, setGroupDropDialogOpen] = useState(false);
  const [pendingGroupDrop, setPendingGroupDrop] = useState<{
    draggedItemId: string;
    draggedItemName: string;
    targetGroupId: string;
    targetGroupName: string;
    isFromSource: boolean;
  } | null>(null);
  const [ritordningDragOver, setRitordningDragOver] = useState<{
    layerId: string;
    position: "above" | "below";
  } | null>(null);
  const itemsBeforeChangeRef = React.useRef<TreeItems<TreeItemData>>([]);
  const leftPanelScrollRef = React.useRef<HTMLDivElement>(null);
  const rightPanelScrollRef = React.useRef<HTMLDivElement>(null);
  const isProcessingGroupDropRef = React.useRef<boolean>(false);
  const groupCompositionCacheRef = React.useRef(
    new Map<
      string,
      {
        layers: GroupPlacementLayer[];
        layerSwitcherTree?: LayerSwitcherTreeNode[];
      }
    >()
  );

  const { data: layersData } = useLayers();
  const { data: groupsData } = useGroups();
  const layers = layersData ?? EMPTY_LAYERS;
  const groups = groupsData ?? EMPTY_GROUPS;
  const initialLayerIdsKey = useMemo(
    () =>
      [
        initialLayers
          .map((layer) => `${layer.id}:${layer.name}:${layer.drawOrder ?? 0}`)
          .join("|"),
        JSON.stringify(initialTree ?? []),
        editingGroup?.id ?? "",
        groups.map((group) => group.id).join("|"),
      ].join("::"),
    [initialLayers, initialTree, editingGroup, groups]
  );

  useEffect(() => {
    const initialItems = buildInitialTreeItems(
      initialTree,
      initialLayers,
      groups,
      editingGroup
    ) as TreeItems<TreeItemData>;
    setItems(initialItems);
    setRitordningItems(
      [...initialLayers]
        .sort((a, b) => (a.drawOrder ?? 0) - (b.drawOrder ?? 0))
        .map((layer) => layer.id)
    );
    itemsBeforeChangeRef.current = initialItems;
  }, [initialLayerIdsKey, groups]);

  useEffect(() => {
    if (!onCompositionChange) return;

    const treeItems = items as LayerSwitcherTreeItem[];
    const normalizedTree = unwrapEditingGroupContainer(
      treeItems,
      editingGroup?.id
    );
    const orderedLayerIds = collectLayerIdsFromTree(normalizedTree);
    const layerSwitcherTree = serializeLayerSwitcherTree(normalizedTree);

    const drawOrder =
      ritordningItems.length > 0 ? ritordningItems : orderedLayerIds;
    const zIndexByLayerId = new Map(
      drawOrder.map((layerId, index) => [layerId, index])
    );
    const placementByLayerId = new Map(
      initialLayers.map((layer) => [layer.id, layer])
    );

    onCompositionChange({
      layerSwitcherTree,
      layers: orderedLayerIds.map((layerId, index) => {
        const placement = placementByLayerId.get(layerId);
        return {
          layerId,
          usage: "FOREGROUND",
          zIndex: zIndexByLayerId.get(layerId) ?? index,
          visibleAtStart: placement?.visibleAtStart,
          options: placement?.placementOptions,
        };
      }),
    });
  }, [items, ritordningItems, onCompositionChange, initialLayers, editingGroup?.id]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Separate added item IDs for Lagerordning and Ritordning
  const addedItemIdsLagerordning = useMemo(() => {
    const getAllIds = (treeItems: TreeItems<TreeItemData>): string[] => {
      const ids: string[] = [];
      treeItems.forEach((item) => {
        ids.push(item.id.toString());
        if (item.children) {
          ids.push(...getAllIds(item.children));
        }
      });
      return ids;
    };
    return new Set(getAllIds(items));
  }, [items]);

  const addedItemIdsRitordning = useMemo(() => {
    return new Set(ritordningItems.map((id) => `layer-${id}`));
  }, [ritordningItems]);

  // Filtered layers for Lagerordning (excludes items already in Lagerordning tree)
  const filteredLayersLagerordning = useMemo(
    () =>
      layers
        .filter(
          (layer) =>
            (!layerKind || layer.layerKind === layerKind) &&
            layer.name.toLowerCase().includes(search.toLowerCase()) &&
            !addedItemIdsLagerordning.has(`layer-${layer.id}`)
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [layers, search, addedItemIdsLagerordning, layerKind]
  );

  // Filtered layers for Ritordning (excludes items already in Ritordning list)
  const filteredLayersRitordning = useMemo(
    () =>
      layers
        .filter(
          (layer) =>
            (!layerKind || layer.layerKind === layerKind) &&
            layer.name.toLowerCase().includes(search.toLowerCase()) &&
            !addedItemIdsRitordning.has(`layer-${layer.id}`)
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [layers, search, addedItemIdsRitordning, layerKind]
  );

  const filteredGroups = useMemo(
    () =>
      groups
        .filter(
          (group) =>
            group.id !== editingGroup?.id &&
            group.name.toLowerCase().includes(search.toLowerCase()) &&
            !addedItemIdsLagerordning.has(`group-${group.id}`)
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [groups, search, addedItemIdsLagerordning, editingGroup?.id]
  );

  const rootNumberByAnyItemId = useMemo(() => {
    const map: Record<string, number> = {};
    let counter = 0;

    const walk = (node: TreeItem<TreeItemData>, num: number) => {
      map[node.id.toString()] = num;
      node.children?.forEach((c) => walk(c, num));
    };

    items.forEach((it) => {
      if (it.type === "group") {
        counter += 1;
        walk(it, counter);
      }
    });

    return map;
  }, [items]);

  const handleDragStart = (event: DragStartEvent) => {
    const activeIdStr = event.active.id.toString();
    setActiveId(activeIdStr);
    setRitordningDragOver(null);

    // Store current items state before any changes
    itemsBeforeChangeRef.current = items;
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!event.over) {
      setRitordningDragOver(null);
      return;
    }

    const getPointerY = (e: Event | null | undefined): number | null => {
      if (!e) return null;
      if (e instanceof MouseEvent) return e.clientY;
      if (e instanceof TouchEvent && e.touches.length > 0) {
        return e.touches[0].clientY;
      }
      return null;
    };

    const pointerY = getPointerY(event.activatorEvent);
    if (pointerY === null) return;

    // Check if dragging over a Ritordning item (only when on Ritordning tab)
    if (
      rightTab === 1 &&
      typeof event.over.id === "string" &&
      event.over.id.startsWith("ritordning-") &&
      (activeId?.startsWith("ritordning-") ||
        activeId?.startsWith("source-layer-"))
    ) {
      const targetLayerId = event.over.id.replace("ritordning-", "");
      const targetIndex = ritordningItems.indexOf(targetLayerId);

      if (targetIndex !== -1) {
        let position: "above" | "below" = "below";

        if (activeId?.startsWith("ritordning-")) {
          // Dragging an existing ritordning item - compare indices
          const draggedLayerId = activeId.replace("ritordning-", "");
          const draggedIndex = ritordningItems.indexOf(draggedLayerId);

          if (draggedIndex !== -1) {
            // If dragged item is at a higher index (lower in list), it's moving up
            // If dragged item is at a lower index (higher in list), it's moving down
            position = draggedIndex > targetIndex ? "above" : "below";
          }
        } else {
          // Dragging from source - use mouse position to determine
          const overElement = document.getElementById(
            `ritordning-${targetLayerId}`
          );
          if (overElement) {
            const rect = overElement.getBoundingClientRect();
            const centerY = rect.top + rect.height / 2;
            position = pointerY < centerY ? "above" : "below";
          }
        }

        setRitordningDragOver({ layerId: targetLayerId, position });
      } else {
        setRitordningDragOver(null);
      }
    } else {
      // Clear drag over state when not dragging over a Ritordning item
      setRitordningDragOver(null);
    }

    if (leftPanelScrollRef.current && activeId?.startsWith("source-")) {
      const rect = leftPanelScrollRef.current.getBoundingClientRect();
      const scrollThreshold = 50;
      const scrollSpeed = 10;

      if (pointerY < rect.top + scrollThreshold) {
        leftPanelScrollRef.current.scrollBy({
          top: -scrollSpeed,
          behavior: "smooth",
        });
      } else if (pointerY > rect.bottom - scrollThreshold) {
        leftPanelScrollRef.current.scrollBy({
          top: scrollSpeed,
          behavior: "smooth",
        });
      }
    }

    if (rightPanelScrollRef.current) {
      const rect = rightPanelScrollRef.current.getBoundingClientRect();
      const scrollThreshold = 50;
      const scrollSpeed = 10;

      if (pointerY < rect.top + scrollThreshold) {
        rightPanelScrollRef.current.scrollBy({
          top: -scrollSpeed,
          behavior: "smooth",
        });
      } else if (pointerY > rect.bottom - scrollThreshold) {
        rightPanelScrollRef.current.scrollBy({
          top: scrollSpeed,
          behavior: "smooth",
        });
      }
    }
  };

  useEffect(() => {
    if (!activeId) return;

    const handleWheel = (e: WheelEvent) => {
      if (!activeId) return;

      if (leftPanelScrollRef.current) {
        const rect = leftPanelScrollRef.current.getBoundingClientRect();
        const isOverLeft =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;

        if (isOverLeft) {
          const canScrollUp = leftPanelScrollRef.current.scrollTop > 0;
          const canScrollDown =
            leftPanelScrollRef.current.scrollTop <
            leftPanelScrollRef.current.scrollHeight -
              leftPanelScrollRef.current.clientHeight;

          if (
            (e.deltaY > 0 && canScrollDown) ||
            (e.deltaY < 0 && canScrollUp)
          ) {
            e.preventDefault();
            e.stopPropagation();
            leftPanelScrollRef.current.scrollBy({
              top: e.deltaY,
              behavior: "auto",
            });
            return;
          }
        }
      }

      if (rightPanelScrollRef.current) {
        const rect = rightPanelScrollRef.current.getBoundingClientRect();
        const isOverRight =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;

        if (isOverRight) {
          const canScrollUp = rightPanelScrollRef.current.scrollTop > 0;
          const canScrollDown =
            rightPanelScrollRef.current.scrollTop <
            rightPanelScrollRef.current.scrollHeight -
              rightPanelScrollRef.current.clientHeight;

          if (
            (e.deltaY > 0 && canScrollDown) ||
            (e.deltaY < 0 && canScrollUp)
          ) {
            e.preventDefault();
            e.stopPropagation();
            rightPanelScrollRef.current.scrollBy({
              top: e.deltaY,
              behavior: "auto",
            });
            return;
          }
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [activeId]);

  useEffect(() => {
    const checkScrollbar = () => {
      if (rightPanelScrollRef.current) {
        const needsScrollbar =
          rightPanelScrollRef.current.scrollHeight >
          rightPanelScrollRef.current.clientHeight;
        setShowRightScrollbar(needsScrollbar);
      }
    };

    checkScrollbar();
    const timer = setTimeout(checkScrollbar, 100);
    return () => clearTimeout(timer);
  }, [items, ritordningItems, rightTab]);

  // Update itemsBeforeChangeRef after a successful group drop insert
  // This prevents the dialog from reappearing when clicking on the container
  useEffect(() => {
    if (isProcessingGroupDropRef.current) {
      // Update the ref to match current items after insert completes
      itemsBeforeChangeRef.current = items;
      // Reset the flag after updating the ref
      isProcessingGroupDropRef.current = false;
    }
  }, [items]);

  const handleMoveUp = (itemId: string) => {
    setItems((prevItems) => {
      const moveItemUp = (
        treeItems: TreeItems<TreeItemData>
      ): TreeItems<TreeItemData> => {
        for (let i = 1; i < treeItems.length; i++) {
          if (treeItems[i].id.toString() === itemId) {
            const newItems = [...treeItems];
            [newItems[i - 1], newItems[i]] = [newItems[i], newItems[i - 1]];
            return newItems;
          }
        }
        return treeItems.map((item) => {
          if (item.children) {
            const updatedChildren = moveItemUp(item.children);
            if (updatedChildren !== item.children) {
              return { ...item, children: updatedChildren };
            }
          }
          return item;
        });
      };
      return enforceLayerRules(moveItemUp(prevItems));
    });
  };

  const handleMoveDown = (itemId: string) => {
    setItems((prevItems) => {
      const moveItemDown = (
        treeItems: TreeItems<TreeItemData>
      ): TreeItems<TreeItemData> => {
        for (let i = 0; i < treeItems.length - 1; i++) {
          if (treeItems[i].id.toString() === itemId) {
            const newItems = [...treeItems];
            [newItems[i], newItems[i + 1]] = [newItems[i + 1], newItems[i]];
            return newItems;
          }
        }
        return treeItems.map((item) => {
          if (item.children) {
            const updatedChildren = moveItemDown(item.children);
            if (updatedChildren !== item.children) {
              return { ...item, children: updatedChildren };
            }
          }
          return item;
        });
      };
      return enforceLayerRules(moveItemDown(prevItems));
    });
  };

  const canMoveUp = (itemId: string): boolean => {
    const findPosition = (
      treeItems: TreeItems<TreeItemData>
    ): number | null => {
      for (let i = 0; i < treeItems.length; i++) {
        if (treeItems[i].id.toString() === itemId) {
          return i;
        }
      }
      for (const item of treeItems) {
        if (item.children) {
          const pos = findPosition(item.children);
          if (pos !== null) return pos;
        }
      }
      return null;
    };
    const position = findPosition(items);
    return position !== null && position > 0;
  };

  const canMoveDown = (itemId: string): boolean => {
    const findPosition = (
      treeItems: TreeItems<TreeItemData>
    ): { index: number; total: number } | null => {
      for (let i = 0; i < treeItems.length; i++) {
        if (treeItems[i].id.toString() === itemId) {
          return { index: i, total: treeItems.length };
        }
      }
      for (const item of treeItems) {
        if (item.children) {
          const pos = findPosition(item.children);
          if (pos !== null) return pos;
        }
      }
      return null;
    };
    const position = findPosition(items);
    return position !== null && position.index < position.total - 1;
  };

  const findItemInTree = (
    treeItems: TreeItems<TreeItemData>,
    itemId: string
  ): TreeItem<TreeItemData> | null => {
    for (const item of treeItems) {
      if (item.id.toString() === itemId) {
        return item;
      }
      if (item.children) {
        const found = findItemInTree(item.children, itemId);
        if (found) return found;
      }
    }
    return null;
  };

  const findItemParent = (
    treeItems: TreeItems<TreeItemData>,
    itemId: string
  ): { parent: TreeItem<TreeItemData> | null; index: number } | null => {
    for (let i = 0; i < treeItems.length; i++) {
      if (treeItems[i].id.toString() === itemId) {
        return { parent: null, index: i };
      }
      const children = treeItems[i].children;
      if (children) {
        const childIndex = children.findIndex(
          (child) => child.id.toString() === itemId
        );
        if (childIndex !== -1) {
          return { parent: treeItems[i], index: childIndex };
        }
        const result = findItemParent(children, itemId);
        if (result) return result;
      }
    }
    return null;
  };

  const detectItemOnGroupDrop = (
    oldItems: TreeItems<TreeItemData>,
    newItems: TreeItems<TreeItemData>,
    draggedItemId: string
  ): { targetGroupId: string; targetGroupName: string } | null => {
    const draggedItem = findItemInTree(oldItems, draggedItemId);
    if (!draggedItem) {
      return null;
    }

    const oldParent = findItemParent(oldItems, draggedItemId);
    const newParent = findItemParent(newItems, draggedItemId);

    if (newParent?.parent?.type === "group") {
      const oldParentId = oldParent?.parent?.id.toString() ?? null;
      const newParentId = newParent.parent.id.toString();

      if (oldParentId !== newParentId) {
        return {
          targetGroupId: newParentId,
          targetGroupName: newParent.parent.name,
        };
      }
    }

    return null;
  };

  const openGroupTargetDropDialog = (drop: {
    draggedItemId: string;
    draggedItemName: string;
    targetGroupId: string;
    targetGroupName: string;
    isFromSource: boolean;
  }) => {
    setPendingGroupDrop(drop);
    setGroupDropDialogOpen(true);
  };

  const fetchGroupComposition = React.useCallback(
    async (groupId: string) => {
      const cached = groupCompositionCacheRef.current.get(groupId);
      if (cached) return cached;

      const response = await getLayersByGroupId(groupId);
      const groupLayers = (response.layers ?? []).filter(
        (layer) => !layerKind || layer.layerKind === layerKind
      );
      const composition = {
        layers: groupLayers,
        layerSwitcherTree: response.layerSwitcherTree,
      };
      groupCompositionCacheRef.current.set(groupId, composition);
      return composition;
    },
    [layerKind]
  );

  const buildGroupTreeItem = React.useCallback(
    async (groupId: string): Promise<TreeItem<TreeItemData> | null> => {
      const sourceGroup = groups.find((group) => group.id === groupId);
      if (!sourceGroup) return null;

      const { layers: groupLayers, layerSwitcherTree } =
        await fetchGroupComposition(groupId);
      const nested = buildNestedGroupTreeItem(
        sourceGroup,
        groupLayers,
        layerSwitcherTree,
        groups
      );
      return nested as TreeItem<TreeItemData>;
    },
    [groups, fetchGroupComposition]
  );

  const buildTreeItemFromSourceId = async (
    sourceItemId: string
  ): Promise<TreeItem<TreeItemData> | null> => {
    const parsed = parseTreeItemId(sourceItemId);
    if (!parsed) return null;

    if (parsed.type === "layer") {
      const sourceLayer = layers.find((layer) => layer.id === parsed.id);
      if (!sourceLayer) return null;
      return {
        id: `layer-${sourceLayer.id}`,
        name: sourceLayer.name,
        type: "layer",
        canHaveChildren: false,
      };
    }

    return buildGroupTreeItem(parsed.id);
  };

  const handleAddToGroup = (groupId: string) => {
    setTargetGroupId(groupId);
    setAddDialogOpen(true);
  };

  const handleConfirmAddItems = (
    selectedLayerIds: string[],
    selectedGroupIds: string[]
  ) => {
    if (!targetGroupId) return;

    void (async () => {
      const newGroupItems = (
        await Promise.all(selectedGroupIds.map((id) => buildGroupTreeItem(id)))
      ).filter((item): item is TreeItem<TreeItemData> => item !== null);

      setItems((prevItems) => {
        const addToGroup = (
          treeItems: TreeItems<TreeItemData>,
          groupId: string
        ): TreeItems<TreeItemData> => {
          return treeItems.map((item) => {
            if (item.id.toString() === groupId && item.type === "group") {
              const newChildren: TreeItem<TreeItemData>[] = [];

              selectedLayerIds.forEach((layerId) => {
                const layer = layers.find((l) => l.id === layerId);
                if (layer) {
                  newChildren.push({
                    id: `layer-${layer.id}`,
                    name: layer.name,
                    type: "layer",
                    canHaveChildren: false,
                  });
                }
              });

              newChildren.push(...newGroupItems);

              return {
                ...item,
                children: [...(item.children ?? []), ...newChildren],
              };
            }
            if (item.children) {
              return {
                ...item,
                children: addToGroup(item.children, groupId),
              };
            }
            return item;
          });
        };
        const updated = addToGroup(prevItems, targetGroupId);
        return enforceLayerRules(updated);
      });

      setTargetGroupId(null);
    })();
  };

  const handleGroupDropAction = (action: GroupDropPlacement) => {
    if (!pendingGroupDrop) return;

    const { draggedItemId, targetGroupId, isFromSource } = pendingGroupDrop;

    // Mark that we're processing a group drop action to prevent dialog from reappearing
    isProcessingGroupDropRef.current = true;

    if (action === "insert") {
      if (isFromSource) {
        void buildTreeItemFromSourceId(draggedItemId).then((newItem) => {
          if (!newItem) return;

          setItems((prevItems) => {
            const addToGroup = (
              treeItems: TreeItems<TreeItemData>,
              groupId: string,
              itemToAdd: TreeItem<TreeItemData>
            ): TreeItems<TreeItemData> => {
              return treeItems.map((item) => {
                if (item.id.toString() === groupId && item.type === "group") {
                  return {
                    ...item,
                    children: [...(item.children ?? []), itemToAdd],
                  };
                }
                if (item.children) {
                  return {
                    ...item,
                    children: addToGroup(item.children, groupId, itemToAdd),
                  };
                }
                return item;
              });
            };
            const updated = enforceLayerRules(
              addToGroup(prevItems, targetGroupId, newItem)
            );
            itemsBeforeChangeRef.current = updated;
            return updated;
          });
        });
      } else {
        // Handle existing group in tree
        setItems((prevItems) => {
          const findAndRemoveItem = (
            treeItems: TreeItems<TreeItemData>,
            itemId: string
          ): {
            item: TreeItem<TreeItemData> | null;
            updatedItems: TreeItems<TreeItemData>;
          } => {
            for (let i = 0; i < treeItems.length; i++) {
              if (treeItems[i].id.toString() === itemId) {
                const item = treeItems[i];
                const updatedItems = treeItems.filter(
                  (_, index) => index !== i
                );
                return { item, updatedItems };
              }
            }

            let foundItem: TreeItem<TreeItemData> | null = null;
            const updatedItems = treeItems.map((item) => {
              if (foundItem) return item;

              if (item.children) {
                const result = findAndRemoveItem(item.children, itemId);
                if (result.item) {
                  foundItem = result.item;
                  return {
                    ...item,
                    children: result.updatedItems,
                  };
                }
              }
              return item;
            });

            return { item: foundItem, updatedItems };
          };

          const addToGroup = (
            treeItems: TreeItems<TreeItemData>,
            groupId: string,
            itemToAdd: TreeItem<TreeItemData>
          ): TreeItems<TreeItemData> => {
            return treeItems.map((item) => {
              if (item.id.toString() === groupId && item.type === "group") {
                return {
                  ...item,
                  children: [...(item.children ?? []), itemToAdd],
                };
              }
              if (item.children) {
                return {
                  ...item,
                  children: addToGroup(item.children, groupId, itemToAdd),
                };
              }
              return item;
            });
          };

          const { item, updatedItems } = findAndRemoveItem(
            prevItems,
            draggedItemId
          );
          if (item) {
            const itemToAdd: TreeItem<TreeItemData> =
              item.type === "group"
                ? {
                    ...item,
                    children: item.children ?? [],
                    canHaveChildren: true,
                  }
                : {
                    ...item,
                    children: undefined,
                    canHaveChildren: false,
                  };
            const updated = enforceLayerRules(
              addToGroup(updatedItems, targetGroupId, itemToAdd)
            );
            itemsBeforeChangeRef.current = updated;
            return updated;
          }
          const updated = enforceLayerRules(prevItems);
          itemsBeforeChangeRef.current = updated;
          return updated;
        });
      }
    } else {
      const findAndRemoveItem = (
        treeItems: TreeItems<TreeItemData>,
        itemId: string
      ): {
        item: TreeItem<TreeItemData> | null;
        updatedItems: TreeItems<TreeItemData>;
      } => {
        for (let i = 0; i < treeItems.length; i++) {
          if (treeItems[i].id.toString() === itemId) {
            const item = treeItems[i];
            const updatedItems = treeItems.filter((_, index) => index !== i);
            return { item, updatedItems };
          }
        }

        let foundItem: TreeItem<TreeItemData> | null = null;
        const updatedItems = treeItems.map((item) => {
          if (foundItem) return item;

          if (item.children) {
            const result = findAndRemoveItem(item.children, itemId);
            if (result.item) {
              foundItem = result.item;
              return {
                ...item,
                children: result.updatedItems,
              };
            }
          }
          return item;
        });

        return { item: foundItem, updatedItems };
      };

      setItems((prevItems) => {
        let draggedItem: TreeItem<TreeItemData> | null = null;
        let updatedItemsAfterRemove = prevItems;

        if (isFromSource) {
          void buildTreeItemFromSourceId(draggedItemId).then((resolvedItem) => {
            if (!resolvedItem) return;

            setItems((currentItems) => {
              const targetPosAfter = findItemParent(currentItems, targetGroupId);
              if (!targetPosAfter) return currentItems;

              const siblings: TreeItems<TreeItemData> =
                targetPosAfter.parent?.children ?? currentItems;

              const insertIndex =
                action === "below"
                  ? targetPosAfter.index + 1
                  : targetPosAfter.index;

              const newSiblings = [...siblings];
              newSiblings.splice(insertIndex, 0, resolvedItem);

              if (targetPosAfter.parent) {
                const parentId = targetPosAfter.parent.id.toString();

                const updateChildren = (
                  treeItems: TreeItems<TreeItemData>
                ): TreeItems<TreeItemData> => {
                  return treeItems.map((item) => {
                    if (item.id.toString() === parentId) {
                      return { ...item, children: newSiblings };
                    }
                    if (item.children) {
                      return {
                        ...item,
                        children: updateChildren(item.children),
                      };
                    }
                    return item;
                  });
                };

                const updated = updateChildren(currentItems);
                const enforced = enforceLayerRules(updated);
                itemsBeforeChangeRef.current = enforced;
                return enforced;
              }

              const enforced = enforceLayerRules(newSiblings);
              itemsBeforeChangeRef.current = enforced;
              return enforced;
            });
          });
          return prevItems;
        } else {
          const result = findAndRemoveItem(prevItems, draggedItemId);
          draggedItem = result.item;
          updatedItemsAfterRemove = result.updatedItems;
        }

        if (!draggedItem) {
          return prevItems;
        }

        const targetPosAfter = findItemParent(
          updatedItemsAfterRemove,
          targetGroupId
        );
        if (!targetPosAfter) {
          return prevItems;
        }

        const siblings: TreeItems<TreeItemData> =
          targetPosAfter.parent?.children ?? updatedItemsAfterRemove;

        const insertIndex =
          action === "below"
            ? targetPosAfter.index + 1
            : targetPosAfter.index;

        const newSiblings = [...siblings];
        newSiblings.splice(insertIndex, 0, draggedItem);

        if (targetPosAfter.parent) {
          const parentId = targetPosAfter.parent.id.toString();

          const updateChildren = (
            treeItems: TreeItems<TreeItemData>
          ): TreeItems<TreeItemData> => {
            return treeItems.map((item) => {
              if (item.id.toString() === parentId) {
                return { ...item, children: newSiblings };
              }
              if (item.children) {
                return { ...item, children: updateChildren(item.children) };
              }
              return item;
            });
          };

          const updated = updateChildren(updatedItemsAfterRemove);
          const enforced = enforceLayerRules(updated);
          itemsBeforeChangeRef.current = enforced;
          return enforced;
        } else {
          const enforced = enforceLayerRules(newSiblings);
          itemsBeforeChangeRef.current = enforced;
          return enforced;
        }
      });
    }

    setPendingGroupDrop(null);
    setGroupDropDialogOpen(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setRitordningDragOver(null);

    // Clear drag tracking if no drop happened or if it's not a SortableTree item
    if (!over || active.id === over.id) {
      itemsBeforeChangeRef.current = items;
      return;
    }

    // Clear tracking for source items (handled separately)
    if (typeof active.id === "string" && active.id.startsWith("source-")) {
      itemsBeforeChangeRef.current = items;
    }

    // Handle Ritordning drop zone
    if (over.id === "ritordning-drop-zone") {
      if (
        typeof active.id === "string" &&
        active.id.startsWith("source-layer-")
      ) {
        // Dropping a layer from source into Ritordning
        const parts = active.id.split("-");
        if (parts.length < 3) return;
        const layerId = parts.slice(2).join("-");
        const layer = layers.find((l) => l.id === layerId);
        if (!layer) return;

        // Only add if not already in the list
        setRitordningItems((prev) => {
          if (prev.includes(layerId)) return prev;
          return [...prev, layerId];
        });
      } else if (
        typeof active.id === "string" &&
        active.id.startsWith("ritordning-")
      ) {
        // Reordering within Ritordning - just return, items are already in place
        return;
      }
      return;
    }

    // Handle dropping source layer onto Ritordning item (insert at position)
    if (
      typeof active.id === "string" &&
      active.id.startsWith("source-layer-") &&
      typeof over.id === "string" &&
      over.id.startsWith("ritordning-")
    ) {
      const parts = active.id.split("-");
      if (parts.length < 3) return;
      const layerId = parts.slice(2).join("-");
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      const overLayerId = over.id.replace("ritordning-", "");
      setRitordningItems((prev) => {
        if (prev.includes(layerId)) {
          // If already in list, just reorder
          const newItems = prev.filter((id) => id !== layerId);
          const overIndex = newItems.indexOf(overLayerId);
          if (overIndex !== -1) {
            newItems.splice(overIndex, 0, layerId);
          } else {
            newItems.push(layerId);
          }
          return newItems;
        } else {
          // Add new layer at position
          const overIndex = prev.indexOf(overLayerId);
          if (overIndex !== -1) {
            const newItems = [...prev];
            newItems.splice(overIndex, 0, layerId);
            return newItems;
          } else {
            return [...prev, layerId];
          }
        }
      });
      return;
    }

    // Handle Ritordning item reordering
    if (typeof active.id === "string" && active.id.startsWith("ritordning-")) {
      const activeLayerId = active.id.replace("ritordning-", "");
      if (typeof over.id === "string" && over.id.startsWith("ritordning-")) {
        const overLayerId = over.id.replace("ritordning-", "");
        setRitordningItems((prev) => {
          const newItems = [...prev];
          const activeIndex = newItems.indexOf(activeLayerId);
          const overIndex = newItems.indexOf(overLayerId);
          if (
            activeIndex !== -1 &&
            overIndex !== -1 &&
            activeIndex !== overIndex
          ) {
            newItems.splice(activeIndex, 1);
            newItems.splice(overIndex, 0, activeLayerId);
          }
          return newItems;
        });
      }
      return;
    }

    if (typeof active.id === "string" && active.id.startsWith("source-")) {
      const parts = active.id.split("-");
      if (parts.length < 3) return;
      const type = parts[1] as "group" | "layer";
      const id = parts.slice(2).join("-");

      const addItemToTree = (newItem: TreeItem<TreeItemData>) => {
        if (over.id !== "tree-drop-zone") {
          const targetId = over.id.toString();
          const targetItem = findItemInTree(items, targetId);

          if (targetItem?.type === "group") {
            openGroupTargetDropDialog({
              draggedItemId: newItem.id.toString(),
              draggedItemName: newItem.name,
              targetGroupId: targetId,
              targetGroupName: targetItem.name,
              isFromSource: true,
            });
            return;
          }

          setItems((prevItems) =>
            enforceLayerRules([...prevItems, newItem])
          );
        } else {
          setItems((prevItems) => enforceLayerRules([...prevItems, newItem]));
        }
      };

      if (type === "layer") {
        const sourceLayer = layers.find((l) => l.id === id);
        if (!sourceLayer) return;
        addItemToTree({
          id: `layer-${sourceLayer.id}`,
          name: sourceLayer.name,
          type: "layer",
          canHaveChildren: false,
        });
        return;
      }

      void buildGroupTreeItem(id).then((newItem) => {
        if (!newItem) return;
        addItemToTree(newItem);
      });
    } else {
      // Handle existing item in tree being dragged
      const draggedItemId = active.id.toString();
      const draggedItem = findItemInTree(items, draggedItemId);

      if (over.id !== "tree-drop-zone" && draggedItem) {
        const targetId = over.id.toString();
        const targetItem = findItemInTree(items, targetId);

        if (targetItem?.type === "group") {
          openGroupTargetDropDialog({
            draggedItemId,
            draggedItemName: draggedItem.name,
            targetGroupId: targetId,
            targetGroupName: targetItem.name,
            isFromSource: false,
          });
          return;
        }
      }

      if (over.id === "tree-drop-zone") {
        setItems((prevItems) => {
          const findAndRemoveItem = (
            treeItems: TreeItems<TreeItemData>,
            itemId: string
          ): {
            item: TreeItem<TreeItemData> | null;
            updatedItems: TreeItems<TreeItemData>;
          } => {
            for (let i = 0; i < treeItems.length; i++) {
              if (treeItems[i].id.toString() === itemId) {
                const item = treeItems[i];
                const updatedItems = treeItems.filter(
                  (_, index) => index !== i
                );
                return { item, updatedItems };
              }
            }

            let foundItem: TreeItem<TreeItemData> | null = null;
            const updatedItems = treeItems.map((item) => {
              if (foundItem) return item;

              if (item.children) {
                const result = findAndRemoveItem(item.children, itemId);
                if (result.item) {
                  foundItem = result.item;
                  return {
                    ...item,
                    children: result.updatedItems,
                  };
                }
              }
              return item;
            });

            return { item: foundItem, updatedItems };
          };

          const { item, updatedItems } = findAndRemoveItem(
            prevItems,
            draggedItemId
          );
          if (item) {
            const rootItem: TreeItem<TreeItemData> = {
              ...item,
              children: item.type === "group" ? item.children ?? [] : undefined,
              canHaveChildren: item.type === "group",
            };
            return enforceLayerRules([...updatedItems, rootItem]);
          }
          return enforceLayerRules(prevItems);
        });
      }
    }
  };

  const panelShellSx = embedded
    ? { width: "100%", minWidth: 0, maxWidth: "100%", overflow: "hidden" }
    : {
        width: "100%",
        p: 2,
        mb: 3,
        backgroundColor: isDarkMode ? "#121212" : "#efefef",
      };

  const PANEL_HEIGHT = 630;

  const columnPaperSx = {
    p: 2,
    backgroundColor: isDarkMode ? "#1a1a1a" : "#fff",
    position: "relative" as const,
    width: "100%",
    maxWidth: "100%",
    height: PANEL_HEIGHT,
    minHeight: PANEL_HEIGHT,
    maxHeight: PANEL_HEIGHT,
    display: "flex",
    flexDirection: "column" as const,
    minWidth: 0,
    overflow: "hidden",
    boxSizing: "border-box" as const,
  };

  const columnBodySx = {
    display: "flex",
    flexDirection: "column" as const,
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
  };

  const sourceListScrollSx = {
    flex: 1,
    minHeight: 0,
    overflowY: "auto" as const,
    overflowX: "hidden" as const,
    position: "relative" as const,
    width: "100%",
    pointerEvents: "auto" as const,
    "&::-webkit-scrollbar": { width: "8px" },
    "&::-webkit-scrollbar-track": { background: "transparent" },
    "&::-webkit-scrollbar-thumb": {
      background: isDarkMode ? "#555" : "#ccc",
      borderRadius: "4px",
      "&:hover": { background: isDarkMode ? "#666" : "#bbb" },
    },
    scrollbarWidth: "thin" as const,
    scrollbarColor: isDarkMode ? "#555 transparent" : "#ccc transparent",
  };

  const rightPanelTabSx = {
    display: "flex",
    flexDirection: "column" as const,
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
  };

  const treeScrollSx = {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflowY: "auto" as const,
    overflowX: "hidden" as const,
    position: "relative" as const,
    width: "100%",
    maxWidth: "100%",
    pointerEvents: "auto" as const,
  };

  const sortableTreeSx = {
    position: "relative" as const,
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
    boxSizing: "border-box" as const,
    pl: "10px",
    "& .dnd-sortable-tree_simple_wrapper": {
      maxWidth: "100%",
      minWidth: 0,
    },
    "& .dnd-sortable-tree_simple_tree-item-wrapper": {
      maxWidth: "100%",
      minWidth: 0,
      "& > div": {
        maxWidth: "100%",
        minWidth: 0,
        "&:last-child": {
          position: "relative",
          zIndex: 10,
        },
      },
    },
    "& .dnd-sortable-tree_simple_tree-item-collapse_button": {
      filter: isDarkMode ? "brightness(0) invert(0.6)" : "none",
    },
    "& .dnd-sortable-tree_simple_tree-item-collapse_button-container": {
      position: "relative",
      zIndex: 1,
      pointerEvents: "auto",
      flexShrink: 0,
      width: "fit-content",
      height: "fit-content",
    },
    "& .dnd-sortable-tree_simple_handle": {
      cursor: "grab",
      "&:active": {
        cursor: "grabbing",
      },
      filter: isDarkMode ? "brightness(0) invert(0.6)" : "none",
    },
    "& .dnd-sortable-tree_drop-indicator": {
      backgroundColor: isDarkMode ? "#42a5f5" : "#1976d2",
      height: "2px",
      boxShadow: `0 0 4px ${isDarkMode ? "#42a5f5" : "#1976d2"}`,
    },
  };

  const rightPanelScrollSx = {
    ...treeScrollSx,
    overflowY: showRightScrollbar ? ("auto" as const) : ("hidden" as const),
    "&::-webkit-scrollbar": {
      width: "8px",
      display: showRightScrollbar ? "block" : "none",
    },
    "&::-webkit-scrollbar-track": {
      background: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
      background: isDarkMode ? "#555" : "#ccc",
      borderRadius: "4px",
      "&:hover": {
        background: isDarkMode ? "#666" : "#bbb",
      },
    },
    scrollbarWidth: showRightScrollbar ? ("thin" as const) : ("none" as const),
    scrollbarColor: showRightScrollbar
      ? isDarkMode
        ? "#555 transparent"
        : "#ccc transparent"
      : "transparent transparent",
  };

  const layerOrderContent = (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Grid
          container
          spacing={3}
          sx={{
            position: "relative",
            minWidth: 0,
            maxWidth: "100%",
            width: "100%",
            overflow: "hidden",
            boxSizing: "border-box",
            alignItems: "stretch",
          }}
        >
          <Grid
            size={{ xs: 12, lg: 4 }}
            sx={{ position: "relative", minWidth: 0, display: "flex" }}
          >
            <Paper variant="outlined" sx={columnPaperSx}>
              <Box sx={columnBodySx}>
              {rightTab === 0 ? (
                <>
                  <Tabs
                    value={leftTab}
                    onChange={(_, newValue: number) => setLeftTab(newValue)}
                    sx={{ mb: 2, flexShrink: 0 }}
                  >
                    <Tab label={t("common.layers")} />
                    <Tab label={t("common.groups")} />
                  </Tabs>

                  <TextField
                    placeholder={t("common.search")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    fullWidth
                    sx={{ mb: 2, flexShrink: 0 }}
                    size="small"
                  />

                  <Box
                    ref={leftPanelScrollRef}
                    sx={sourceListScrollSx}
                    onWheel={(e) => {
                      const container = leftPanelScrollRef.current;
                      if (!container) return;

                      e.stopPropagation();

                      if (activeId) {
                        const delta = e.deltaY;
                        container.scrollBy({
                          top: delta,
                          behavior: "auto",
                        });
                      }
                    }}
                  >
                    <List sx={{ position: "relative", width: "100%", p: 1 }}>
                      {leftTab === 0
                        ? filteredLayersLagerordning.map((layer) => (
                            <DraggableSourceItem
                              key={layer.id}
                              item={layer}
                              type="layer"
                            />
                          ))
                        : filteredGroups.map((group) => (
                            <DraggableSourceItem
                              key={group.id}
                              item={group}
                              type="group"
                            />
                          ))}
                      {leftTab === 0 &&
                        filteredLayersLagerordning.length === 0 && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ p: 2, textAlign: "center" }}
                          >
                            {t("common.noLayersAvailable")}
                          </Typography>
                        )}
                      {leftTab === 1 && filteredGroups.length === 0 && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ p: 2, textAlign: "center" }}
                        >
                          {t("common.noGroupsAvailable")}
                        </Typography>
                      )}
                    </List>
                  </Box>
                </>
              ) : (
                <>
                  <Tabs value={0} sx={{ mb: 2, flexShrink: 0 }}>
                    <Tab label={t("common.layers")} />
                  </Tabs>

                  <TextField
                    placeholder={t("common.search")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    fullWidth
                    sx={{ mb: 2, flexShrink: 0 }}
                    size="small"
                  />

                  <Box
                    ref={leftPanelScrollRef}
                    sx={sourceListScrollSx}
                    onWheel={(e) => {
                      const container = leftPanelScrollRef.current;
                      if (!container) return;

                      e.stopPropagation();

                      if (activeId) {
                        const delta = e.deltaY;
                        container.scrollBy({
                          top: delta,
                          behavior: "auto",
                        });
                      }
                    }}
                  >
                    <List sx={{ position: "relative", width: "100%", p: 1 }}>
                      {filteredLayersRitordning.map((layer) => (
                        <DraggableSourceItem
                          key={layer.id}
                          item={layer}
                          type="layer"
                        />
                      ))}
                      {filteredLayersRitordning.length === 0 && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ p: 2, textAlign: "center" }}
                        >
                          {t("common.noLayersAvailable")}
                        </Typography>
                      )}
                    </List>
                  </Box>
                </>
              )}
              </Box>
            </Paper>
          </Grid>

          <Grid
            size={{ xs: 12, lg: 8 }}
            sx={{ minWidth: 0, display: "flex" }}
          >
            <Paper variant="outlined" sx={columnPaperSx}>
              <Tabs
                value={rightTab}
                onChange={(_, newValue: number) => {
                  setRightTab(newValue);
                  if (newValue === 1) {
                    setLeftTab(0); // Auto-switch to Layers tab when Ritordning is selected
                  }
                }}
                sx={{ mb: 2, flexShrink: 0 }}
              >
                <Tab label={t("common.layerSwitcherOrder")} />
                <Tab label={t("common.drawOrder")} />
              </Tabs>

              <Box sx={columnBodySx}>
              {rightTab === 0 && (
                <Box sx={rightPanelTabSx}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, flexShrink: 0 }}
                  >
                    {t("common.layerSwitcherHierarchyTreeDescription")}
                  </Typography>

                  <TreeDropZone>
                    <Box
                      ref={rightPanelScrollRef}
                      sx={rightPanelScrollSx}
                      onWheel={(e) => {
                        const container = rightPanelScrollRef.current;
                        if (!container) return;

                        e.stopPropagation();

                        if (activeId) {
                          const delta = e.deltaY;
                          container.scrollBy({
                            top: delta,
                            behavior: "auto",
                          });
                        }
                      }}
                    >
                      {items.length === 0 ? (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flex: 1,
                            minHeight: 0,
                            height: "100%",
                            color: "text.secondary",
                          }}
                        >
                          <Typography variant="body2">
                            {t("common.dragLayersAndGroups")}
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={sortableTreeSx}>
                          <SortableTree
                            items={items}
                            onItemsChanged={(newItems, reason) => {
                              const nextItems = enforceLayerRules(newItems);

                              const applyItemsUpdate = () => {
                                setItems(nextItems);
                                itemsBeforeChangeRef.current = nextItems;
                              };

                              // Skip dialog detection if we're processing a group drop action
                              // (prevents dialog from reappearing after successful insert)
                              if (isProcessingGroupDropRef.current) {
                                applyItemsUpdate();
                                return;
                              }

                              // Collapse/expand and remove – never show placement dialog
                              if (
                                reason.type === "collapsed" ||
                                reason.type === "expanded" ||
                                reason.type === "removed"
                              ) {
                                applyItemsUpdate();
                                return;
                              }

                              if (reason.type !== "dropped") {
                                applyItemsUpdate();
                                return;
                              }

                              // Use ref to get the items state before the change
                              const oldItems = itemsBeforeChangeRef.current;
                              const draggedItemId =
                                reason.draggedItem.id.toString();

                              // Check if this is a group-on-group drop
                              let detectedDrop: {
                                draggedItemId: string;
                                draggedItemName: string;
                                targetGroupId: string;
                                targetGroupName: string;
                              } | null = null;

                              const dropInfo = detectItemOnGroupDrop(
                                oldItems,
                                newItems,
                                draggedItemId
                              );

                              if (dropInfo) {
                                const draggedItem = findItemInTree(
                                  oldItems,
                                  draggedItemId
                                );
                                if (draggedItem) {
                                  detectedDrop = {
                                    draggedItemId,
                                    draggedItemName: draggedItem.name,
                                    targetGroupId: dropInfo.targetGroupId,
                                    targetGroupName: dropInfo.targetGroupName,
                                  };
                                }
                              }

                              if (detectedDrop) {
                                // Revert the change and show dialog
                                setPendingGroupDrop({
                                  ...detectedDrop,
                                  isFromSource: false,
                                });
                                setGroupDropDialogOpen(true);
                                // Don't update items - we'll update after dialog choice
                                return;
                              }

                              applyItemsUpdate();
                            }}
                            TreeItemComponent={(treeItemProps) => {
                              const itemId = treeItemProps.item.id.toString();
                              const isGroup =
                                treeItemProps.item.type === "group";
                              return (
                                <TreeItemComponent
                                  {...treeItemProps}
                                  rootNumber={rootNumberByAnyItemId[itemId]}
                                  onMoveUp={() => handleMoveUp(itemId)}
                                  onMoveDown={() => handleMoveDown(itemId)}
                                  onAdd={
                                    isGroup
                                      ? () => handleAddToGroup(itemId)
                                      : undefined
                                  }
                                  canMoveUp={canMoveUp(itemId)}
                                  canMoveDown={canMoveDown(itemId)}
                                />
                              );
                            }}
                            keepGhostInPlace
                          />
                        </Box>
                      )}
                    </Box>
                  </TreeDropZone>
                </Box>
              )}

              {rightTab === 1 && (
                <Box sx={rightPanelTabSx}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, flexShrink: 0 }}
                  >
                    {t("common.dragLayersAndGroups")}
                  </Typography>

                  <RitordningDropZone>
                    <Box
                      ref={rightPanelScrollRef}
                      sx={{
                        ...treeScrollSx,
                        "&::-webkit-scrollbar": { width: "8px" },
                        "&::-webkit-scrollbar-track": {
                          background: "transparent",
                        },
                        "&::-webkit-scrollbar-thumb": {
                          background: isDarkMode ? "#555" : "#ccc",
                          borderRadius: "4px",
                          "&:hover": {
                            background: isDarkMode ? "#666" : "#bbb",
                          },
                        },
                        scrollbarWidth: "thin",
                        scrollbarColor: isDarkMode
                          ? "#555 transparent"
                          : "#ccc transparent",
                      }}
                      onWheel={(e) => {
                        const container = rightPanelScrollRef.current;
                        if (!container) return;

                        e.stopPropagation();

                        if (activeId) {
                          const delta = e.deltaY;
                          container.scrollBy({
                            top: delta,
                            behavior: "auto",
                          });
                        }
                      }}
                    >
                      {ritordningItems.length === 0 ? (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flex: 1,
                            minHeight: 0,
                            height: "100%",
                            color: "text.secondary",
                          }}
                        >
                          <Typography variant="body2">
                            {t("common.dragLayersAndGroups")}
                          </Typography>
                        </Box>
                      ) : (
                        <List sx={{ position: "relative", width: "100%" }}>
                          {ritordningItems.map((layerId, index) => {
                            const layer = layers.find((l) => l.id === layerId);
                            if (!layer) return null;
                            return (
                              <DraggableRitordningItem
                                key={`ritordning-${layerId}`}
                                layerId={layerId}
                                layerName={layer.name}
                                index={index}
                                onRemove={() => {
                                  setRitordningItems((prev) =>
                                    prev.filter((id) => id !== layerId)
                                  );
                                }}
                                dragOver={ritordningDragOver}
                              />
                            );
                          })}
                        </List>
                      )}
                    </Box>
                  </RitordningDropZone>
                </Box>
              )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
        <DragOverlay>
          {activeId?.startsWith("source-")
            ? (() => {
                const parts = activeId.split("-");
                if (parts.length < 3) return null;
                const type = parts[1] as "group" | "layer";
                const id = parts.slice(2).join("-");
                const sourceItem =
                  type === "layer"
                    ? layers.find((l) => l.id === id)
                    : groups.find((g) => g.id === id);

                if (!sourceItem) return null;

                return (
                  <ListItem
                    sx={{
                      backgroundColor: isDarkMode ? "#1a1a1a" : "#fff",
                      cursor: "grabbing",
                      border: "1px solid #ddd",
                      borderRadius: 2,
                      px: 2,
                      py: 1.5,
                      boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15)",
                      opacity: 0.9,
                      transform: "rotate(2deg)",
                      width: 250,
                    }}
                  >
                    <DragIndicator sx={{ mr: 1, color: "text.secondary" }} />
                    <Typography variant="body2">{sourceItem.name}</Typography>
                  </ListItem>
                );
              })()
            : null}
        </DragOverlay>
      </DndContext>
      <AddItemsDialog
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          setTargetGroupId(null);
        }}
        onConfirm={handleConfirmAddItems}
        layers={layers}
        groups={groups}
        addedItemIds={addedItemIdsLagerordning}
        excludeGroupId={editingGroup?.id}
        isDarkMode={isDarkMode}
      />
      {pendingGroupDrop && (
        <GroupDropDialog
          open={groupDropDialogOpen}
          onClose={() => {
            setGroupDropDialogOpen(false);
            setPendingGroupDrop(null);
            // Reset the flag when dialog is cancelled
            isProcessingGroupDropRef.current = false;
          }}
          onConfirm={handleGroupDropAction}
          draggedGroupName={pendingGroupDrop.draggedItemName}
          targetGroupName={pendingGroupDrop.targetGroupName}
          isDarkMode={isDarkMode}
        />
      )}
    </>
  );

  if (embedded) {
    return <Box sx={panelShellSx}>{layerOrderContent}</Box>;
  }

  return (
    <Paper sx={panelShellSx}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {t("common.layerSwitcherOrder")}
      </Typography>
      {layerOrderContent}
    </Paper>
  );
}
