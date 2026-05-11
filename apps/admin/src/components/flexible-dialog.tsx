import { FormEventHandler } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import type { DialogProps as MuiDialogProps } from "@mui/material/Dialog";

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  children: React.ReactNode;
  actions?: React.ReactNode;
  fullWidth?: boolean;
  maxWidth?: MuiDialogProps["maxWidth"];
  fullScreen?: MuiDialogProps["fullScreen"];
  /** When set, forwarded to `<form noValidate>` (e.g. use with react-hook-form). */
  formNoValidate?: boolean;
}

const DialogWrapper = ({
  open,
  title,
  onClose,
  onSubmit,
  children,
  actions,
  fullWidth,
  maxWidth,
  fullScreen,
  formNoValidate,
}: DialogProps) => (
  <Dialog
    fullWidth={fullWidth}
    maxWidth={maxWidth}
    fullScreen={fullScreen}
    open={open}
    onClose={onClose}
  >
    <DialogTitle>{title}</DialogTitle>

    {onSubmit ? (
      <form onSubmit={onSubmit} noValidate={formNoValidate}>
        <DialogContent>{children}</DialogContent>
        <DialogActions>{actions}</DialogActions>
      </form>
    ) : (
      <>
        <DialogContent>{children}</DialogContent>
        <DialogActions>{actions}</DialogActions>
      </>
    )}
  </Dialog>
);

export default DialogWrapper;
