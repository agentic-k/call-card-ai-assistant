import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/contexts/notifications-context";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Notification } from "@/types/notification";

interface NotificationItemProps {
  notification: Notification;
  onClick: (id: string, link?: string) => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  return (
    <DropdownMenuItem
      className="flex flex-col items-start gap-1 p-4 cursor-pointer"
      onClick={() => onClick(notification.id, notification.link)}
    >
      <div className="flex items-center gap-2 w-full">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            notification.type === "error" && "bg-destructive",
            notification.type === "warning" && "bg-yellow-500",
            notification.type === "success" && "bg-green-500",
            notification.type === "info" && "bg-blue-500"
          )}
        />
        <span className="font-medium flex-grow">{notification.title}</span>
        <span className="text-xs text-muted-foreground">
          {format(notification.timestamp, "HH:mm")}
        </span>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">
        {notification.message}
      </p>
    </DropdownMenuItem>
  );
}

export function NotificationDropdown() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
  } = useNotifications();

  const readNotifications = notifications.filter((n) => n.read);
  const unreadNotifications = notifications.filter((n) => !n.read);

  const handleNotificationClick = (id: string, link?: string) => {
    markAsRead(id);
    if (link) {
      window.location.href = link;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="secondary" 
          size="icon" 
          className="relative"
          // Match the height of the account button in TitleBar
          style={{ height: '1.75rem' }}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <Tabs defaultValue="unread" className="w-full">
          <div className="flex items-center justify-between px-4 py-2">
            <TabsList className="grid w-32 grid-cols-2">
              <TabsTrigger value="unread" className="relative">
                Unread
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="read">Read</TabsTrigger>
            </TabsList>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="text-xs"
            >
              Clear all
            </Button>
          </div>
          <DropdownMenuSeparator />
          <TabsContent value="unread" className="mt-0">
            <ScrollArea className="h-[300px] overflow-y-auto">
              {unreadNotifications.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  No unread notifications
                </div>
              ) : (
                <>
                  <div className="flex justify-end px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      Mark all as read
                    </Button>
                  </div>
                  {unreadNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </>
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="read" className="mt-0">
            <ScrollArea className="h-[300px] overflow-y-auto">
              {readNotifications.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  No read notifications
                </div>
              ) : (
                readNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationClick}
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
