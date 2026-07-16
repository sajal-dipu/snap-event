"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full">
      {/* Step circles + connector line */}
      <div className="flex items-center gap-0">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;

          return (
            <div key={stepNumber} className="flex items-center flex-1 last:flex-none">
              {/* Step circle */}
              <div className="flex flex-col items-center relative">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isCompleted
                      ? "hsl(var(--primary))"
                      : isActive
                      ? "hsl(var(--primary))"
                      : "hsl(var(--secondary))",
                    borderColor: isCompleted
                      ? "hsl(var(--primary))"
                      : isActive
                      ? "hsl(var(--primary))"
                      : "hsl(var(--border))",
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center z-10 relative"
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                    >
                      <Check className="h-4 w-4 text-primary-foreground" strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <span
                      className={`text-xs font-bold ${
                        isActive ? "text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {stepNumber}
                    </span>
                  )}
                </motion.div>
                {/* Label */}
                <span
                  className={`absolute top-10 text-[9px] font-medium whitespace-nowrap hidden sm:block ${
                    isActive
                      ? "text-primary"
                      : isCompleted
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-px mx-1 relative overflow-hidden bg-border">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary"
                    initial={{ width: "0%" }}
                    animate={{ width: isCompleted ? "100%" : "0%" }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress text */}
      <div className="mt-12 sm:mt-8 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Step {currentStep} of {steps.length}
        </p>
        <p className="text-xs font-medium text-foreground">{steps[currentStep - 1]}</p>
      </div>
    </div>
  );
}

export default StepIndicator;
