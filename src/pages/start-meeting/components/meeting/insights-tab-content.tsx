import React from 'react';
import { UseCase, PainPoint } from '@/types/agent/call-card-create.types';
import { MeetingSection } from '@/types/meetingTemplates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface InsightData {
  name: string;
  title: string;
  company: string;
  companyDetails: string;
  useCases?: UseCase[];
  painPoints?: PainPoint[];
  sections?: MeetingSection[];
}

// Define a union type for all possible topic types
type TopicType = 'useCase' | 'painPoint' | 'section';
type Topic = (UseCase | PainPoint | MeetingSection) & { type: TopicType };

interface InsightsTabContentProps {
  insightData: InsightData;
  onSelectTopic: (topic: UseCase | PainPoint | MeetingSection, type: TopicType) => void;
}

/**
 * InsightsTabContent component displays all topics in a single list
 * Supports both agent templates (useCases/painPoints) and regular templates (sections)
 */
const InsightsTabContent: React.FC<InsightsTabContentProps> = ({
  insightData,
  onSelectTopic,
}) => {
  // Combine all topic types into a single array
  const allTopics: Topic[] = [
    // Add use cases if they exist
    ...(insightData.useCases || []).map(topic => ({ 
      ...topic, 
      type: 'useCase' as const 
    })),
    
    // Add pain points if they exist
    ...(insightData.painPoints || []).map(topic => ({ 
      ...topic, 
      type: 'painPoint' as const 
    })),
    
    // Add sections if they exist
    ...(insightData.sections || []).map(section => ({
      ...section,
      type: 'section' as const,
      // For consistency with UseCase/PainPoint structure
      title: section.title,
      description: `${section.questions?.length || 0} questions • ${section.durationMinutes} minutes`
    }))
  ];
  
  // Debug log to check what topics are available

  // Helper function to determine badge style based on topic type
  const getBadgeStyle = (type: TopicType) => {
    switch(type) {
      case 'useCase':
        return 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200';
      case 'painPoint':
        return 'bg-red-100 text-red-700 group-hover:bg-red-200';
      case 'section':
        return 'bg-blue-100 text-blue-700 group-hover:bg-blue-200';
      default:
        return '';
    }
  };

  // Helper function to determine dot color based on topic type
  const getDotStyle = (type: TopicType) => {
    switch(type) {
      case 'useCase':
        return 'text-emerald-500';
      case 'painPoint':
        return 'text-red-500';
      case 'section':
        return 'text-blue-500';
      default:
        return '';
    }
  };

  // Helper function to get display label for topic type
  const getTypeLabel = (type: TopicType) => {
    switch(type) {
      case 'useCase':
        return 'Use Case';
      case 'painPoint':
        return 'Pain Point';
      case 'section':
        return 'Section';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-3 p-4">
      {allTopics.length === 0 ? (
        <div className="text-center text-muted-foreground p-4">
          No topics available for this template
        </div>
      ) : (
        allTopics.map((topic, index) => (
          <Button 
            key={topic.id || index} 
            variant="ghost"
            className="w-full p-2 h-auto flex items-start gap-2 group rounded-lg hover:bg-muted/50 transition-colors border border-border/40"
            onClick={() => onSelectTopic(topic, topic.type)}
          >
            <span className={`${getDotStyle(topic.type)} mt-1`}>•</span>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{topic.title}</p>
                <Badge 
                  variant="secondary" 
                  className={`text-[10px] ${getBadgeStyle(topic.type)}`}
                >
                  {getTypeLabel(topic.type)}
                </Badge>
              </div>
              {/* Removed description */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                <ChevronRight className="h-3 w-3" />
                Click to load questions
              </div>
            </div>
          </Button>
        ))
      )}
    </div>
  );
};

export default InsightsTabContent;