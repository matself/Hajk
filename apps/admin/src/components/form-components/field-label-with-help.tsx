import type { ReactNode } from "react";
import { useId } from "react";
import { Box, TextField, type TextFieldProps } from "@mui/material";
import { useTranslation } from "react-i18next";
import { FieldHelpTooltip, FieldLabelWithHelp } from "./field-help-tooltip";

/** Checkbox / table label with help (avoids floating MUI label issues). */
export function InlineLabelWithHelp({
  label,
  help,
}: {
  label: string;
  help: string;
}) {
  return <FieldLabelWithHelp label={label} help={help} />;
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
