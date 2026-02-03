import { Calendar } from "@/components/ui/calendar";
import { CardContent } from "@/components/ui/card";
import { type CalendarEvent } from "@/services/google-calendar-api-function";
import { cn } from "@/lib/utils";
import { DayContent, DayContentProps } from "react-day-picker";

interface CalendarWithEventsProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  events: CalendarEvent[];
}

/**
 * CalendarWithEvents Component
 * 
 * Extends the base Calendar component to show indicators for dates that have events.
 * Dates with events are highlighted with a border.
 */
export function CalendarWithEvents({ date, onSelect, events }: CalendarWithEventsProps) {
  // Create a map of dates that have events
  const eventDates = new Map<string, boolean>();
  events.forEach(event => {
    const eventDate = new Date(event.start_time || "");
    eventDates.set(eventDate.toDateString(), true);
  });

  // Custom day render function to add event indicators
  const renderDay = (props: DayContentProps) => {
    const hasEvents = eventDates.has(props.date.toDateString());
    
    return (
      <div className={cn(
        "relative w-full h-full flex items-center justify-center",
        hasEvents && "border-2 border-primary rounded-sm"
      )}>
        <DayContent {...props} />
      </div>
    );
  };

  return (
    <CardContent className="px-4">
      <Calendar 
        mode="single" 
        selected={date} 
        onSelect={onSelect}
        className="bg-transparent p-0 max-w-[350px] mx-auto" 
        required
        components={{
          DayContent: renderDay
        }}
      />
    </CardContent>
  );
} 