import type { ReactNode } from "react";
import { useId } from "react";
import { Box, TextField, type TextFieldProps } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useTranslation } from "react-i18next";
import HajkTooltip from "../hajk-tooltip";

export function FieldHelpTooltip({ title }: { title: string }) {
  return (
    <HajkTooltip title={title}>
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          verticalAlign: "middle",
          ml: 0.5,
          color: "text.secondary",
          cursor: "help",
        }}
        aria-label={title}
        onMouseDown={(e) => e.preventDefault()}
      >
        <InfoOutlinedIcon sx={{ fontSize: 16 }} />
      </Box>
    </HajkTooltip>
  );
}

/** Appends an info tooltip to a field label (checkbox labels, table headers). */
export function withFieldHelp(label: ReactNode, help: string): ReactNode {
  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}
    >
      {label}
      <FieldHelpTooltip title={help} />
    </Box>
  );
}

/** Checkbox / table label with help (avoids floating MUI label issues). */
export function InlineLabelWithHelp({
  label,
  help,
}: {
  label: string;
  help: string;
}): ReactNode {
  return withFieldHelp(label, help);
}

/** Label row always shown above the input so the help icon is hoverable before focus. */
export function FieldLabelAbove({
  htmlFor,
  label,
  help,
}: {
  htmlFor: string;
  label: ReactNode;
  help: string;
}) {
  return (
    <Box
      component="label"
      htmlFor={htmlFor}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.25,
        mb: 0.75,
        typography: "body2",
        color: "text.secondary",
      }}
    >
      {label}
      <FieldHelpTooltip title={help} />
    </Box>
  );
}

type TextFieldWithHelpProps = Omit<TextFieldProps, "label"> & {
  labelKey: string;
  helpKey: string;
};

/** TextField with a persistent label + help tooltip above the input. */
export function TextFieldWithHelp({
  labelKey,
  helpKey,
  id: idProp,
  ...textFieldProps
}: TextFieldWithHelpProps) {
  const { t } = useTranslation();
  const generatedId = useId();
  const id = idProp ?? generatedId;

  return (
    <Box>
      <FieldLabelAbove
        htmlFor={id}
        label={String(t(labelKey as never))}
        help={String(t(helpKey as never))}
      />
      <TextField id={id} {...textFieldProps} />
    </Box>
  );
}
