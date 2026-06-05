import React from "react";
import { Tree } from "react-arborist";
import type { TreeApi } from "react-arborist";
import { Box } from "@mui/material";
import type { MenuTreeNode } from "./types";
import type { NodeRendererProps } from "react-arborist";
import { MenuTreeNodeRenderer } from "./menu-tree-node";
import { moveNodes } from "./utils";

interface MenuTreeProps {
  data: MenuTreeNode[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (next: MenuTreeNode[]) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  treeRef?: React.RefObject<TreeApi<MenuTreeNode> | undefined>;
}

export function MenuTree({
  data,
  selectedId,
  onSelect,
  onChange,
  onAddChild,
  onDelete,
  treeRef,
}: MenuTreeProps) {
  function NodeRenderer(props: NodeRendererProps<MenuTreeNode>) {
    return (
      <MenuTreeNodeRenderer
        {...props}
        selectedId={selectedId}
        onDelete={onDelete}
        onAddChild={onAddChild}
      />
    );
  }

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 300,
        overflow: "hidden",
        userSelect: "none",
        "& .ReactVirtualized__List, & [class*='List']": {
          outline: "none",
        },
      }}
    >
      <Tree<MenuTreeNode>
        ref={treeRef}
        data={data}
        idAccessor="id"
        childrenAccessor="children"
        openByDefault
        selection={selectedId ?? undefined}
        rowHeight={40}
        height={500}
        width="100%"
        indent={20}
        disableEdit
        onSelect={(nodes) => {
          onSelect(nodes.length > 0 ? nodes[0].id : null);
        }}
        onMove={({ dragIds, parentId, index }) => {
          const next = moveNodes(data, dragIds, parentId, index);
          onChange(next);
        }}
      >
        {NodeRenderer}
      </Tree>
    </Box>
  );
}
