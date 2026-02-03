import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Clock } from 'lucide-react';
import { MeetingStartButton } from './meeting-start-button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTemplates } from '@/hooks/useTemplates';
import { toast } from 'sonner';
import { Template } from '@/services/templatesFunction';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import CallCardEditor from '@/components/meeting/call-card-editor';
import { CallCard } from '@/types/agent/call-card-create.types';
import { linkTemplateToEvent, updateCalendarEvent } from '@/services/google-calendar-api-function';
import { updateTemplate } from '@/services/templatesFunction';
import type { CalendarEvent } from '@/services/google-calendar-api-function';
import { useNavigate } from "react-router-dom";

interface EventEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onEventUpdated: () => void;
}

export function EventEditDialog({
  isOpen,
  onOpenChange,
  event,
  onEventUpdated
}: EventEditDialogProps) {
  const { user } = useAuth();
  const { templates, isLoading: isLoadingTemplates } = useTemplates();
  const navigate = useNavigate();

  // Event editing state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState<Date | undefined>(undefined);

  // Template editing state
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);

  // Update form fields when event changes
  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setDescription(event.description || "");
      setStartTime(event.start_time ? new Date(event.start_time) : undefined);
      setEndTime(event.end_time ? new Date(event.end_time) : undefined);
      setSelectedTemplateId(event.template_id || undefined);
    } else {
      // Reset form when no event
      setTitle("");
      setDescription("");
      setStartTime(undefined);
      setEndTime(undefined);
      setSelectedTemplateId(undefined);
    }
  }, [event]);

  // Helper functions for time formatting
  const formatTime = (date: Date) => {
    return format(date, "HH:mm");
  };

  const parseTime = (timeString: string, baseDate: Date) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const newDate = new Date(baseDate);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  const handleStartTimeChange = (timeString: string) => {
    if (startTime) {
      const newStartTime = parseTime(timeString, startTime);
      setStartTime(newStartTime);
      
      // Auto-adjust end time to maintain duration
      if (endTime) {
        const duration = endTime.getTime() - startTime.getTime();
        const newEndTime = new Date(newStartTime.getTime() + duration);
        setEndTime(newEndTime);
      } else {
        // Default 1 hour duration
        setEndTime(new Date(newStartTime.getTime() + 60 * 60 * 1000));
      }
    }
  };

  const handleEndTimeChange = (timeString: string) => {
    if (endTime) {
      const newEndTime = parseTime(timeString, endTime);
      setEndTime(newEndTime);
    }
  };

  // Handle event update
  const handleUpdateEvent = async () => {
    if (!user || !event) {
      toast.error('You must be logged in to update events');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    if (!startTime) {
      toast.error('Please select a start time');
      return;
    }

    if (!endTime) {
      toast.error('Please select an end time');
      return;
    }

    if (endTime <= startTime) {
      toast.error('End time must be after start time');
      return;
    }

    setIsUpdating(true);
    
    try {
      // Update the event details
      const updatedEventData = {
        title: title.trim(),
        description: description.trim(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      };

      await updateCalendarEvent(event.id, updatedEventData);

      // Handle template linking if changed
      if (selectedTemplateId && selectedTemplateId !== event.template_id) {
        await linkTemplateToEvent(event.id, selectedTemplateId);
        toast.success('Event updated and template linked successfully');
      } else if (!selectedTemplateId && event.template_id) {
        // If template was unlinked, we could add an API to unlink it
        // For now, just update the event
        toast.success('Event updated successfully');
      } else {
        toast.success('Event updated successfully');
      }

      onEventUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating event:', error);
      const errorMessage = error?.message || 'Failed to update event';
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle template selection
  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  // Handle template editing
  const handleEditTemplate = () => {
    if (!selectedTemplateId) {
      toast.error('Please select a template first');
      return;
    }
    setIsEditingTemplate(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter event title"
                  disabled={isUpdating}
                />
              </div>

              <div className="grid gap-2">
                <Label>Start Date & Time</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal flex-1",
                          !startTime && "text-muted-foreground"
                        )}
                        disabled={isUpdating}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startTime ? format(startTime, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startTime}
                        onSelect={(date) => {
                          if (date) {
                            if (startTime) {
                              // Preserve time when changing date
                              const newDate = new Date(date);
                              newDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
                              setStartTime(newDate);
                            } else {
                              setStartTime(date);
                            }
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={startTime ? formatTime(startTime) : ""}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    className="w-32"
                    placeholder="HH:MM"
                    disabled={isUpdating}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>End Date & Time</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal flex-1",
                          !endTime && "text-muted-foreground"
                        )}
                        disabled={isUpdating}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endTime ? format(endTime, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endTime}
                        onSelect={(date) => {
                          if (date) {
                            if (endTime) {
                              // Preserve time when changing date
                              const newDate = new Date(date);
                              newDate.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
                              setEndTime(newDate);
                            } else {
                              setEndTime(date);
                            }
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={endTime ? formatTime(endTime) : ""}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    className="w-32"
                    placeholder="HH:MM"
                    disabled={isUpdating}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter event description"
                  rows={3}
                  disabled={isUpdating}
                />
              </div>

              <div className="grid gap-2">
                <Label>Linked Template</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedTemplateId}
                    onValueChange={handleTemplateSelect}
                    disabled={isLoadingTemplates || isUpdating}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.template_id} value={template.template_id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{template.template_name}</span>
                            {template.is_default_template && (
                              <Badge variant="secondary" className="ml-2">Default</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={handleEditTemplate}
                    disabled={!selectedTemplateId || isUpdating}
                  >
                    Edit Callcard
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {selectedTemplateId && (
                <MeetingStartButton
                  templateId={selectedTemplateId}
                  eventTitle={title}
                  variant="outline"
                  disabled={isUpdating}
                />
              )}
              <Button onClick={handleUpdateEvent} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Event'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Template Editor Dialog */}
      {isEditingTemplate && selectedTemplateId && (
        <Dialog open={isEditingTemplate} onOpenChange={setIsEditingTemplate}>
          <DialogContent className="max-w-6xl h-[95vh] p-0">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle>
                Edit Callcard
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <CallCardEditor
                template={(() => {
                  const template = templates.find(t => t.template_id === selectedTemplateId);
                  const content = template?.content as any;
                  return {
                    id: selectedTemplateId,
                    name: template?.template_name || '',
                    description: template?.description || '',
                    useCases: content?.useCases || [],
                    painPoints: content?.painPoints || [],
                    createdAt: template?.created_at || new Date().toISOString(),
                    updatedAt: template?.updated_at || new Date().toISOString()
                  };
                })()}
                initialSalesFramework={(() => {
                  const template = templates.find(t => t.template_id === selectedTemplateId);
                  return template?.sales_framework as any || null;
                })()}
                onSave={async (template: CallCard, salesFramework?: any) => {
                  if (!selectedTemplateId) return;
                  
                  try {
                    const loadingToast = toast.loading('Saving template...');
                    
                    const content = {
                      useCases: template.useCases,
                      painPoints: template.painPoints
                    };

                    await updateTemplate(selectedTemplateId, {
                      template_name: template.name,
                      description: template.description,
                      content: content as any,
                      sales_framework: salesFramework as any,
                      is_default_template: templates.find(t => t.template_id === selectedTemplateId)?.is_default_template
                    });
                    
                    setIsEditingTemplate(false);
                    toast.dismiss(loadingToast);
                    toast.success('Template updated successfully');
                  } catch (error) {
                    console.error('Error saving template:', error);
                    toast.dismiss();
                    toast.error('Failed to save template');
                  }
                }}
                onCancel={() => setIsEditingTemplate(false)}
                isActive={templates.find(t => t.template_id === selectedTemplateId)?.is_default_template}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
