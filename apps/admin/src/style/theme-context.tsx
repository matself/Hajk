import { createContext } from "react";
import type { PaletteMode } from "@mui/material";

export interface ThemeContextType {
  mode: PaletteMode;
  setMode: (mode: PaletteMode) => void;
}

export const ThemeContext = createContext<ThemeContextType | null>(null);
