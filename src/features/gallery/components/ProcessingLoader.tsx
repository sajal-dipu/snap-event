import * as React from "react";
import { Loader, CheckCircle2, Circle } from "lucide-react";

interface ProcessingLoaderProps {
  currentStage?: "detecting" | "aligning" | "embedding" | "matching" | "complete";
}

export function ProcessingLoader({ currentStage = "detecting" }: ProcessingLoaderProps) {
  const stages = [
    { key: "detecting", label: "Face Detection in progress..." },
    { key: "aligning", label: "Aligning facial features..." },
    { key: "embedding", label: "Generating face embedding vector..." },
    { key: "matching", label: "Comparing with event room gallery..." },
  ];

  const getStageIndex = (key: string) => {
    return stages.findIndex((s) => s.key === key);
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-3xl shadow-md text-center max-w-sm mx-auto space-y-6 select-none animate-in fade-in duration-300">
      {/* Animated Spinner Sphere */}
      <div className="relative h-20 w-20 flex items-center justify-center">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin duration-700" />
        <div className="h-10 w-10 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center text-primary font-bold animate-pulse text-xs font-mono">
          AI
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="font-extrabold text-sm text-foreground">AI Face Processor</h3>
        <p className="text-[11px] text-muted-foreground font-medium">
          Securely analyzing your selfie image in-memory...
        </p>
      </div>

      {/* Progress Steps List */}
      <div className="w-full text-left space-y-2.5 pt-2 border-t border-border">
        {stages.map((stage, idx) => {
          const isDone = idx < currentIndex || currentStage === "complete";
          const isActive = idx === currentIndex && currentStage !== "complete";

          return (
            <div
              key={stage.key}
              className={`flex items-center gap-2.5 text-xs font-semibold ${
                isActive
                  ? "text-foreground font-bold"
                  : isDone
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground opacity-60"
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-4.5 w-4.5 fill-current text-green-500 text-white dark:text-zinc-950" />
                ) : isActive ? (
                  <Loader className="h-4.5 w-4.5 text-primary animate-spin" />
                ) : (
                  <Circle className="h-4.5 w-4.5 text-zinc-300 dark:text-zinc-700" />
                )}
              </div>
              <span className="truncate leading-none">{stage.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default ProcessingLoader;
