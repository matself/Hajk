import { FieldValues } from "react-hook-form";
import { RenderFunction } from "../types/render";
import { TextField } from "@mui/material";

const renderNumberField: RenderFunction<FieldValues> = ({
  field,
  inputProps,
  errorMessage,
  title,
  disabled,
}) => {
  return (
    <TextField
      {...field}
      {...inputProps}
      fullWidth
      label={title}
      disabled={disabled ?? false}
      type="number"
      error={!!errorMessage}
      helperText={errorMessage}
      value={(field?.value as string) ?? ""}
      onChange={(e) => {
        const newValue = e.target.value === "" ? "" : Number(e.target.value);
        field?.onChange(newValue);
      }}
      slotProps={{
        htmlInput: {
          ...inputProps,
          ref: field?.ref,
        },
      }}
    />
  );
};

export default renderNumberField;
