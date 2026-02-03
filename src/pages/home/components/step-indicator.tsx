import React from "react";

interface Step {
  number: number;
  title: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => (
  <div className="flex justify-between mb-8">
    {steps.map((s) => (
      <div key={s.number} className="flex flex-col items-center">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
            ${currentStep >= s.number
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
            }`}
        >
          {s.number}
        </div>
        <span className="mt-2 text-sm">{s.title}</span>
      </div>
    ))}
  </div>
);

export default StepIndicator; 