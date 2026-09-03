import React, { createContext, useContext, useMemo } from "react";
import { themes, darkTheme, type Theme } from "./tokens";
import { useThemeStore } from "../store/themeStore";

const ThemeContext = createContext<Theme>(darkTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeKey = useThemeStore((s) => s.themeKey);
  const theme = useMemo(() => themes[themeKey] ?? darkTheme, [themeKey]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
