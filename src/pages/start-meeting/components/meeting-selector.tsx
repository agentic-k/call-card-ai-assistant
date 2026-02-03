import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

interface MeetingSelectorProps {
  templates: any[];
  activeTemplateId: string | null;
  onSelectTemplate: (templateId: string) => void;
  isLoading?: boolean;
}

const MeetingSelector: React.FC<MeetingSelectorProps> = ({
  templates,
  activeTemplateId,
  onSelectTemplate,
  isLoading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Handle direct selection without relying on the Select component's internal logic
  const handleManualSelect = useCallback((templateId: string) => {
    setIsOpen(false);
    // Ensure we're updating state in the next tick to avoid React event batching issues
    setTimeout(() => {
      onSelectTemplate(templateId);
    }, 10);
  }, [onSelectTemplate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (isLoading) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between bg-accent/20 p-2 sm:p-3 rounded-lg mt-2 sm:mt-4 gap-2 sm:gap-3">
        <div className="w-full sm:flex-1">
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-8 sm:h-10 w-full" />
        </div>
      </div>
    );
  }

  // Custom dropdown to bypass Electron/macOS issues with native select
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between bg-accent/20 p-2 sm:p-3 rounded-lg mt-2 sm:mt-4 gap-2 sm:gap-3">
      <div className="w-full sm:flex-1">
        <p className="text-xs sm:text-sm font-medium mb-1">Select a meeting template</p>
        
        <div className="relative w-full">
          {/* Custom trigger that looks like SelectTrigger */}
          <button
            type="button"
            className="flex h-8 sm:h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={() => setIsOpen(!isOpen)}
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <span className="line-clamp-1">
              {activeTemplateId 
                ? templates.find(t => t.id === activeTemplateId)?.name || 'Choose a template'
                : 'Choose a template'}
            </span>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50">
              <path d="M4.18179 6.18181C4.35753 6.00608 4.64245 6.00608 4.81819 6.18181L7.49999 8.86362L10.1818 6.18181C10.3575 6.00608 10.6424 6.00608 10.8182 6.18181C10.9939 6.35755 10.9939 6.64247 10.8182 6.81821L7.81819 9.81821C7.73379 9.9026 7.61934 9.95001 7.49999 9.95001C7.38064 9.95001 7.26618 9.9026 7.18179 9.81821L4.18179 6.81821C4.00605 6.64247 4.00605 6.35755 4.18179 6.18181Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
          </button>
          
          {/* Custom dropdown content */}
          {isOpen && (
            <div 
              ref={contentRef}
              className="absolute z-[9999] mt-1 w-full rounded-md border bg-popover shadow-md max-h-[300px] overflow-y-auto"
              style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            >
              <div className="p-1">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className={`flex items-center w-full px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                      activeTemplateId === template.id ? 'bg-accent text-accent-foreground' : ''
                    }`}
                    onClick={() => handleManualSelect(template.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleManualSelect(template.id);
                      }
                    }}
                    tabIndex={0}
                    role="option"
                    aria-selected={activeTemplateId === template.id}
                    style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                  >
                    <span className="ml-6">{template.name}</span>
                    {activeTemplateId === template.id && (
                      <svg className="h-4 w-4 absolute left-2" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingSelector;
