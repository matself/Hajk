import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Box, Divider, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useTranslation } from "react-i18next";
import type { TextSectionAttrs } from "../extensions/text-section";

/**
 * Editor-only preview for faktaruta / accordion blocks.
 * Serialization still uses TextSection.renderHTML — this does not affect output.
 */
export function TextSectionView({ node }: NodeViewProps) {
  const { t } = useTranslation();
  const { backgroundColor, dividerColor, isAccordion, accordionTitle } =
    node.attrs as TextSectionAttrs;

  const dividerSx = dividerColor
    ? { backgroundColor: dividerColor, height: 2 }
    : undefined;

  const containerSx = {
    my: 1,
    ...(backgroundColor ? { backgroundColor } : { bgcolor: "action.hover" }),
  };

  if (isAccordion) {
    return (
      <NodeViewWrapper>
        <Box
          sx={{
            ...containerSx,
            borderRadius: "5px",
            overflow: "hidden",
            ...(dividerColor ? { border: `2px solid ${dividerColor}` } : {}),
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.5,
              py: 1,
              opacity: 0.85,
            }}
          >
            <ExpandMoreIcon fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0 }}>
              {accordionTitle ||
                t("dhRichTextEditor.textSection.accordionTitlePlaceholder")}
            </Typography>
          </Box>
          <Box sx={{ px: 1.5, pb: 1 }}>
            <NodeViewContent style={{ outline: "none", minHeight: "1em" }} />
          </Box>
        </Box>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <Box sx={containerSx}>
        <Divider sx={dividerSx} />
        <Box sx={{ px: 2, py: 1 }}>
          <NodeViewContent style={{ outline: "none", minHeight: "1em" }} />
        </Box>
        <Divider sx={dividerSx} />
      </Box>
    </NodeViewWrapper>
  );
}
