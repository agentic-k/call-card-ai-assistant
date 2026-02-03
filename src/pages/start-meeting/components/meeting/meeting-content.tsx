import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MeetingSection, ChecklistItem } from '@/types/meetingTemplates';
import { Template } from '@/services/templatesFunction';
import { UseCase, PainPoint } from '@/types/agent/call-card-create.types';
import { ClassifyTextResponse } from '@/types/text-classifier';
import { leadScoring } from '@/services/agentApiFunction';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// Import components
import LiveTab from './live-tab';
import MeetingHeader from './meeting-header';
import ActionTabContent from './action-tab-content';
import InsightsTabContent from './insights-tab-content';
import CallFrameworkProgressTab, { CallFramework, FrameworkProgress } from './call-framework-progress-tab';
import MeetingTabs from './meeting-tabs';
import TopicDetectionDisplay, { DetectedTopic } from './topic-detection-display';
import { TopicQueueDisplay } from '@/components/meeting/topic-queue-display';
import { useTopicQueue } from '@/hooks/useTopicQueue';

interface MeetingContentProps {
  activeTemplate: Template | null;
  currentSection: MeetingSection | null;
  sectionIndex: number;
  totalSections: number;
  timer: number;
  sectionTimer?: number;
  isTimerRunning: boolean;
  isMeetingComplete: boolean;
  checklist: ChecklistItem[];
  completedItems: ChecklistItem[];
  isCompletedOpen: boolean;
  onEndMeeting: () => void;
  onPreviousSection: () => void;
  onNextSection: () => void;
  completedQuestions: Array<{ id: string; text: string; status: 'asked' | 'skipped' }>;
  transcriptEntries: Array<{ timestamp: number; text: string; isFinal: boolean; speaker?: string }>;
  activeMeeting: { startTime: number; isRunning: boolean } | null;
  reconnectAttempt?: number;
  maxReconnectAttempts?: number;
  isTranscribing?: boolean;
  isUserTranscribing?: boolean;
  isSpeakerTranscribing?: boolean;
  currentClassification?: ClassifyTextResponse | null;
  isClassifying?: boolean;
  frameworkProgress?: FrameworkProgress | null;
  onFrameworkQuestionUpdate?: (questionId: string, status: 'completed' | 'in-progress' | 'pending') => void;
  connectionStatus?: 'pending' | 'active' | 'failed' | 'reconnecting';
  onPauseResume?: () => void;
  isPaused?: boolean;
}

// Define topic type at the top level
type TopicType = UseCase | PainPoint | MeetingSection;

/**
 * Custom hook for navigating through agent template topics
 */
const useTopicNavigation = (topic: TopicType | null) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const questions = topic?.questions || [];
  
  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  return {
    currentQuestionIndex,
    nextQuestion,
    previousQuestion,
    isFirstQuestion: currentQuestionIndex === 0,
    isLastQuestion: currentQuestionIndex === questions.length - 1,
  };
};

/**
 * Checks if the template is an agent template by looking for useCases property
 */
const isAgentTemplate = (template: Template): boolean => {
  const content = template.content as any;
  // Debug log to help identify template structure
  return content && content.useCases !== undefined;
};

/**
 * MeetingContent is the main container component for the meeting interface
 * It orchestrates all the child components and manages the meeting state
 */
