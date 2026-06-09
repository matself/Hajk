import type { ReactNode } from "react";
import { Grid } from "@mui/material";

/** Vertical gap between stacked fields in settings panels (12px). */
export const FORM_FIELD_ROW_SPACING = 1.5;

// Are these used? If not, remove them.
/** First field in a settings tab — full width on md+. */
// eslint-disable-next-line react-refresh/only-export-components
export const FORM_FIELD_COL_SIZE_FIRST = { xs: 12, md: 12 } as const;
// Are these used? If not, remove them.
/** Remaining fields in a settings tab — 10/12 width on md+. */
// eslint-disable-next-line react-refresh/only-export-components
export const FORM_FIELD_COL_SIZE = { xs: 12, md: 10 } as const;

interface FormFieldGridProps {
  children: ReactNode;
  columnSpacing?: number;
}

/** Standard single-column field layout for FormPanel / FormAccordion content. */
export default function FormFieldGrid({
  children,
  columnSpacing,
}: FormFieldGridProps) {
  return (
    <Grid
      container
      rowSpacing={FORM_FIELD_ROW_SPACING}
      columnSpacing={columnSpacing}
    >
      {children}
    </Grid>
  );
}
