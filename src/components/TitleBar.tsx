import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { NotificationDropdown } from './notifications/notification-dropdown';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/components/Sidebar';

const TitleBar: React.FC = () => {
  const { user, signOut, forceSignOut } = useAuth();
  const { isMeetingActive } = useSidebar();
  const [open, setOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      // Add a timeout to the normal logout
      const logoutPromise = signOut();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Logout timeout')), 5000); // 5 second timeout
      });
      
      await Promise.race([logoutPromise, timeoutPromise]);
    } catch (error) {
      // If normal logout fails or times out, try force logout
      try {
        await forceSignOut();
      } catch (forceError) {
        // Silent error handling for production
      }
    }
  };


  // Don't render anything if meeting is active
  if (isMeetingActive) {
    return null;
  }

  return (
    <div className="h-12 flex items-center justify-between px-5 bg-primary backdrop-blur-md relative">

      {/* Notifications and Profile dropdown */}
      {user && (
        <div className="flex items-center gap-2 ml-auto">
          <NotificationDropdown />
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className="flex items-center max-h-7"
              >
                <span className="text-sm">Account</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56"
              align="end"
              forceMount
              sideOffset={0}
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                asChild
                className="cursor-pointer"
              >
                <button
                  className="w-full flex items-center px-2 py-1.5 hover:bg-accent"
                  onClick={handleLogout}
                  onSelect={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

export default TitleBar;