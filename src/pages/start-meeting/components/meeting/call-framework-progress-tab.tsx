import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Clock, Loader2, AlertCircle, Play } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

/**
 * Generic framework question interface
 */
export interface FrameworkQuestion {
  id: string;
  letter: string;
  color: string;
  category: string;
  question: string;
  status: 'completed' | 'in-progress' | 'pending' | 'answered_by_buyer' | 'answered_via_confirmation' | 'partial_or_unclear' | 'unanswered';
  confidence?: number;
  evidence?: string;
}

/**
 * Generic framework interface that can handle any custom framework
 */
export interface CallFramework {
  framework_name: string;
  framework_content: Array<{
    title: string;
    question: string;
  }>;
  framework_description: string;
}

/**
 * Framework progress interface
 */
export interface FrameworkProgress {
  name: string;
  progressPercentage: number;
  completedQuestions: number;
  totalQuestions: number;
  questions: FrameworkQuestion[];
}

interface CallFrameworkProgressTabProps {
  salesFramework?: CallFramework | null;
  onQuestionStatusUpdate?: (questionId: string, status: FrameworkQuestion['status']) => void;
  progress?: FrameworkProgress | null;
  customColors?: string[]; // Optional custom colors for framework letters
  customLetters?: string[]; // Optional custom letters for framework categories
  isScoring?: boolean; // Whether the framework is currently being scored
  onManualScore?: () => Promise<void>; // Callback for manual scoring trigger
}

/**
 * Call Framework Progress Tab Component
 * 
 * A generic component that can display progress for any sales framework (MEDDIC, BANT, SPIN, etc.)
 * Displays the overall progress of framework questions asked during the meeting.
 * Shows which questions have been completed, are in progress, or are pending.
 * 
 * Features:
 * - Dynamic data from any custom framework
 * - Progress bar showing completion percentage
 * - Individual question cards with status indicators
 * - Color-coded categories matching framework methodology
 * - Questions ordered with un-answered questions on top
 * - Compact format showing "Category: description"
 * - Loading states and error handling
 * - Real-time status updates
 * - Responsive design with proper spacing
 * - Customizable colors and letters for different frameworks
 */

/**
 * Returns the appropriate status icon based on the question status
 * @param status - The status of the question (completed, in-progress, pending)
 * @returns JSX element representing the status icon
 */
const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
    case "answered_by_buyer":
    case "answered_via_confirmation":
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
    case "in-progress":
    case "partial_or_unclear":
      return <Clock className="h-3.5 w-3.5 text-yellow-600" />;
    case "pending":
    case "unanswered":
    default:
      return <Circle className="h-3.5 w-3.5 text-gray-400" />;
  }
};

// Helper function to convert any framework to progress format
const convertFrameworkToProgress = (
  framework: CallFramework, 
  customColors?: string[], 
  customLetters?: string[]
): FrameworkProgress => {
  const defaultColors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-red-500', 'bg-indigo-500',
    'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
  ];
  
  const defaultLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  
  const colors = customColors || defaultColors;
  const letters = customLetters || defaultLetters;
  
  const questions: FrameworkQuestion[] = framework.framework_content.map((item, index) => {
    // Get the status from the framework content if available
    const status = (framework as any).questions?.[index]?.status || 'unanswered';
    const confidence = (framework as any).questions?.[index]?.confidence;
    const evidence = (framework as any).questions?.[index]?.evidence;

    return {
      id: `framework-${index}`,
      letter: letters[index] || String.fromCharCode(65 + index), // Fallback to A, B, C, etc.
      color: colors[index] || 'bg-gray-500',
      category: item.title,
      question: item.question,
      status: status as FrameworkQuestion['status'],
      confidence,
      evidence
    };
  });

  return {
    name: framework.framework_name,
    progressPercentage: 0,
    completedQuestions: 0,
    totalQuestions: questions.length,
    questions
  };
};

/**
 * Call Framework Progress Tab Component
 * 
 * Renders the framework progress interface showing:
 * - Overall completion progress with percentage
 * - Individual question cards with status indicators
 * - Color-coded categories for easy identification
 * - Dynamic data from any custom framework with loading and error states
 */
