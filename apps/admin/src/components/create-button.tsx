import { forwardRef } from "react";
import { Button, Box } from "@mui/material";
import type { ButtonProps } from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";

/**
 * Primary "Create new …" call-to-action button used as the page-header
 * action across the admin (Services, Maps, Groups, Display/Search/Editing
 * Layers, etc.). Keeps the visual styling — height, padding, icon size,
 * font weight — in one place so all entry-points stay aligned.
 *
 * Pass a single `label` (used as the visible text and as `aria-label` when
 * one isn't provided explicitly). Any extra `ButtonProps` are forwarded to
 * the underlying MUI `Button`, so callers can still override `color`,
 * `disabled`, etc.
 */
export interface CreateButtonProps extends Omit<ButtonProps, "children"> {
  label: string;
}

const CreateButton = forwardRef<HTMLButtonElement, CreateButtonProps>(
  function CreateButton(
    { label, sx, "aria-label": ariaLabel, ...rest },
    ref,
  ) {
    return (
      <Button
        ref={ref}
        color="primary"
        variant="contained"
        aria-label={ariaLabel ?? label}
        startIcon={<AddIcon />}
        sx={{
          minHeight: 44,
          px: 2,
          fontSize: "0.94rem",
          fontWeight: 600,
          "& .MuiButton-startIcon": {
            display: "flex",
            alignItems: "center",
            "& .MuiSvgIcon-root": {
              fontSize: 21,
            },
          },
          ...sx,
        }}
        {...rest}
      >
        <Box component="span">{label}</Box>
      </Button>
    );
  },
);

export default CreateButton;
