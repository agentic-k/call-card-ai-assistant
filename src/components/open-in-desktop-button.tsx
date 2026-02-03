import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { DownloadIcon } from 'lucide-react';
import { isElectron, openInDesktop } from '@/utils/electronUtils';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface OpenInDesktopButtonProps {
  className?: string;
}

export function OpenInDesktopButton({ className = '' }: OpenInDesktopButtonProps) {
  const [isDesktopApp, setIsDesktopApp] = useState<boolean>(false);
  const location = useLocation();
  const { session } = useAuth();

  useEffect(() => {
    // Check if we're running in Electron
    setIsDesktopApp(isElectron());
  }, []);

  // Don't render the button if we're already in the desktop app
  if (isDesktopApp) {
    return null;
  }

  const handleOpenInDesktop = () => {
    // Get the current path without the leading slash
    const currentPath = location.pathname.replace(/^\//, '');
    
    // Pass the auth tokens if available
    const accessToken = session?.access_token;
    const refreshToken = session?.refresh_token;
    console.log(`[Browser]: Tokens in OpenInDesktopButton - Access: ${accessToken ? 'present' : 'absent'}, Refresh: ${refreshToken ? 'present' : 'absent'}`);
    openInDesktop(currentPath, accessToken, refreshToken);
  };

  return (
    <Button 
      variant="outline" 
      size="sm"
      className={`flex items-center gap-1 ${className}`}
      onClick={handleOpenInDesktop}
    >
      <DownloadIcon className="h-4 w-4" />
      Open in Desktop
    </Button>
  );
}
