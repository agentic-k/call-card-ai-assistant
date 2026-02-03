import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createCallPack } from '@/services/agentApiFunction';
import { createTemplate } from '@/services/templatesFunction';
import { MeetingTemplate } from '@/types/meetingTemplates';
import { AgentProcessStatusItem } from './agent-process-status-table';
import { Profile } from '@/services/profile-api-function';

interface FormData {
  linkedinUrl: string;
  companyUrl: string;
  callCardContext: string;
}

export const useDataCollection = () => {
  const [scrapeStatuses, setScrapeStatuses] = useState<AgentProcessStatusItem[]>([
    { type: "call-call", status: "not-started", data: null }
  ]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const generateCallCard = async (formData: FormData, profile?: Profile | null) => {
    setScrapeStatuses(prev => prev.map(item => 
      item.type === "call-call" ? { ...item, status: "in-progress" } : item
    ));

    try {
      if (!profile) {
        throw new Error("User profile not available.");
      }
      
      const companyData = profile.company_data as any;
      const clientCompanyUrl = profile.company_url || companyData?.website_url || companyData?.website || companyData?.url;

      if (!clientCompanyUrl) {
        // TODO: In the future, this should be a required field in the user's profile.
        // For now, we can throw an error or use a default.
        throw new Error("Client company URL not found in profile.");
      }

      // The agent API will handle scraping and data processing.
      // We pass the URLs and context directly.
      const meetingTemplate: MeetingTemplate = await createCallPack(
        clientCompanyUrl,
        formData.linkedinUrl,
        formData.companyUrl,
        formData.callCardContext
      );
      
      const newTemplate = await createTemplate({
        template_name: meetingTemplate.name,
        description: meetingTemplate.description,
        content: {
          total_duration_minutes: meetingTemplate.totalDurationMinutes,
          sections: meetingTemplate.sections
        } as any,
        team_id: null,
        user_id: user!.id,
        is_default_template: false
      });
      
      setTemplateId(newTemplate.template_id);
      
      setScrapeStatuses(prev => prev.map(item => 
        item.type === "call-call" ? { 
          ...item, 
          status: "success", 
          data: { 
            template: newTemplate,
            meetingTemplate: meetingTemplate
          } 
        } : item
      ));
      
      toast({
        title: "Call Card Generated",
        description: "Your Call Card has been generated and saved as a template.",
        variant: "default"
      });

      return newTemplate;
    } catch (error) {
      console.error('Call Card generation error:', error);
      
      setScrapeStatuses(prev => prev.map(item => 
        item.type === "call-call" ? { ...item, status: "failed" } : item
      ));
      
      toast({
        title: "Call Card Generation Error",
        description: error instanceof Error ? error.message : "Failed to generate Call Card",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleRetry = async (type: "linkedin" | "company" | "call-call", formData: FormData, profile?: Profile | null) => {
    if (type === "call-call") {
       await generateCallCard(formData, profile);
    }
  };

  const startDataCollection = async (formData: FormData, profile?: Profile | null) => {
    setIsSubmitting(true);
    
    setScrapeStatuses([
      { type: "call-call", status: "not-started", data: null }
    ]);

    await generateCallCard(formData, profile);
    
    setIsSubmitting(false);
  };

  const isTemplateCreated = () => {
    const callCardStatus = scrapeStatuses.find(status => status.type === "call-call");
    return callCardStatus?.status === "success" && !!templateId;
  };

  return {
    scrapeStatuses,
    templateId,
    isSubmitting,
    handleRetry,
    startDataCollection,
    isTemplateCreated
  };
}; 