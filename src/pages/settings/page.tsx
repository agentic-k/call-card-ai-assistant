import { useState } from 'react';
import SystemAudioLoopbackTester from './components/system-audio-loopback-tester';
import ProfileForm from './components/profile-form';
import { SettingsNav } from './components/settings-nav';
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { getProfileById, updateProfile, type Profile } from "@/services/profile-api-function";
import { useEffect } from 'react';
import PermissionsSettings from './components/permissions-settings';

// Type declarations for browser-specific window features
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

/**
 * Combined Settings Page
 * 
 * A unified settings interface that combines profile management and audio settings.
 * Uses a navigation bar to switch between different sections.
 */
export default function SettingsPage() {
  // Navigation state
  const [activeSection, setActiveSection] = useState<'profile' | 'audio' | 'permissions'>('profile');
  
  // Profile state
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load profile data
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await getProfileById();
      setUser(profile);
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const profileUpdate = {
        id: user.id,
        display_name: user.display_name,
        personal_context: user.personal_context
      };
      
      const updatedProfile = await updateProfile(profileUpdate);
      
      setUser({ ...user, ...updatedProfile });
      
      toast({
        title: "Success!",
        description: "Your profile has been updated successfully.",
        variant: "default",
      });
      
    } catch (err) {
      setError('Failed to update profile');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Section content renderer
  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="space-y-0.5">
              <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
              <p className="text-muted-foreground">
                Manage your personal information and preferences
              </p>
            </div>
            <ProfileForm
              user={user}
              onUpdateUser={(updatedUser) => setUser(updatedUser)}
              isLoading={isLoading}
              error={error}
              onSubmit={handleUpdateProfile}
            />
          </div>
        );
      
      case 'audio':
        return (
          <div className="space-y-6">
            <div className="space-y-0.5">
              <h2 className="text-2xl font-bold tracking-tight">Audio Settings</h2>
              <p className="text-muted-foreground">
                Test your microphone and system audio settings
              </p>
            </div>
            <SystemAudioLoopbackTester />
          </div>
        );

      case 'permissions':
        return (
          <div className="space-y-6">
            <div className="space-y-0.5">
              <h2 className="text-2xl font-bold tracking-tight">Permissions</h2>
              <p className="text-muted-foreground">
                Manage application permissions for notifications and other features.
              </p>
            </div>
            <PermissionsSettings />
          </div>
        );
    }
  };

  return (
    <div className="h-full flex-1 flex flex-col space-y-8 overflow-hidden">
      <Toaster />
      
      {/* Navigation */}
      <SettingsNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-8 px-4 pb-16">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}