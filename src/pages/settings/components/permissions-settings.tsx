import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { useNotifications } from "@/contexts/notifications-context"

export default function PermissionsSettings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkNotificationPermissionStatus();
  }, []);

  const checkNotificationPermissionStatus = async () => {
    setIsCheckingPermission(true);
    try {
      if (window.electron) {
        // Use Electron's permission checking, which returns a boolean
        const hasPermission = await window.electron.checkNotificationPermission();
        setNotificationsEnabled(hasPermission);
      } else {
        // Fallback to browser API, which uses a string status
        setNotificationsEnabled(Notification.permission === 'granted');
      }
    } catch (error) {
      console.error('Error checking notification permission:', error);
      setNotificationsEnabled(false);
    } finally {
      setIsCheckingPermission(false);
    }
  };

  const { addNotification } = useNotifications();

  const sendTestNotification = () => {
    if (window.electron) {
      // Send both system and in-app notification
      window.electron.sendTestNotification();
      addNotification({
        title: "Test Notification",
        message: "This is a test notification from Call Card.",
        type: "info"
      });
    } else if (Notification.permission === 'granted') {
      // Send both browser and in-app notification
      new Notification("Test Notification", {
        body: "This is a test notification from Call Card.",
      });
      addNotification({
        title: "Test Notification",
        message: "This is a test notification from Call Card.",
        type: "info"
      });
    } else {
      toast({
        title: "Permission Required",
        description: "Please enable notifications to send a test.",
        variant: "destructive",
      });
    }
  };

  const grantNotificationPermission = async () => {
    if (window.electron) {
      try {
        const granted = await window.electron.grantNotificationPermission();
        // Refresh permission status after granting
        await checkNotificationPermissionStatus();
        
        if (granted) {
          toast({
            title: "Permission Granted",
            description: "Notification permissions have been granted.",
          });
        } else {
          toast({
            title: "Permission Denied",
            description: "Notification permissions were not granted.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to request notification permission.",
          variant: "destructive",
        });
      }
    } else {
      // Fallback to browser API
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        toast({
          title: "Permission Granted",
          description: "Notification permissions have been granted.",
        });
      } else {
        toast({
          title: "Permission Denied",
          description: "Notification permissions were not granted.",
          variant: "destructive",
        });
      }
    }
  };

  const revokeNotificationPermission = async () => {
    if (window.electron) {
      try {
        const revoked = await window.electron.revokeNotificationPermission();
        if (!revoked) {
          toast({
            title: "Manual Action Required",
            description: "To revoke notification permissions, please go to System Preferences > Notifications & Focus > Call Card and disable notifications.",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to revoke notification permission.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Manual Action Required",
        description: "To revoke notification permissions, please go to your browser settings and disable notifications for this site.",
      });
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
        return;
      }

      if (Notification.permission === 'denied') {
        toast({
          title: "Permission Denied",
          description: "You have previously denied notification permissions. Please enable them in your browser/system settings.",
          variant: "destructive",
        });
        return;
      }
      
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        toast({
          title: "Notifications Enabled",
          description: "You will now receive notifications.",
        });
        // You can send a test notification here.
        // In an Electron app, this would be an IPC call to the main process.
        new Notification("Call Card", {
          body: "Notifications are now enabled!",
        });
      } else {
        setNotificationsEnabled(false);
        toast({
          title: "Notifications Not Enabled",
          description: "You did not grant permission for notifications.",
          variant: "destructive",
        });
      }
    } else {
      // We cannot programmatically revoke permission. 
      // This switch will just reflect the granted state.
      // If user wants to disable, they must do so from browser/system settings.
      toast({
        title: "Info",
        description: "To disable notifications, please manage permissions in your browser or system settings.",
      });
      // Re-check and set the state, as we can't disable it from here.
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>App Permissions</CardTitle>
        <CardDescription>Control what this application is allowed to do.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="notifications-switch" className="text-base">
              Desktop Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              {isCheckingPermission 
                ? "Checking permission status..." 
                : "Receive notifications for important events."
              }
            </p>
          </div>
          <Switch
            id="notifications-switch"
            checked={notificationsEnabled}
            onCheckedChange={handleNotificationToggle}
            disabled={isCheckingPermission}
          />
        </div>
        <div className="flex justify-end gap-2">
          {!notificationsEnabled && (
            <Button
              onClick={grantNotificationPermission}
              variant="default"
            >
              Grant Permission
            </Button>
          )}
          {notificationsEnabled && (
            <Button
              onClick={revokeNotificationPermission}
              variant="destructive"
            >
              Revoke Permission
            </Button>
          )}
          <Button
            onClick={sendTestNotification}
            disabled={!notificationsEnabled}
            variant="outline"
          >
            Send Test Notification
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
