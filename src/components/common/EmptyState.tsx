import * as React from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title = "No results found",
  description = "We couldn't find anything matching your request.",
  actionText,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl bg-card/25 backdrop-blur-sm max-w-md mx-auto my-8">
      <div className="rounded-full bg-secondary p-4 mb-4 text-muted-foreground flex items-center justify-center">
        {icon || <FolderOpen className="h-8 w-8" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">{description}</p>
      {actionText && onAction && (
        <Button variant="default" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
export default EmptyState;
