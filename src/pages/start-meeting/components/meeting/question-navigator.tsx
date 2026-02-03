import React from 'react';
import { ChevronRight, ChevronLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Question {
  id: number;
  question: string;
  type: string;
  category: string;
}

interface QuestionNavigatorProps {
  currentQuestion: Question;
  currentQuestionIndex: number;
  totalQuestions: number;
  nextQuestion: () => void;
  previousQuestion: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
}

/**
 * QuestionNavigator component displays the current question with navigation controls
 * to move between questions during a meeting
 */
const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  currentQuestion,
  currentQuestionIndex,
  totalQuestions,
  nextQuestion,
  previousQuestion,
  isFirstQuestion,
  isLastQuestion,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] text-center px-4">
      <div className="max-w-lg w-full space-y-6">
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
            Q{currentQuestionIndex + 1}/{totalQuestions}
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
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">
            {currentQuestion.question}
          </h2>
          <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
            <FileText size={10} className="text-muted-foreground" />
            <span className="capitalize">{currentQuestion.type}</span>
            <span className="text-muted-foreground/60">•</span>
            <span className="text-muted-foreground/60 capitalize">{currentQuestion.category}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionNavigator;
