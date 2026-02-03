import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Link2, PhoneCall } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { checkGoogleCalendarPermission } from '@/services/google-api-function';
import { cn } from "@/lib/utils";
import { useTemplates } from '@/hooks/useTemplates';
import { MeetingStartButton } from './meeting-start-button';

/**
 * CalendarStatusBar Component
 * 
 * Displays the current Google Calendar connection status in a title bar format.
 * Shows connection status, last sync time, and actions to reconnect or refresh.
 * Includes a quick meeting start button for the default template.
 */
export function CalendarStatusBar() {
  const { linkGoogleCalendar, loading } = useAuth();
  const { templates, isLoading: isLoadingTemplates } = useTemplates();
  const [calendarPermission, setCalendarPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [isChecking, setIsChecking] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Find default template for quick start
  const defaultTemplate = templates.find(t => t.is_default_template);

  const checkPermissions = async () => {
    setIsChecking(true);
    try {
      const { status } = await checkGoogleCalendarPermission();
      setCalendarPermission(status);
      if (status === 'granted') {
        setLastSyncTime(new Date());
      }
    } catch (error) {
      console.error("Error checking permissions:", error);
      setCalendarPermission('denied');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  const handleLinkCalendar = () => {
    linkGoogleCalendar();
  };

  const getStatusDetails = () => {
    switch (calendarPermission) {
      case 'granted':
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          badge: <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>,
          message: lastSyncTime ? `Last synced ${lastSyncTime.toLocaleTimeString()}` : 'Connected to Google Calendar'
        };
      case 'denied':
        return {
          icon: <XCircle className="h-4 w-4 text-red-500" />,
          badge: <Badge variant="destructive">Disconnected</Badge>,
          message: 'Calendar connection failed'
        };
      default:
        return {
          icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
          badge: <Badge variant="secondary">Not Connected</Badge>,
          message: 'Connect your Google Calendar to get started'
        };
    }
  };

  const status = getStatusDetails();

  return (
    <div className={cn(
      "w-full px-4 py-2 border-b flex items-center justify-between gap-4",
      calendarPermission === 'granted' ? "bg-green-50" : "bg-accent"
    )}>
      <div className="flex items-center gap-3">
        {isChecking ? (
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          status.icon
        )}
        <div className="flex items-center gap-2">
          {status.badge}
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {status.message}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Quick start meeting button if default template exists */}
        {defaultTemplate && (
          <MeetingStartButton 
            templateId={defaultTemplate.template_id}
            size="sm"
            variant="outline"
            className="hidden sm:flex"
          />
        )}
        
        <Button
          onClick={handleLinkCalendar}
          disabled={loading || isChecking}
          size="sm"
          variant={calendarPermission === 'granted' ? 'outline' : 'default'}
        >
          <Link2 className="h-4 w-4 mr-2" />
          {loading
            ? "Connecting..."
            : calendarPermission === 'granted'
              ? "Reconnect"
              : "Connect Calendar"}
        </Button>
        <Button 
          onClick={checkPermissions} 
          disabled={loading || isChecking}
          size="sm"
          variant="ghost"
        >
          <RefreshCw className={cn(
            "h-4 w-4",
            isChecking && "animate-spin"
          )} />
        </Button>
      </div>
    </div>
  );
}