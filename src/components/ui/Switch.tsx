import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, checked, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
    };

    return (
      <label className={cn("flex items-center gap-2 cursor-pointer select-none", className)}>
        <div className="relative">
          <input
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            className="sr-only peer"
            ref={ref}
            {...props}
          />
          <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-primary transition-colors"></div>
        </div>
        {label && (
          <span className="text-sm font-medium text-foreground leading-none">
            {label}
          </span>
        )}
      </label>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
