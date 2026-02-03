import { AlertCircle, Mail, User, Users, Calendar as CalendarIcon, Settings, Edit, Plus, Trash2, FileText } from "lucide-react";
import { MeetingStartButton } from "./meeting-start-button";
import { EventEditDialog } from "./event-edit-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type CalendarEvent } from "@/services/google-calendar-api-function";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState } from "react";
import { useTemplates } from "@/hooks/useTemplates";
import { linkTemplateToEvent, deleteCalendarEvent } from "@/services/google-calendar-api-function";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import CallCardEditor from '@/components/meeting/call-card-editor';
import { CallCard } from '@/types/agent/call-card-create.types';
import { createTemplate, updateTemplate } from '@/services/templatesFunction';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

interface EventListProps {
  date: Date | undefined;
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

interface Attendee {
  email: string;
  responseStatus?: string;
  organizer?: boolean;
}

/**
 * TemplateSelectionDialog Component
 * 
 * Shows a dialog for selecting a template to associate with a calendar event.
 * Allows users to choose from their available templates and updates the event.
 */
function TemplateSelectionDialog({
  eventId,
  onTemplateLinked
}: {
  eventId: string;
  onTemplateLinked: (templateId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const { templates, isLoading, refetchTemplates } = useTemplates();
  const { user } = useAuth();

  const navigate = useNavigate();

  /**
   * Handles the template linking process
   * Updates the calendar event with the selected template_id in the database
   */
  const handleLinkTemplate = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select a template");
      return;
    }

    setIsUpdating(true);
    try {
      await linkTemplateToEvent(eventId, selectedTemplateId);

      toast.success("Template linked successfully");
      onTemplateLinked(selectedTemplateId);
      setOpen(false);
      setSelectedTemplateId("");
    } catch (error) {
      console.error('Error linking template:', error);
      toast.error("Failed to link template to event");
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handles creating a new template and linking it to the event
   */
  const handleCreateTemplate = async (template: CallCard, salesFramework?: any) => {
    if (!user) {
      toast.error('You must be logged in to create templates');
      return;
    }

    try {
      const loadingToast = toast.loading('Creating template and linking to event...');
      
      const content = {
        useCases: template.useCases,
        painPoints: template.painPoints
      };

      // Create new template
      const savedTemplate = await createTemplate({
        template_name: template.name,
        description: template.description,
        content: content as unknown as Json,
        sales_framework: salesFramework as any,
        user_id: user.id,
        is_default_template: false,
        status: 'ACTIVE'
      });

      // Link the new template to the event
      await linkTemplateToEvent(eventId, savedTemplate.template_id);

      // Refresh templates list
      await refetchTemplates();

      toast.dismiss(loadingToast);
      toast.success('Template created and linked successfully');
      onTemplateLinked(savedTemplate.template_id);
      setOpen(false);
      setIsCreatingTemplate(false);
    } catch (error) {
      console.error('Error creating template:', error);
      toast.dismiss();
      toast.error('Failed to create template');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-accent"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Template to Event</DialogTitle>
          <DialogDescription>
            Choose a template to associate with this calendar event. This will enable quick access to edit and start meetings with the selected template.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="template-select" className="text-sm font-medium">
              Select Template
            </label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading Callcard..." : "Choose a Callcard"} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.template_id} value={template.template_id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{template.template_name}</span>
                      {template.description && (
                        <span className="text-xs text-muted-foreground">{template.description?.slice(0, 50)}...</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setIsCreatingTemplate(true)}
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New Template
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLinkTemplate}
                disabled={!selectedTemplateId || isUpdating}
              >
                {isUpdating ? "Linking..." : "Link Callcard"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Template Creation Dialog */}
      {isCreatingTemplate && (
        <Dialog open={isCreatingTemplate} onOpenChange={setIsCreatingTemplate}>
          <DialogContent className="max-w-6xl h-[95vh] p-0">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle>
                Create New Template
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <CallCardEditor
                template={{
                  id: '',
                  name: '',
                  description: '',
                  useCases: [],
                  painPoints: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }}
                onSave={handleCreateTemplate}
                onCancel={() => setIsCreatingTemplate(false)}
                isActive={false}
                initialSalesFramework={null}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}


/**
 * EventList Component
 * 
 * Displays a list of events for a selected date with loading and error states.
 * Shows attendee information including organizer and participants.
 * Always displays labels with "Unknown" as fallback when data is missing.
 */
export function EventList({ date, events, isLoading, error, onRefresh }: EventListProps) {
  // State to track locally updated events with linked templates
  const navigate = useNavigate();
  const { templates } = useTemplates();
  const [updatedEvents, setUpdatedEvents] = useState<CalendarEvent[]>(events);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [editingCallCard, setEditingCallCard] = useState<CalendarEvent | null>(null);

  // Update local state when events prop changes
  React.useEffect(() => {
    setUpdatedEvents(events);
  }, [events]);

  /**
   * Handles template linking for a specific event
   * Updates the local event state to reflect the newly linked template
   */
  const handleTemplateLinked = (eventId: string, templateId: string) => {
    setUpdatedEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId
          ? { ...event, template_id: templateId }
          : event
      )
    );
  };

  /**
   * Handles deleting an event
   * Removes the event from the local state and calls the API
   */
  const handleDeleteEvent = async (eventId: string) => {
    setDeletingEventId(eventId);
    try {
      await deleteCalendarEvent(eventId);
      setUpdatedEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      toast.success('Not implemented');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Not implemented');
    } finally {
      setDeletingEventId(null);
    }
  };

  /**
   * Handles editing the call-card attached to an event
   */
  const handleEditCallCard = (event: CalendarEvent) => {
    if (event.template_id) {
      setEditingCallCard(event);
    }
  };

  // Format date range for display
  const formatDateRange = (startTime: string | null, endTime: string | null) => {
    if (!startTime) return "All day";

    const startDate = new Date(startTime);
    const endDate = endTime ? new Date(endTime) : startDate;

    return `${startDate.toLocaleTimeString()} - ${endDate.toLocaleTimeString()}`;
  };

  // Get response status color
  const getResponseStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return 'bg-green-500/10 text-green-700 hover:bg-green-500/20';
      case 'declined':
        return 'bg-red-500/10 text-red-700 hover:bg-red-500/20';
      case 'tentative':
        return 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-700 hover:bg-gray-500/20';
    }
  };

  // Format attendee list with response status
  const renderAttendees = (attendees: unknown) => {
    let organizer = null;
    let participants: Attendee[] = [];

    if (Array.isArray(attendees)) {
      const typedAttendees = attendees as Attendee[];
      organizer = typedAttendees.find(a => a.organizer);
      participants = typedAttendees.filter(a => !a.organizer);
    }

    return (
      <div className="mt-2 space-y-1.5">
        {/* Organizer Section */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <User className="h-3.5 w-3.5" />
            <span className="font-medium">Organizer</span>
          </div>
          <div className="pl-5">
            {organizer ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge
                      variant="secondary"
                      className={`text-xs px-2 py-0.5 ${getResponseStatusColor(organizer.responseStatus)}`}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      {organizer.email}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Response: {organizer.responseStatus || 'No response'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-500/10 text-gray-700">
                <Mail className="h-3 w-3 mr-1" />
                Unknown
              </Badge>
            )}
          </div>
        </div>

        <Separator className="my-1.5" />

        {/* Participants Section */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium">Participants</span>
            {participants.length > 0 && (
              <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0">
                {participants.length}
              </Badge>
            )}
          </div>
          <ScrollArea className="h-[60px]">
            <div className="space-y-1 pl-5">
              {participants.length > 0 ? (
                participants.map((attendee, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge
                          variant="secondary"
                          className={`text-xs px-2 py-0.5 ${getResponseStatusColor(attendee.responseStatus)}`}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          {attendee.email}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Response: {attendee.responseStatus || 'No response'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))
              ) : (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-500/10 text-gray-700">
                  <Mail className="h-3 w-3 mr-1" />
                  No participants
                </Badge>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      {error && (
        <Alert variant="destructive" className="m-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end px-3 py-1">
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="h-6 text-xs"
        >
          Refresh
        </Button>
      </div>

      <div className="space-y-2 p-2">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : updatedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <CalendarIcon className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No events scheduled for {date?.toLocaleDateString("en-US", {
                day: "numeric",
                month: "long"
              })}
            </p>
          </div>
        ) : (
          updatedEvents.map((event) => (
            <div
              key={event.id}
              className="border border-border rounded-lg transition-colors hover:bg-accent/50 group overflow-hidden"
            >
              <div className="flex flex-row items-center justify-between py-1.5 px-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-medium truncate flex-1">
                  {event.title || "Untitled Event"}
                </h3>
                <div className="flex items-center space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-accent"
                          onClick={() => setEditingEvent(event)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Edit Event</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 hover:bg-accent hover:text-destructive"
                          onClick={() => handleDeleteEvent(event.id)}
                          disabled={deletingEventId === event.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>Delete Event</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {event.template_id ? (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:bg-accent"
                              onClick={() => handleEditCallCard(event)}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>Edit Call-Card</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <MeetingStartButton
                        templateId={event.template_id}
                        eventTitle={event.title}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-accent"
                      />
                    </>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <TemplateSelectionDialog
                              eventId={event.id}
                              onTemplateLinked={(templateId) => handleTemplateLinked(event.id, templateId)}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p>Link Template</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
              <div className="px-3 pb-2 pt-1.5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {event.description && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        {formatDateRange(event.start_time, event.end_time)}
                      </Badge>
                      {event.status && (
                        <Badge
                          variant={event.status === "confirmed" ? "default" : "secondary"}
                          className="text-xs px-2 py-0.5"
                        >
                          {event.status}
                        </Badge>
                      )}
                    </div>
                    {renderAttendees(event.attendees)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Event Edit Dialog */}
      <EventEditDialog
        isOpen={editingEvent !== null}
        onOpenChange={(open) => !open && setEditingEvent(null)}
        event={editingEvent}
        onEventUpdated={() => {
          onRefresh();
          setEditingEvent(null);
        }}
      />

      {/* Call-Card Edit Dialog */}
      {editingCallCard && (
        <Dialog open={editingCallCard !== null} onOpenChange={(open) => !open && setEditingCallCard(null)}>
          <DialogContent className="max-w-6xl h-[95vh] p-0">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle>
                Edit Call-Card for "{editingCallCard.title}"
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <CallCardEditor
                template={(() => {
                  const template = templates.find(t => t.template_id === editingCallCard.template_id);
                  const content = template?.content as any;
                  return {
                    id: editingCallCard.template_id || '',
                    name: template?.template_name || '',
                    description: template?.description || '',
                    useCases: content?.useCases || [],
                    painPoints: content?.painPoints || [],
                    createdAt: template?.created_at || new Date().toISOString(),
                    updatedAt: template?.updated_at || new Date().toISOString()
                  };
                })()}
                initialSalesFramework={(() => {
                  const template = templates.find(t => t.template_id === editingCallCard.template_id);
                  return template?.sales_framework as any || null;
                })()}
                onSave={async (template: CallCard, salesFramework?: any) => {
                  if (!editingCallCard.template_id) return;
                  
                  try {
                    const loadingToast = toast.loading('Saving call-card...');
                    
                    const content = {
                      useCases: template.useCases,
                      painPoints: template.painPoints
                    };

                    await updateTemplate(editingCallCard.template_id, {
                      template_name: template.name,
                      description: template.description,
                      content: content as any,
                      sales_framework: salesFramework as any,
                      is_default_template: templates.find(t => t.template_id === editingCallCard.template_id)?.is_default_template
                    });
                    
                    setEditingCallCard(null);
                    toast.dismiss(loadingToast);
                    toast.success('Call-card updated successfully');
                  } catch (error) {
                    console.error('Error saving call-card:', error);
                    toast.dismiss();
                    toast.error('Failed to save call-card');
                  }
                }}
                onCancel={() => setEditingCallCard(null)}
                isActive={templates.find(t => t.template_id === editingCallCard.template_id)?.is_default_template}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 