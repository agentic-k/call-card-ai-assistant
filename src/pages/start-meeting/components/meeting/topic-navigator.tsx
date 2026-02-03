import React from 'react';
import { UseCase, PainPoint } from '@/types/agent/call-card-create.types';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ClassifyTextResponse } from '@/types/text-classifier';
import ClassificationLabel from '../classification-label';

interface TopicNavigatorProps {
  topic: UseCase | PainPoint;
  topicType: 'useCase' | 'painPoint';
  currentQuestionIndex: number;
  nextQuestion: () => void;
  previousQuestion: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  currentClassification: ClassifyTextResponse | null;
  isLoading?: boolean;
}

/**
 * Combined component for navigating through both use case and pain point questions
 */
const TopicNavigator: React.FC<TopicNavigatorProps> = ({
  topic,
  topicType,
  currentQuestionIndex,
  nextQuestion,
  previousQuestion,
  isFirstQuestion,
  isLastQuestion,
  currentClassification,
  isLoading = false
}) => {
  const currentQuestion = topic.questions[currentQuestionIndex];
  
  if (!currentQuestion) return null;
  
  return (
    <div className="flex flex-col space-y-4 px-4">
      <div className="flex items-center justify-between">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={previousQuestion}
                disabled={isFirstQuestion}
                className={cn(
                  "transition-opacity h-6 w-6 focus:ring-0 focus:outline-none focus:border focus:border-muted/30 focus:border-[0.2px]",
                  isFirstQuestion ? "opacity-0" : "opacity-100"
                )}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Previous question (←)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="text-xs text-muted-foreground">
          Q{currentQuestionIndex + 1}/{topic.questions.length}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={nextQuestion}
                disabled={isLastQuestion}
                className={cn(
                  "transition-opacity h-6 w-6 focus:ring-0 focus:outline-none focus:border focus:border-muted/30 focus:border-[0.5px]",
                  isLastQuestion ? "opacity-0" : "opacity-100"
                )}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Next question (→)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="bg-card border rounded-lg p-4">
        <p className="text-sm">
          {currentQuestion.text}
        </p>
      </div>
      
      <div className="flex justify-center">
        <ClassificationLabel 
          classification={currentClassification} 
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default TopicNavigator;
