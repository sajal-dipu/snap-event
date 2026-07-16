"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive";
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: readonly DropdownItem[] | DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, items, align = "right", className }: DropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={cn(
            "absolute mt-2 w-48 rounded-lg border border-border bg-card text-foreground shadow-lg z-50 overflow-hidden py-1 glass backdrop-blur-md border-white/10 dark:border-white/5",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          {items.map((item, index) => {
            const classNames = cn(
              "flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-secondary hover:text-foreground transition-colors",
              item.variant === "destructive" && "text-red-500 hover:bg-red-500/10 hover:text-red-500"
            );

            if (item.href) {
              return (
                <Link key={index} href={item.href} className={classNames} onClick={() => setIsOpen(false)}>
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={index}
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                className={classNames}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default Dropdown;
