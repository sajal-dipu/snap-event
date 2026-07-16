import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          className={cn(
            "h-4 w-4 rounded border-input text-primary focus:ring-ring focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 accent-indigo-600 transition-all",
            error && "border-destructive",
            className
          )}
          ref={ref}
          {...props}
        />
        {label && (
          <span className="text-sm font-medium text-foreground leading-none">
            {label}
          </span>
        )}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
