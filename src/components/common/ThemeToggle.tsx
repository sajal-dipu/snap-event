"use client";

import * as React from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /** Visual variant to match the parent layout */
  variant?: "admin" | "photographer";
  /** Show label text next to icon */
  showLabel?: boolean;
}

export function ThemeToggle({ variant = "photographer", showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const isAdmin = variant === "admin";

  // Hydration safety: only check theme when mounted
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click
  React.useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Close on ESC key press
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const options = [
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "system" as const, label: "System", icon: Monitor },
  ];

  const current = mounted ? (options.find((o) => o.value === theme) ?? options[2]) : options[2];
  const Icon = current.icon;

  const btnClass = cn(
    "rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-all focus:outline-none focus:ring-1 focus:ring-primary",
    isAdmin ? "h-8 w-8" : showLabel ? "gap-2 px-3 py-2" : "h-10 w-10"
  );

  const menuClass = "absolute right-0 mt-2 w-36 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden py-1";

  if (!mounted) {
    return (
      <div className={cn("relative", showLabel ? "px-3 py-2" : "h-10 w-10")}>
        <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        id="theme-toggle-btn"
        onClick={() => setOpen((p) => !p)}
        className={btnClass}
        aria-label={`Theme setting: ${current.label}. Click to select theme.`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Toggle theme"
      >
        <Icon className={isAdmin ? "h-4 w-4" : "h-5 w-5"} />
        {showLabel && (
          <span className="text-xs font-semibold text-muted-foreground">
            {current.label}
          </span>
        )}
      </button>

      {open && (
        <div className={menuClass} role="listbox" aria-label="Theme options">
          {options.map(({ value, label, icon: OptionIcon }) => (
            <button
              key={value}
              role="option"
              aria-selected={theme === value}
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors text-left focus:outline-none focus:bg-accent",
                theme === value
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <OptionIcon className="h-3.5 w-3.5 shrink-0" />
              {label}
              {theme === value && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ThemeToggle;
