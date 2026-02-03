import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MicIcon, DownloadIcon } from 'lucide-react';
import { isElectron, openInDesktop } from '@/utils/electronUtils';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionGateProps {
  children: React.ReactNode;
}

export function PermissionGate({ children }: PermissionGateProps) {
  const [isGranted, setIsGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDesktopApp, setIsDesktopApp] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    checkPermission();
    setIsDesktopApp(isElectron());
  }, []);

  const checkPermission = async () => {
    if (!window.electron?.checkPermission) return;
    
    try {
      const status = await window.electron.checkPermission('microphone');
      setIsGranted(status === 'granted');
    } catch (error) {
      console.error('Error checking permission:', error);
    }
  };

  const requestPermission = async () => {
    if (!window.electron?.requestPermission) return;
    
    setLoading(true);
    try {
      const granted = await window.electron.requestPermission('microphone');
      if (granted) {
        setIsGranted(true);
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenInDesktop = () => {
    // Pass the auth tokens if available
    const accessToken = session?.access_token;
    const refreshToken = session?.refresh_token;
    console.log(`[Browser]: Tokens in PermissionGate - Access: ${accessToken ? 'present' : 'absent'}, Refresh: ${refreshToken ? 'present' : 'absent'}`);
    openInDesktop(undefined, accessToken, refreshToken);
  };

  if (isGranted) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 min-h-screen flex items-center justify-center bg-black/5 backdrop-blur-sm p-4 z-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <MicIcon className="h-6 w-6 text-primary" />
            Microphone Access Required
          </CardTitle>
          <CardDescription>
            To use this app, we need access to your device's microphone.
            Your microphone will only be used when explicitly activated during meetings or recordings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Button 
              onClick={requestPermission}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Requesting...' : 'Grant Access'}
            </Button>
            
            {!isDesktopApp && (
              <Button 
                onClick={handleOpenInDesktop}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <DownloadIcon className="h-4 w-4" />
                Open in Desktop App
              </Button>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            {!isDesktopApp ? 
              "This permission is essential for making calls and recording audio notes. For the best experience, use our desktop app." :
              "This permission is essential for making calls and recording audio notes."
            }
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 