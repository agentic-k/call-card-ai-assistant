import * as React from "react"
import { Card } from "@/components/ui/card";
import { type CalendarEvent, fetchUpcomingEvents } from "@/services/google-calendar-api-function";
import { EventList } from "./components/event-list";
import { CalendarWithEvents } from "./components/calendar-with-events";
import { CreateEventDialog } from "./components/create-event-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarStatusBar } from "./components/calendar-status-bar";

/**
 * GCalendarPage Component
 * 
 * Calendar page that displays calendar view and event listings.
 * Manages the state and data fetching for calendar events.
 * Events are sorted by start time and filtered by selected date.
 * Includes a status bar showing Google Calendar connection state.
 */
export default function GCalendarPage() {
  const { user, linkGoogleCalendar, loading } = useAuth();
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = React.useState(false);
  const [calendarPermission, setCalendarPermission] = React.useState<'granted' | 'denied' | 'pending'>('pending');
  const [isChecking, setIsChecking] = React.useState(true);
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null);

  // Removed permission checking functions as they're now in CalendarStatusBar

  // Check permissions and fetch events when component mounts
  React.useEffect(() => {
    fetchCalendarEvents();
  }, []);

  // Function to fetch and sort calendar events
  const fetchCalendarEvents = async () => {
    setIsLoadingEvents(true);
    setError(null);
    try {
      const events = await fetchUpcomingEvents();
      // Sort events by start time
      const sortedEvents = sortEventsByTime(events);
      setCalendarEvents(sortedEvents);
    } catch (err: any) {
      console.error("Error fetching calendar events:", err);
      // Set a user-friendly error message
      setError("Could not load calendar events. Please check your connection and try again.");
      // Show empty array to prevent UI from breaking
      setCalendarEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // Sort events by start time
  const sortEventsByTime = (events: CalendarEvent[]): CalendarEvent[] => {
    return [...events].sort((a, b) => {
      // Handle all-day events (no start time) - place them at the start of the day
      if (!a.start_time) return -1;
      if (!b.start_time) return 1;

      const timeA = new Date(a.start_time).getTime();
      const timeB = new Date(b.start_time).getTime();
      return timeA - timeB;
    });
  };

  // Filter and sort events for selected date
  const getEventsForSelectedDate = () => {
    if (!date) return [];

    // Filter events for the selected date
    const filteredEvents = calendarEvents.filter(event => {
      if (!event.start_time) return false;

      const eventDate = new Date(event.start_time);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });

    // Return sorted events
    return sortEventsByTime(filteredEvents);
  };



  return (
    <div className="container mx-auto">
      {/* Calendar Status Bar */}
      <CalendarStatusBar />
      
      {/* Page Header */}
      <div className="bg-background border-b p-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">
            Calendar
          </h2>
          <div className="flex items-center gap-4">
            {/* Create Event Button */}
            <Button onClick={() => setIsCreateEventOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        </div>
      </div>

      {/* Create Event Dialog */}
      <CreateEventDialog
        isOpen={isCreateEventOpen}
        onOpenChange={setIsCreateEventOpen}
        onEventCreated={fetchCalendarEvents}
      />


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-border">
        {/* Calendar Section */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <div className="flex justify-center p-4">
              <CalendarWithEvents
                date={date}
                onSelect={setDate}
                events={calendarEvents}
              />
            </div>
          </Card>
        </div>

        {/* Events Section */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <EventList
              date={date}
              events={getEventsForSelectedDate()}
              isLoading={isLoadingEvents}
              error={error}
              onRefresh={fetchCalendarEvents}
            />
          </Card>
        </div>
      </div>
    </div>
  );
} 