
import React from 'react';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  onStepClick?: (step: number) => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepTitles,
  onStepClick,
}) => {
  return (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isClickable = onStepClick && stepNumber <= currentStep;

        return (
          <div key={stepNumber} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                isCompleted
                  ? 'bg-accent border-accent text-white'
                  : isCurrent
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-muted-foreground text-muted-foreground'
              } ${isClickable ? 'cursor-pointer hover:scale-105' : ''}`}
              onClick={isClickable ? () => onStepClick(stepNumber) : undefined}
            >
              {isCompleted ? (
                <Check className="w-5 h-5" />
              ) : (
                <span className="text-sm font-medium">{stepNumber}</span>
              )}
            </div>
            <span
              className={`ml-2 text-sm font-medium ${
                isCurrent ? 'text-accent' : 'text-muted-foreground'
              } ${isClickable ? 'cursor-pointer hover:text-accent' : ''}`}
              onClick={isClickable ? () => onStepClick(stepNumber) : undefined}
            >
              {stepTitles[index]}
            </span>
            {stepNumber < totalSteps && (
              <div className="w-8 h-0.5 bg-muted-foreground mx-4" />
            )}
          </div>
        );
      })}
    </div>
  );
};
