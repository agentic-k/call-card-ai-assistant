import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { MeetingTemplate } from '@/types/meetingTemplates';
import { Template, getTemplates } from '@/services/templatesFunction';

// Convert DB Template to MeetingTemplate
const convertToMeetingTemplate = (template: Template): MeetingTemplate => {
  const content = template.content as any;
  return {
    id: template.template_id,
    name: template.template_name,
    description: template.description || '',
    totalDurationMinutes: content?.total_duration_minutes || 0,
    sections: content?.sections || [],
    createdAt: template.created_at,
    updatedAt: template.updated_at
  };
};

export const useTemplates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTemplateChanging, setIsTemplateChanging] = useState(false);
  const isInitialized = useRef(false);

  // Extract fetchTemplates function so it can be called manually
  const fetchTemplates = async () => {
    if (!user) {
      setTemplates([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await getTemplates();
      setTemplates(data);
      
      // Only select default template on initial load
      if (!isInitialized.current) {
        const defaultTemplate = data.find(t => t.is_default_template);
        if (defaultTemplate) {
          setActiveTemplateId(defaultTemplate.template_id);
        } else if (data.length > 0 && !activeTemplateId) {
          // If no default template, select the first one
          setActiveTemplateId(data[0].template_id);
        }
        isInitialized.current = true;
      }
    } catch (error) {
      toast.error('Failed to fetch templates');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const handleSelectTemplate = async (templateId: string) => {
    setIsTemplateChanging(true);
    try {
      // Simulate a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      setActiveTemplateId(templateId);
    } finally {
      setIsTemplateChanging(false);
    }
  };

  const getActiveTemplate = () => {
    return templates.find(t => t.template_id === activeTemplateId);
  };

  const getMeetingTemplates = () => {
    return templates.map(convertToMeetingTemplate);
  };

  // Method to manually refresh templates (useful after CRUD operations)
  const refetchTemplates = async () => {
    setIsLoading(true);
    await fetchTemplates();
  };

  return {
    templates,
    activeTemplateId,
    isLoading,
    isTemplateChanging,
    selectTemplate: handleSelectTemplate,
    getActiveTemplate,
    getMeetingTemplates,
    convertToMeetingTemplate,
    setActiveTemplateId,
    refetchTemplates
  };
}; 