
import { MeetingTemplate, MeetingSection } from './meetingTemplates';

export interface SupabaseMeetingTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  total_duration_minutes: number;
  sections: MeetingSection[]; // This is crucial - we're explicitly typing sections as MeetingSection[]
  created_at: string;
  updated_at: string;
}

export interface SupabaseMeetingRecord {
  id: string;
  user_id: string;
  template_id: string;
  template_snapshot: MeetingTemplate;
  start_time: string;
  end_time: string | null;
  total_duration_seconds: number | null;
  section_data: {
    sectionIndex: number;
    timeSpentSeconds: number;
    completedItems: string[];
  }[];
  created_at: string;
  updated_at: string;
}
