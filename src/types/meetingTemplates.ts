/**
 * Meeting Templates Types
 * 
 * This file contains type definitions for meeting templates and related structures.
 * These types are used throughout the application for managing meeting templates,
 * sections, and checklist items.
 */

export interface MeetingSection {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  questions: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked?: boolean;
}

export interface MeetingTemplate {
  id: string;
  name: string;
  description: string;
  totalDurationMinutes: number;
  sections: MeetingSection[];
  createdAt: string;
  updatedAt: string;
}

export interface ActiveMeeting {
  templateId: string;
  startTime: number;
  currentSectionIndex: number;
  elapsedTime: number;
  isRunning: boolean;
}
