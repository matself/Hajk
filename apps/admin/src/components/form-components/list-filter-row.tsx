import type { ReactNode } from "react";
import { Box, type SxProps, type Theme } from "@mui/material";

interface ListFilterRowProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
}

/** Horizontal filter bar for list pages (search + dropdowns on one row). */
export function ListFilterRow({ children, sx }: ListFilterRowProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: { xs: "wrap", md: "nowrap" },
        alignItems: "flex-start",
        gap: 2,
        mb: 2,
        width: "100%",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Primary search field — largest share of the row (4:2:2 vs filter fields). */
export function ListFilterSearch({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        flex: { xs: "1 1 100%", sm: "1 1 100%", md: "4 1 0" },
        minWidth: 0,
      }}
    >
      {children}
    </Box>
  );
}

/** Secondary filter dropdown — narrower fixed share of the row. */
export function ListFilterField({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        flex: { xs: "1 1 calc(50% - 8px)", sm: "1 1 calc(50% - 8px)", md: "2 1 160px" },
        minWidth: { md: 160 },
        maxWidth: { md: 220 },
      }}
    >
      {children}
    </Box>
  );
}
