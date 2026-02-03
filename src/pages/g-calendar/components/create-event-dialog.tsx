import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Plus, ArrowLeft, ArrowRight, Check } from 'lucide-react';
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
import { createTemplate, updateTemplate, deleteTemplate } from '@/services/templatesFunction';
import { createCalendarEvent, linkTemplateToEvent } from '@/services/google-calendar-api-function';
import type { Json } from '@/integrations/supabase/types';


interface CreateEventDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated: () => void;
}

/**
 * CreateEventDialog Component
 * 
 * New flow: Create Event -> Create Callcard -> Complete
 * Features a step-by-step process with progress bar.
 * Users first create an event, then create a template based on the event.
 */
export function CreateEventDialog({
  isOpen,
  onOpenChange,
  onEventCreated
}: CreateEventDialogProps) {
  const { user } = useAuth();

  // Step management - tracks current step in the flow
  const [currentStep, setCurrentStep] = useState(1);
  // Stores the created event data to pass to template creation
  const [createdEvent, setCreatedEvent] = useState<any>(null);

  // Event creation state
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date(Date.now() + 60 * 60 * 1000)); // Default 1 hour duration
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Template management state
  const { templates, refetchTemplates } = useTemplates();
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Step configuration
  const steps = [
    { id: 1, title: "Create Event", description: "Schedule your meeting" },
    { id: 2, title: "Create Callcard", description: "Design your meeting callcard" },
    { id: 3, title: "Complete", description: "Event and template created successfully" }
  ];

  const progress = (currentStep / steps.length) * 100;

  // Helper functions for time formatting and parsing
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

  // Convert DB Template to CallCard
  const convertToAgentTemplate = (template: Template): CallCard => {
    const content = template.content as any;
    return {
      id: template.template_id,
      name: template.template_name,
      description: template.description || '',
      useCases: content?.useCases || [],
      painPoints: content?.painPoints || [],
      createdAt: template.created_at,
      updatedAt: template.updated_at
    };
  };



  // Handle event creation - first step in the new flow
  const handleCreateEvent = async () => {
    if (!user) {
      toast.error('You must be logged in to create events');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    if (!startTime) {
      toast.error('Please select a start time for the event');
      return;
    }

    if (!endTime) {
      toast.error('Please select an end time for the event');
      return;
    }

    if (endTime <= startTime) {
      toast.error('End time must be after start time');
      return;
    }

    try {
      const loadingToast = toast.loading('Creating calendar event...');
      
      // Create event using the Google Calendar API
      const eventData = {
        title: title.trim(),
        description: description.trim(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        attendees: [] // Can be extended to include attendees
      };

      console.log('Creating event with:', eventData);

      const createdEvent = await createCalendarEvent(eventData);

      if (!createdEvent || !createdEvent.id) {
        throw new Error('Failed to create event: No event data returned');
      }

      // Store the created event data for template creation
      setCreatedEvent({
        ...createdEvent,
        startTime: startTime,
        endTime: endTime,
        createdBy: user.id
      });
      
      toast.dismiss(loadingToast);
      toast.success('Event created successfully');
      onEventCreated();

      // Move to template creation step
      setCurrentStep(2);
    } catch (error: any) {
      console.error('Error creating event:', error);
      const errorMessage = error?.message || 'Failed to create event';
      toast.dismiss();
      toast.error(errorMessage);
    }
  };

  // Handle template creation
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setIsCreatingTemplate(true);
  };

  // Handle template editing
  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setIsCreatingTemplate(true);
  };

  // Handle template deletion
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate(templateId);
      toast.success('Template deleted successfully');
      // Refresh templates list
      await refetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Handle template save - second step in the new flow, includes event data
  const handleSaveTemplate = async (template: CallCard, salesFramework?: any) => {
    if (!user) {
      toast.error('You must be logged in to save templates');
      return;
    }

    try {
      // Start saving process
      const loadingToast = toast.loading('Saving template and linking to event...');
      
      const content = {
        useCases: template.useCases,
        painPoints: template.painPoints,
        // Include event data in template content for reference
        eventData: createdEvent
      };

      let savedTemplate: Template;

      if (editingTemplate) {
        // Update existing template
        savedTemplate = await updateTemplate(editingTemplate.template_id, {
          template_name: template.name,
          description: template.description,
          content: content as unknown as Json,
          sales_framework: salesFramework as any,
          is_default_template: editingTemplate.is_default_template
        });
        toast.dismiss(loadingToast);
        toast.success('Template updated successfully');
      } else {
        // Create new template
        savedTemplate = await createTemplate({
          template_name: template.name,
          description: template.description,
          content: content as unknown as Json,
          sales_framework: salesFramework as any,
          user_id: user.id,
          is_default_template: false,
          status: 'ACTIVE' // Set the template status to active
        });
        toast.dismiss(loadingToast);
        toast.success('Template created successfully');
      }

      // If we have a created event, link the template to it
      if (createdEvent && createdEvent.id) {
        try {
          const linkedEvent = await linkTemplateToEvent(createdEvent.id, savedTemplate.template_id);
          console.log('Template linked to event successfully:', linkedEvent);
          toast.success('Template linked to event successfully');
        } catch (linkError) {
          console.warn('Failed to link template to event:', linkError);
          toast.error('Failed to link template to event. You can try again later.');
          // Don't fail the whole process if linking fails
        }
      }

      setIsCreatingTemplate(false);
      setEditingTemplate(null);

      // Refresh templates list
      await refetchTemplates();

      // Move to completion step
      setCurrentStep(3);

      // Auto-close after a short delay
      setTimeout(() => {
        onOpenChange(false);
        // Reset form and state
        setTitle("");
        setDescription("");
        setStartTime(new Date());
        setEndTime(new Date(Date.now() + 60 * 60 * 1000));
        setCreatedEvent(null);
        setCurrentStep(1);
      }, 2000);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.dismiss();
      toast.error('Failed to save template');
    }
  };

  // Handle template cancel
  const handleCancelTemplate = () => {
    setIsCreatingTemplate(false);
    setEditingTemplate(null);
  };

  // Handle going back to previous step
  const handleGoBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle dialog close - reset state
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Reset all state when dialog closes
      setCurrentStep(1);
      setCreatedEvent(null);
      setTitle("");
      setDescription("");
      setStartTime(new Date());
      setEndTime(new Date(Date.now() + 60 * 60 * 1000));
      setIsCreatingTemplate(false);
      setEditingTemplate(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>
          </DialogDescription>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Step {currentStep} of {steps.length}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium",
                    currentStep > step.id
                      ? "bg-primary border-primary text-primary-foreground"
                      : currentStep === step.id
                        ? "border-primary text-primary"
                        : "border-muted-foreground text-muted-foreground"
                  )}>
                    {currentStep > step.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={cn(
                      "text-sm font-medium",
                      currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-px bg-border mx-4" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="space-y-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter event title"
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
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && createdEvent && (
            <div className="space-y-4">
              {/* Event Summary */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold text-sm mb-2">Event Created:</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Title:</span> {createdEvent.title}</p>
                  <p><span className="font-medium">Start:</span> {format(createdEvent.startTime, "PPP 'at' p")}</p>
                  <p><span className="font-medium">End:</span> {format(createdEvent.endTime, "PPP 'at' p")}</p>
                  {createdEvent.description && (
                    <p><span className="font-medium">Description:</span> {createdEvent.description}</p>
                  )}
                </div>
              </div>

              {/* Template Creation Options */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Create a Template</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a reusable template based on this event for future meetings
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={handleCreateTemplate}
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Create Callcard
                  </Button>
                </div>

                {templates.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Or use an existing template:</p>
                    </div>
                    <div className="max-w-md mx-auto">
                      <Select
                        onValueChange={async (templateId) => {
                          const template = templates.find(t => t.template_id === templateId);
                          if (template && createdEvent && createdEvent.id) {
                            try {
                              toast.loading('Linking template to event...');
                              // Link the selected template to the event
                              await linkTemplateToEvent(createdEvent.id, templateId);
                              toast.success('Template linked to event successfully');
                              // Skip template creation and go to completion
                              setCurrentStep(3);
                            } catch (error) {
                              console.error('Error linking template to event:', error);
                              toast.error('Failed to link template to event');
                            }
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an existing template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => {
                            const content = template.content as any;
                            return (
                              <SelectItem key={template.template_id} value={template.template_id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{template.template_name}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {content?.useCases?.length || 0} UC
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {content?.painPoints?.length || 0} PP
                                    </Badge>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center space-y-4 py-8">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-green-600">Event and Template Created Successfully!</h3>
                <p className="text-muted-foreground">
                  Your meeting has been scheduled and the template has been saved for future use.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {currentStep !== 3 && (
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? () => handleDialogClose(false) : handleGoBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </Button>

            {currentStep === 1 && (
              <Button
                onClick={handleCreateEvent}
                className="flex items-center gap-2"
              >
                Create Event
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>

      {/* Template Editor Dialog */}
      {isCreatingTemplate && (
        <Dialog open={isCreatingTemplate} onOpenChange={setIsCreatingTemplate}>
          <DialogContent className="max-w-6xl h-[95vh] p-0">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle>
                {editingTemplate ? 'Edit Callcard' : 'Create New Template'}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto">
              {editingTemplate ? (
                <CallCardEditor
                  template={convertToAgentTemplate(editingTemplate)}
                  onSave={handleSaveTemplate}
                  onCancel={handleCancelTemplate}
                  isActive={editingTemplate.is_default_template}
                  initialSalesFramework={editingTemplate.sales_framework as any || null}
                  onSetActive={async () => {
                    // Handle setting active template
                    toast.info('Template set as active');
                  }}
                />
              ) : (
                <CallCardEditor
                  template={{
                    id: '',
                    name: createdEvent ? `${createdEvent.title} Template` : '',
                    description: createdEvent ? `Template based on ${createdEvent.title} meeting` : '',
                    useCases: [],
                    painPoints: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  }}
                  onSave={handleSaveTemplate}
                  onCancel={handleCancelTemplate}
                  isActive={false}
                  initialSalesFramework={null}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