const MeetingContent: React.FC<MeetingContentProps> = ({
  activeTemplate,
  currentSection,
  sectionIndex,
  totalSections,
  timer,
  sectionTimer,
  isTimerRunning,
  isMeetingComplete,
  checklist,
  completedItems,
  isCompletedOpen,
  onEndMeeting,
  onPreviousSection,
  onNextSection,
  completedQuestions,
  transcriptEntries,
  activeMeeting,
  reconnectAttempt = 0,
  maxReconnectAttempts = 5,
  isTranscribing = false,
  isUserTranscribing = false,
  isSpeakerTranscribing = false,
  currentClassification = null,
  isClassifying = false,
  frameworkProgress = null,
  onFrameworkQuestionUpdate,
  connectionStatus = 'pending',
  onPauseResume,
  isPaused = false,
}) => {
  // Get content based on template type
  const content = activeTemplate?.content as any;
  const isAgent = isAgentTemplate(activeTemplate!);
  
  
  
  // State for tracking final transcript entries for classification
  const [finalTranscriptEntries, setFinalTranscriptEntries] = useState<Array<{text: string, timestamp: number}>>([]);
  
  // State for detected topics with percentages
  const [detectedTopics, setDetectedTopics] = useState<DetectedTopic[]>([]);
  
  // Define topic labels for classification
  const [topicLabels, setTopicLabels] = useState<Array<{label: string, description: string}>>([
    {
      "label": "General Conversation",
      "description": "This topic is general conversation."
    }
  ]);
  
  // Dynamically generate topic labels from template content
  useEffect(() => {
    if (activeTemplate?.content) {
      const content = activeTemplate.content as any;
      const labels = [
        {
          "label": "General Conversation",
          "description": "This topic is general conversation."
        }
      ];
      
      // Add use cases to labels
      if (content.useCases && Array.isArray(content.useCases)) {
        content.useCases.forEach((useCase: UseCase) => {
          labels.push({
            label: `Use case: ${useCase.title}`,
            description: useCase.description || `This topic is about ${useCase.title}.`
          });
        });
      }
      
      // Add pain points to labels
      if (content.painPoints && Array.isArray(content.painPoints)) {
        content.painPoints.forEach((painPoint: PainPoint) => {
          labels.push({
            label: `Pain point: ${painPoint.title}`,
            description: painPoint.description || `This topic is about ${painPoint.title}.`
          });
        });
      }
      
      setTopicLabels(labels);
      
    }
  }, [activeTemplate]);
  
  // Send topic labels to electron process whenever they change
  useEffect(() => {
    // Make the topic labels available to the parent component for classification
    if (window.electron && 'setTopicLabels' in window.electron && topicLabels.length > 0) {
      (window.electron as any).setTopicLabels(topicLabels);
    } else {
      console.error('❌ Cannot send topic labels - electron not available or no labels');
    }
  }, [topicLabels]);

  // State for active tab
  const [activeTab, setActiveTab] = useState('call');
  const [isScoring, setIsScoring] = useState(false);

  // Track final transcript entries for classification
  useEffect(() => {
    const newFinalEntries = transcriptEntries
      .filter(entry => entry.isFinal)
      .map(entry => ({ text: entry.text, timestamp: entry.timestamp }));
      
    if (newFinalEntries.length > finalTranscriptEntries.length) {
      setFinalTranscriptEntries(newFinalEntries);
    }
  }, [transcriptEntries, finalTranscriptEntries]);

  // Function to get transcript text from entries
  const getTranscriptText = useCallback(() => {
    return transcriptEntries
      .filter(entry => entry.isFinal)
      .map(entry => entry.text)
      .join(' ');
  }, [transcriptEntries]);

  // Function to manually trigger scoring
  // Helper function to update framework progress with lead scoring results
  const updateFrameworkWithScoringResults = useCallback((
    framework: CallFramework,
    scoringResults: any,
    onUpdate?: (questionId: string, status: 'completed' | 'in-progress' | 'pending') => void
  ) => {
    if (!scoringResults?.questions || !onUpdate) return;
    
    // Check if questions is an array of objects with status property
    const hasStatusProperty = scoringResults.questions.length > 0 && 
                            typeof scoringResults.questions[0] === 'object' && 
                            'status' in scoringResults.questions[0];
    
    if (hasStatusProperty) {
      // Create a map of questions to their responses
      const questionResponseMap = new Map();
      scoringResults.questions.forEach((q: any) => {
        questionResponseMap.set(q.question, q);
      });
      
      // Update each question in the framework
      framework.framework_content.forEach((item, index) => {
        const questionId = `framework-${index}`;
        const response = questionResponseMap.get(item.question);
        
        if (response) {
          // Map API status values to UI status values
          let uiStatus: 'completed' | 'in-progress' | 'pending';
          
          // Convert API statuses to UI statuses
          switch (response.status) {
            case 'answered_by_buyer':
            case 'answered_via_confirmation':
              uiStatus = 'completed';
              break;
            case 'partial_or_unclear':
              uiStatus = 'in-progress';
              break;
            case 'unanswered':
            default:
              uiStatus = 'pending';
          }
          
          // Update with the mapped status
          onUpdate(questionId, uiStatus);
        }
      });
      
      return true;
    }
    
    return false;
  }, []);

  const handleManualScoring = useCallback(async () => {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Please sign in to use this feature');
      return;
    }
    
    const framework = activeTemplate?.sales_framework as unknown as CallFramework | undefined;
    
    if (!framework || !transcriptEntries.length) {
      toast.error('No framework or transcript available');
      return;
    }

    try {
      setIsScoring(true);
      const transcript = getTranscriptText();
      
      // Extract questions from framework content
      const questions = framework.framework_content.map(item => item.question);
      
      // Format transcript into turns format required by lead-scoring API
      const transcriptTurns = {
        turns: transcriptEntries
          .filter(entry => entry.isFinal)
          .map((entry, index) => ({
            speaker: entry.speaker || 'Unknown',
            text: entry.text
          }))
      };
      
      const result = await leadScoring(
        framework.framework_name,
        questions,
        transcriptTurns
      );

      // Use the helper function to update the framework progress
      const updated = updateFrameworkWithScoringResults(framework, result, onFrameworkQuestionUpdate);
      
      if (updated) {
        // Count how many questions were answered or partially answered
        const answeredCount = result.questions.filter((q: any) => 
          q.status === 'answered_by_buyer' || q.status === 'answered_via_confirmation'
        ).length;
        
        const partialCount = result.questions.filter((q: any) => 
          q.status === 'partial_or_unclear'
        ).length;
        
        if (answeredCount > 0 || partialCount > 0) {
          toast.success(`Framework analysis completed: ${answeredCount} answered, ${partialCount} partially answered`);
        } else {
          toast.info('No new questions were identified as answered');
        }
      } else if (result?.questions) {
        // Handle the case where questions is an array of strings
        
        // Create a framework progress object from the result
        const frameworkProgress = {
          name: result.framework || 'MEDDIC',
          questions: result.questions.map((q: string, index: number) => ({
            id: `framework-${index}`,
            question: q,
            status: 'unanswered' as const,
            letter: String.fromCharCode(65 + index),
            color: `bg-blue-${(index % 5) * 100 + 500}`,
            category: result.framework || 'MEDDIC',
            confidence: 0,
            evidence: ''
          }))
        };
        
        // Update the framework with the new questions
        if (frameworkProgress.questions.length > 0) {
          // Only update if we have the update callback
          if (onFrameworkQuestionUpdate) {
            // Replace the current framework questions with the new ones
            frameworkProgress.questions.forEach((q, index) => {
              if (index < framework.framework_content.length) {
                const questionId = `framework-${index}`;
                onFrameworkQuestionUpdate(questionId, 'pending');
              }
            });
          }
          
          toast.success(`Framework loaded with ${frameworkProgress.questions.length} questions`);
        } else {
          toast.info('No questions available in the framework');
        }
      } else {
        toast.info('No question analysis available');
      }
    } catch (error: any) {
      
      // Check if there's a more specific error message from the API
      let errorMessage = 'Failed to analyze call progress';
      if (error.response?.data?.error) {
        errorMessage += `: ${error.response.data.error}`;
      }
      if (error.response?.data?.details) {
        errorMessage += ` - ${error.response.data.details}`;
      }
      
      // If transcript is too short, provide a more helpful message
      const transcriptLength = transcriptEntries.filter(entry => entry.isFinal).length;
      if (transcriptLength < 5) {
        errorMessage = 'Not enough transcript data for analysis. Continue your conversation and try again later.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsScoring(false);
    }
  }, [activeTemplate?.sales_framework, transcriptEntries, getTranscriptText, onFrameworkQuestionUpdate]);


  // Periodic scoring effect
  useEffect(() => {
    const framework = activeTemplate?.sales_framework as unknown as CallFramework | undefined;
    if (!activeMeeting?.isRunning || !framework || !transcriptEntries.length) return;

    const scoringInterval = setInterval(async () => {
      try {
        setIsScoring(true);
        const transcript = getTranscriptText();
        
        // Extract questions from framework content
        const questions = framework.framework_content.map(item => item.question);
        
        // Format transcript into turns format required by lead-scoring API
        const transcriptTurns = {
          turns: transcriptEntries
            .filter(entry => entry.isFinal)
            .map((entry, index) => ({
              speaker: entry.speaker || 'Unknown',
              text: entry.text
            }))
        };
        
        const result = await leadScoring(
          framework.framework_name,
          questions,
          transcriptTurns
        );

        // Use the helper function to update the framework progress if we have the update callback
        if (onFrameworkQuestionUpdate) {
          updateFrameworkWithScoringResults(framework, result, onFrameworkQuestionUpdate);
        }
      } catch (error: any) {
        
        // Only show error toast for non-transcript-length issues
        const transcriptLength = transcriptEntries.filter(entry => entry.isFinal).length;
        if (transcriptLength >= 5) {
          let errorMessage = 'Failed to analyze call progress';
          if (error.response?.data?.error) {
            errorMessage += `: ${error.response.data.error}`;
          }
          toast.error(errorMessage, { id: 'scoring-error', duration: 3000 });
        }
      } finally {
        setIsScoring(false);
      }
    }, 300000); // Run every 5 minutes

    return () => clearInterval(scoringInterval);
  }, [activeMeeting?.isRunning, activeTemplate?.sales_framework, transcriptEntries, getTranscriptText, onFrameworkQuestionUpdate]);
  
  // Initialize topic queue
  const { addTopic, getRecentTopics, getTimeRemaining } = useTopicQueue();

  // Update detected topics with new classification
  useEffect(() => {
    if (currentClassification) {
      // Add topic to queue when detected
      addTopic(currentClassification.label);

      setDetectedTopics(prev => {
        const now = Date.now();
        const TOPIC_EXPIRY = 5 * 60 * 1000; // 5 minutes
        
        // Remove expired topics (older than 5 minutes)
        const activeTopics = prev.filter(topic => 
          now - topic.lastDetected < TOPIC_EXPIRY
        );
        
        const existingTopic = activeTopics.find(topic => 
          topic.label === currentClassification.label
        );
        
        let updatedTopics;
        if (existingTopic) {
          // Update existing topic
          updatedTopics = activeTopics.map(topic => 
            topic.id === existingTopic.id 
              ? {
                  ...topic,
                  confidence: (topic.confidence * topic.detectionCount + currentClassification.score) / (topic.detectionCount + 1),
                  detectionCount: topic.detectionCount + 1,
                  lastDetected: now
                }
              : topic
          );
          } else {
            // Add new topic
            const newTopic: DetectedTopic = {
              id: currentClassification.label,
              label: currentClassification.label,
              confidence: currentClassification.score,
              detectionCount: 1,
              lastDetected: now
            };
          
          updatedTopics = [...activeTopics, newTopic];
        }
        
        // Sort by confidence and detection count, keep top 3
        return updatedTopics
          .sort((a, b) => 
            b.confidence - a.confidence || 
            b.detectionCount - a.detectionCount
          )
          .slice(0, 3);
      });
    }
  }, [currentClassification]);

  
  

  if (!activeTemplate) return null;

  return (
    <div className="meeting-content-container h-full flex flex-col relative overflow-hidden rounded-lg bg-background/95 backdrop-blur-sm">
      {/* Header Component */}
      <MeetingHeader timer={timer} onEndMeeting={onEndMeeting} />

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full pt-7 pb-12">
        {/* Scrollable Content Area */}
        <div className="flex-1 relative overflow-hidden">
          <TabsContent value="call" className="absolute inset-0 bg-background/50 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Topic Detection Display */}
                <TopicDetectionDisplay 
                  topics={detectedTopics}
                  isClassifying={isClassifying}
                  maxTopics={3}
                />

                {/* Topic Queue Display */}
                <TopicQueueDisplay className="mt-4" />
                
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="actions" className="absolute inset-0 bg-background/50 overflow-hidden">
            <ScrollArea className="h-full">
              {/* Action Tab Content Component */}
              <ActionTabContent
                callSummary=""
                nextStep=""
                onEndMeeting={onEndMeeting}
              />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="insights" className="absolute inset-0 bg-background/50 overflow-auto">
            {/* Insights Tab Content Component */}
            <InsightsTabContent 
              insightData={{
                name: "",
                title: "",
                company: "",
                companyDetails: "",
                useCases: content?.useCases || [],
                painPoints: content?.painPoints || [],
                sections: content?.sections || []
              }}
              onSelectTopic={() => {}}
            />
          </TabsContent>

          <TabsContent value="framework" className="absolute inset-0 bg-background/50 overflow-hidden">
            {/* Call Framework Progress Tab Content Component */}
            <CallFrameworkProgressTab 
              salesFramework={activeTemplate?.sales_framework as unknown as CallFramework}
              progress={frameworkProgress}
              onQuestionStatusUpdate={onFrameworkQuestionUpdate}
              customColors={undefined}
              customLetters={undefined}
              isScoring={isScoring}
              onManualScore={handleManualScoring}
            />
          </TabsContent>

          <TabsContent value="transcript" className="absolute inset-0 bg-background/50 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                <LiveTab
                  transcriptEntries={transcriptEntries}
                  meetingStartTime={activeMeeting?.startTime}
                  isTranscribing={isTranscribing}
                  isUserTranscribing={isUserTranscribing}
                  isSpeakerTranscribing={isSpeakerTranscribing}
                  currentClassification={currentClassification}
                  isClassifying={isClassifying}
                  connectionStatus={connectionStatus}
                  reconnectAttempt={reconnectAttempt}
                  maxReconnectAttempts={maxReconnectAttempts}
                  onPauseResume={onPauseResume}
                  isPaused={isPaused}
                />
              </div>
            </ScrollArea>
          </TabsContent>

        </div>

        {/* Tabs Navigation Component */}
        <MeetingTabs salesFramework={activeTemplate?.sales_framework as unknown as CallFramework} />
      </Tabs>
    </div>
  );
};

export default MeetingContent;