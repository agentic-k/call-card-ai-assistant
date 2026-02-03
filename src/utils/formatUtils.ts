export const formatDuration = (duration: number) => {
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Calculate meeting progress
export const calculateProgress = (activeMeeting: any, templates: any[]) => {
  if (!activeMeeting) return 0;
  
  const activeTemplate = templates.find(t => t.id === activeMeeting.templateId);
  if (!activeTemplate) return 0;
  
  const totalSections = activeTemplate.sections.length;
  const currentIndex = activeMeeting.currentSectionIndex;
  
  return ((currentIndex + 1) / totalSections) * 100;
};

// Calculate section timer progress
export const calculateSectionTimerProgress = (timer: number, sectionDurationMinutes: number) => {
  if (!sectionDurationMinutes) return 0;
  
  const sectionDurationSeconds = sectionDurationMinutes * 60;
  if (sectionDurationSeconds <= 0) return 0;
  
  // Calculate section elapsed time
  const sectionElapsedTime = timer % sectionDurationSeconds;
  const progressPercent = (sectionElapsedTime / sectionDurationSeconds) * 100;
  
  // Cap at 100%
  return Math.min(progressPercent, 100);
};
