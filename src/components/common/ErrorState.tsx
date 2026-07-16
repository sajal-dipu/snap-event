import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  retryText?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description = "An error occurred while loading this section. Please try again.",
  retryText = "Try Again",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-red-500/10 rounded-xl bg-red-500/5 max-w-md mx-auto my-8">
      <div className="rounded-full bg-red-500/10 p-4 mb-4 text-red-500 flex items-center justify-center">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-500">
          {retryText}
        </Button>
      )}
    </div>
  );
}
export default ErrorState;
