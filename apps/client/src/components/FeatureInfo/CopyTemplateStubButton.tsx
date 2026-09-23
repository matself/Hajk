import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";

interface CopyTemplateStubButtonProps {
  properties: Record<string, unknown>;
}

type CopyStatus = "idle" | "copied" | "failed";

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// One "NAME {NAME}" line per attribute. Nested objects (the geometry, JSON
// blobs) can't be used as placeholders, but null values can - an empty field
// on this feature may well be filled on the next one.
const buildTemplateStub = (
  properties: Record<string, unknown>
): { text: string; html: string } => {
  const lines = Object.keys(properties)
    .filter((key) => {
      const value = properties[key];
      return value === null || typeof value !== "object";
    })
    .map((key) => `${key} {${key}}`);
  return {
    text: lines.join("\n"),
    // Draft.js (Admin's Infoklick editor in Visuell mode) prefers text/html
    // when pasting: one paragraph with <br> keeps the lines together, the
    // same way the editor itself exports soft line breaks.
    html: `<p>${lines.map(escapeHtml).join("<br>")}</p>`,
  };
};

// Legacy path: hijack a "copy" event to set both formats. Still needed where
// the async Clipboard API is missing (plain http outside localhost) or denied
// (embedded browsers, restrictive permission policies).
const copyViaCopyEvent = (stub: { text: string; html: string }): boolean => {
  const onCopy = (e: ClipboardEvent) => {
    e.clipboardData?.setData("text/plain", stub.text);
    e.clipboardData?.setData("text/html", stub.html);
    e.preventDefault();
  };
  document.addEventListener("copy", onCopy);
  try {
    return document.execCommand("copy");
  } finally {
    document.removeEventListener("copy", onCopy);
  }
};

const copyToClipboard = async (stub: {
  text: string;
  html: string;
}): Promise<void> => {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([stub.text], { type: "text/plain" }),
          "text/html": new Blob([stub.html], { type: "text/html" }),
        }),
      ]);
      return;
    } catch (error) {
      console.warn("Clipboard API denied, falling back to copy event:", error);
    }
  }
  if (!copyViaCopyEvent(stub)) {
    throw new Error("document.execCommand('copy') was rejected");
  }
};

// Shown next to the caption for layers without an Infoklick template, i.e.
// above the default attribute table, so a long list needn't be scrolled: copies a starter template built from this feature's
// actual attribute names, for services whose attributes Admin can't fetch
// (a WMS without WFS DescribeFeatureType).
const CopyTemplateStubButton: React.FC<CopyTemplateStubButtonProps> = ({
  properties,
}) => {
  const [status, setStatus] = React.useState<CopyStatus>("idle");

  // Fall back to the copy icon a moment after success/failure, so the
  // button can be used again for the next feature.
  React.useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  const handleClick = async () => {
    try {
      await copyToClipboard(buildTemplateStub(properties));
      setStatus("copied");
    } catch (error) {
      console.error("Could not copy template stub to clipboard:", error);
      setStatus("failed");
    }
  };

  const tooltips: Record<CopyStatus, string> = {
    idle: "Kopiera attributen som Infoklick-mall",
    copied: "Mall kopierad",
    failed: "Kunde inte kopiera",
  };

  const icons: Record<CopyStatus, React.ReactElement> = {
    idle: <ContentCopyIcon fontSize="small" />,
    copied: <CheckIcon fontSize="small" color="success" />,
    failed: <ErrorOutlineIcon fontSize="small" color="error" />,
  };

  return (
    <Tooltip title={tooltips[status]}>
      <IconButton
        size="small"
        onClick={handleClick}
        aria-label={tooltips[status]}
      >
        {icons[status]}
      </IconButton>
    </Tooltip>
  );
};

export default CopyTemplateStubButton;
