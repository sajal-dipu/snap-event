"use client";

import { Toaster } from "sonner";
import { useTheme } from "./ThemeProvider";

export function ToastProvider() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-right"
      theme={theme === "system" ? "system" : theme}
      closeButton
      richColors
      toastOptions={{
        style: {
          fontFamily: "var(--font-sans)",
        },
      }}
    />
  );
}