const CallFrameworkProgressTab: React.FC<CallFrameworkProgressTabProps> = ({ 
  salesFramework,
  onQuestionStatusUpdate,
  progress,
  customColors,
  customLetters,
  isScoring = false,
  onManualScore
}) => {
  const [updatingQuestion, setUpdatingQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState<FrameworkProgress | null>(null);
  
  const isLoading = !salesFramework && !progress;
  
  // Convert sales framework to progress if no progress provided
  const displayProgress = useMemo(() => {
    if (progress) return progress;
    if (salesFramework && !localProgress) {
      return convertFrameworkToProgress(salesFramework, customColors, customLetters);
    }
    return localProgress;
  }, [progress, salesFramework, localProgress, customColors, customLetters]);

  // Display question details when clicked
  const handleQuestionClick = (questionId: string, evidence?: string) => {
    if (!evidence) return;
    
    setUpdatingQuestion(questionId);
    
    // Show evidence in a toast
    toast.info(
      <div className="space-y-2">
        <p className="font-medium text-sm">Evidence:</p>
        <p className="text-xs">{evidence}</p>
      </div>,
      {
        duration: 5000,
        id: `evidence-${questionId}`
      }
    );
    
    setTimeout(() => {
      setUpdatingQuestion(null);
    }, 500);
  };

  // Sort questions: unanswered first, then partial/in-progress, then answered/completed
  const sortedQuestions = displayProgress?.questions.sort((a, b) => {
    const getStatusOrder = (status: string): number => {
      switch (status) {
        case 'completed':
        case 'answered_by_buyer':
          return 4;
        case 'answered_via_confirmation':
          return 3;
        case 'in-progress':
        case 'partial_or_unclear':
          return 2;
        case 'pending':
          return 1;
        case 'unanswered':
        default:
          return 0;
      }
    };
    return getStatusOrder(a.status) - getStatusOrder(b.status);
  }) || [];

  // Loading state
  if (isLoading) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <div className="mb-3">
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-4 w-24 flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-1.5 w-full" />
              </div>
              <Skeleton className="h-3 w-16 flex-shrink-0" />
            </div>
          </div>
          {Array.from({ length: 7 }, (_, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-8 h-8 rounded" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    );
  }

  // Error state
  if (error) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4">
          <Card className="border-red-200 bg-red-50/30">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <h3 className="font-medium text-red-800 mb-2">Failed to Load Framework Progress</h3>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  // No data state
  if (!displayProgress) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No framework data available</p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Header Section with Progress - Combined in one line */}
        <div className="mb-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-foreground flex-shrink-0">
                    {displayProgress.name}
                  </h1>
                  {isScoring && (
                    <div className="flex items-center gap-1 text-xs text-yellow-600">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Analyzing call...</span>
                    </div>
                  )}
                </div>
                {onManualScore && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onManualScore}
                    disabled={isScoring}
                    className="h-7 px-2 text-xs bg-background hover:bg-accent"
                  >
                    <div className="flex items-center gap-1">
                      {isScoring ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      <span>Run Analysis</span>
                    </div>
                  </Button>
                )}
              </div>
              <div className="flex-1">
                <Progress value={displayProgress.progressPercentage} className="h-1.5" />
              </div>
              <div className="text-xs text-muted-foreground flex-shrink-0">
                {displayProgress.completedQuestions}/{displayProgress.totalQuestions} ({displayProgress.progressPercentage}%)
              </div>
            </div>
            <div className="text-xs text-muted-foreground mb-2 italic">
              Auto-analysis runs every 5 minutes during active calls
            </div>
        </div>

        {/* Framework Questions List */}
        <div className="space-y-1.5">
          {sortedQuestions.map((item) => (
            <Card
              key={item.id}
              className={`transition-all ${
                item.status === "completed" || item.status === "answered_by_buyer"
                  ? "border-green-200 bg-green-50/30"
                  : item.status === "answered_via_confirmation"
                    ? "border-blue-200 bg-blue-50/30"
                    : item.status === "in-progress" || item.status === "partial_or_unclear"
                      ? "border-yellow-200 bg-yellow-50/30"
                      : item.status === "unanswered"
                        ? "border-gray-200 bg-gray-50/30"
                        : ""
              }`}
            >
              <CardContent className="p-2.5">
                <div className="flex items-center gap-2.5">
                  {/* Category Letter Badge */}
                  <div
                    className={`${item.color} text-white rounded w-7 h-7 flex items-center justify-center font-bold text-xs flex-shrink-0`}
                  >
                    {item.letter}
                  </div>

                  {/* Question Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-xs leading-relaxed">
                        {item.category}: {item.question}
                      </h3>
                      <div className="flex items-center gap-1.5 ml-2">
                        {updatingQuestion === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <button
                            onClick={() => handleQuestionClick(item.id, item.evidence)}
                            className="flex items-center hover:bg-muted/50 rounded p-1 transition-colors"
                            disabled={!item.evidence}
                            title={item.evidence ? "Click to see evidence" : "No evidence available"}
                          >
                            <div className="flex items-center gap-1">
                              {getStatusIcon(item.status)}
                              <span className="text-xs font-medium">
                                {item.status === 'answered_by_buyer' ? 'Answered' :
                                 item.status === 'answered_via_confirmation' ? 'Confirmed' :
                                 item.status === 'partial_or_unclear' ? 'Partial' :
                                 item.status === 'unanswered' ? 'Not Asked' :
                                 item.status === 'completed' ? 'Complete' :
                                 item.status === 'in-progress' ? 'In Progress' : 'Pending'}
                              </span>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

export default CallFrameworkProgressTab;
