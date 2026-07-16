"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";

type Theme = "dark" | "light" | "system";

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeContextValue {
  theme: Theme | undefined;
  setTheme: (theme: Theme) => void;
  resolvedTheme: Theme | undefined;
}

const CustomThemeContext = React.createContext<ThemeContextValue | null>(null);

function ThemeProviderInner({ children }: { children: React.ReactNode }) {
  const { theme, setTheme: nextSetTheme, resolvedTheme } = useNextTheme();

  // Create refs to store the latest values so callbacks can refer to them
  // without needing to redefine the callback and break references
  const nextSetThemeRef = React.useRef(nextSetTheme);
  const themeRef = React.useRef(theme);

  React.useEffect(() => {
    nextSetThemeRef.current = nextSetTheme;
  }, [nextSetTheme]);

  React.useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Stable memoized setTheme callback
  const setTheme = React.useCallback((newTheme: Theme) => {
    // Only update theme if value actually changes
    if (themeRef.current !== newTheme) {
      nextSetThemeRef.current(newTheme);
    }
  }, []);

  // Memoize the context value
  const value = React.useMemo(() => ({
    theme: theme as Theme | undefined,
    setTheme,
    resolvedTheme: resolvedTheme as Theme | undefined,
  }), [theme, resolvedTheme, setTheme]);

  return (
    <CustomThemeContext.Provider value={value}>
      {children}
    </CustomThemeContext.Provider>
  );
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "snappevent-theme",
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      value={{
        light: "light",
        dark: "dark",
      }}
      enableSystem
      storageKey={storageKey}
      {...props}
    >
      <ThemeProviderInner>{children}</ThemeProviderInner>
    </NextThemesProvider>
  );
}

export const useTheme = () => {
  const context = React.useContext(CustomThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeProvider;
