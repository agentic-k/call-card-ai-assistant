import { getFunction, postFunction, putFunction } from "@/lib/supabase/functionsClient";
import type { Tables } from "@/integrations/supabase/types";

export type CalendarEvent = Tables<'calendar_events'>;

/**
 * Fetches upcoming calendar events from the 'google-calendar' Supabase Edge Function.
 *
 * @returns A promise that resolves to an array of calendar events.
 * @throws An error if the function invocation fails or returns no data.
 */
export function fetchUpcomingEvents(): Promise<CalendarEvent[]> {
  return getFunction<CalendarEvent[]>('google-calendar/calendar-events');
}

/**
 * Creates a new Google Calendar event.
 *
 * @param eventData The event data to create.
 * @returns A promise that resolves to the created calendar event.
 */
export function createCalendarEvent(eventData: {
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  attendees?: string[];
}): Promise<CalendarEvent> {
  return postFunction<CalendarEvent>('google-calendar/calendar-events', eventData);
}

/**
 * Updates an existing calendar event.
 *
 * @param eventId The ID of the calendar event to update.
 * @param eventData The updated event data.
 * @returns A promise that resolves to the updated calendar event.
 */
export function updateCalendarEvent(eventId: string, eventData: {
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
}): Promise<CalendarEvent> {
  return putFunction<CalendarEvent>(
    `google-calendar/calendar-events/${eventId}`,
    eventData
  );
}

/**
 * Links a template to a calendar event.
 *
 * @param eventId The ID of the calendar event.
 * @param templateId The ID of the template to link.
 * @returns A promise that resolves to the updated calendar event.
 */
export function linkTemplateToEvent(eventId: string, templateId: string): Promise<CalendarEvent> {
  return postFunction<CalendarEvent>(
    `google-calendar/calendar-events/${eventId}/link-template`,
    { templateId }
  );
}

/**
 * Deletes a calendar event.
 *
 * @param eventId The ID of the calendar event to delete.
 * @returns A promise that resolves to the deletion result.
 */
export function deleteCalendarEvent(eventId: string): Promise<{ success: boolean; message: string }> {
  return Promise.resolve({ success: false, message: 'Failed - not implemented' });
  // return deleteFunction<{ success: boolean; message: string }>(
  //   `google-calendar/calendar-events/${eventId}`
  // );
}
