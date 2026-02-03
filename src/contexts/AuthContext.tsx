import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { isElectron, isMobile } from '@/utils/platformUtils';

/**
 * Utility function to clear all Supabase-related session data from storage
 * This ensures a complete logout by removing all traces of authentication data
 */
const clearAllSessionData = () => {
  try {
    // Clear localStorage
    const localStorageKeysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('call-card-auth') || key.includes('sb-'))) {
        localStorageKeysToRemove.push(key);
      }
    }
    
    localStorageKeysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear sessionStorage
    const sessionStorageKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('call-card-auth') || key.includes('sb-'))) {
        sessionStorageKeysToRemove.push(key);
      }
    }
    
    sessionStorageKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    return true;
  } catch (error) {
    console.error('[AuthContext]: Error clearing session data:', error);
    return false;
  }
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  linkGoogleCalendar: () => Promise<void>;
  handleExternalAuth: (accessToken: string, refreshToken: string) => Promise<void>;
  forceSignOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLinkingCalendar, setIsLinkingCalendar] = useState(false);
  const isLinkingCalendarRef = useRef(isLinkingCalendar);
  isLinkingCalendarRef.current = isLinkingCalendar;
  const navigate = useNavigate();

  useEffect(() => {
    // Handle auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false) // Always set loading to false after an auth event

      // Handle signed out
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        clearAllSessionData();
        toast({ title: "Signed out", description: "You have been successfully signed out." });
        navigate('/login');
      }

      // Handle token refresh failure
      if (event === 'TOKEN_REFRESHED' && !session) {
        setSession(null);
        setUser(null);
        clearAllSessionData();
        toast({ 
          title: "Session Expired", 
          description: "Your session has expired. Please sign in again.",
          variant: "destructive"
        });
        navigate('/login');
      }
    });
    
    // Get initial session and validate it
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        // Clear invalid session data
        clearAllSessionData();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (session) {
        // Validate the session by making a test API call
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            // Session is invalid, clear it
            await supabase.auth.signOut();
            clearAllSessionData();
            setSession(null);
            setUser(null);
          } else {
            setSession(session);
            setUser(user);
          }
        } catch (validationError) {
          // Session is invalid, clear it
          await supabase.auth.signOut();
          clearAllSessionData();
          setSession(null);
          setUser(null);
        }
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Listen for OAuth callback messages from main process (Electron)
    let unsubscribeAuthCallback: (() => void) | null = null;
    let unsubscribeAuthError: (() => void) | null = null;
    let unsubscribeLoginBounce: (() => void) | null = null;
    let unsubscribeInitiateSignOut: (() => void) | null = null;

    if (window.electron) {
      // Set up auth callback handler (for direct token exchange from main process)
        if (window.electron.handleAuthCallback) {
          unsubscribeAuthCallback = window.electron.handleAuthCallback(async (data) => {
            // The main process has completed the OAuth flow and sent the session data.
            if ((window as any).authTimeout) {
              clearTimeout((window as any).authTimeout);
              (window as any).authTimeout = null;
            }

            const { access_token, refresh_token, provider_token, provider_refresh_token, expires_in } = data;

            if (access_token && refresh_token) {
              setLoading(true);
              try {
                // Manually set the session in the renderer's Supabase client to sync it.
                const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                  access_token,
                  refresh_token,
                });

                if (sessionError) {
                  throw new Error(`Failed to set Supabase session in renderer: ${sessionError.message}`);
                }
                
                const { session } = sessionData;

                if (!session) {
                  throw new Error('Authentication failed: Could not retrieve session.');
                }
                
                // Focus the main window after successful authentication
                if (window.electron?.invoke) {
                  try {
                    await window.electron.invoke('focus-main-window');
                  } catch (error) {
                    // Silent error handling for production
                  }
                }
                
                // If calendar linking is in progress, complete the setup
                if (isLinkingCalendarRef.current && provider_token && session.user) {
                  await setupGoogleCalendar(
                    provider_token,
                    provider_refresh_token,
                    session.access_token,
                    expires_in,
                    session.user.id
                  );
                } else {
                  toast({
                    title: "Welcome!",
                    description: "You've successfully signed in."
                  });
                }
                
                navigate('/');
                
              } catch (error: any) {
                toast({
                  title: "Authentication Failed",
                  description: error.message,
                  variant: "destructive"
                });
              } finally {
                setLoading(false);
                setIsLinkingCalendar(false); // Reset calendar linking state
              }
            } else {
              setLoading(false);
            }
          });
        }

      // Set up auth error handler
      if (window.electron.handleAuthError) {
        unsubscribeAuthError = window.electron.handleAuthError((errorMessage) => {
          setLoading(false);
          toast({
            title: "Authentication Failed",
            description: errorMessage,
            variant: "destructive"
          });
        });
      }

      // Set up login bounce handler to stop loading state when app is refocused
      if (window.electron.handleLoginBounce) {
        unsubscribeLoginBounce = window.electron.handleLoginBounce(() => {
          setLoading(false);
        });
      }

      // Listen for sign-out requests from the main process
      if (window.electron.handleInitiateRendererSignOut) {
        unsubscribeInitiateSignOut = window.electron.handleInitiateRendererSignOut(async () => {
          try {
            // The main process has already signed out its client.
            // Now, we sign out the renderer client, which will trigger the
            // 'SIGNED_OUT' event in onAuthStateChange and handle cleanup.
            const { error } = await supabase.auth.signOut();
            if (error) {
              // Even if Supabase signOut fails, we should still clear local state
              setSession(null);
              setUser(null);
              clearAllSessionData();
              navigate('/login');
            }
          } catch (err) {
            // Force clear local state even if signOut fails
            setSession(null);
            setUser(null);
            clearAllSessionData();
            navigate('/login');
          }
        });
      }
    }

    // Cleanup function to prevent memory leaks
    return () => {
      if (unsubscribeAuthCallback) {
        unsubscribeAuthCallback();
      }
      if (unsubscribeAuthError) {
        unsubscribeAuthError();
      }
      if (unsubscribeLoginBounce) {
        unsubscribeLoginBounce();
      }
      if (unsubscribeInitiateSignOut) {
        unsubscribeInitiateSignOut();
      }
    };

  }, [navigate]);

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success!", description: "Your account has been created." });
      navigate('/');
    }
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back!", description: "You have successfully signed in." });
      navigate('/');
    }
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    if (isElectron()) {
      try {
        setLoading(true);
        
        // For Electron, the main process handles the entire OAuth flow.
        // This is the single source of truth for initiating authentication.
        if (window.electron?.initiateGoogleOAuth) {
          await window.electron.initiateGoogleOAuth();
        } else {
          // This case should ideally not be reached if the preload script is working correctly.
          throw new Error('Google OAuth initiation is not available.');
        }

      } catch (error: any) {
        toast({ title: 'Google Sign-In Failed', description: error.message, variant: 'destructive' });
        setLoading(false);
      }
    } else {
      // Fallback for web/mobile if needed
      try {
        setLoading(true);
        // In the browser, we use Supabase's standard OAuth flow
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/callback`,
          },
        });
        if (error) throw error;
      } catch (error: any) {
        toast({ title: 'Google Sign-In Failed', description: error.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
  };

  const linkGoogleCalendar = async () => {
    const isElectronApp = isElectron();
    try {
      setLoading(true);
      setIsLinkingCalendar(true);
  
      if (isElectronApp) {
        if (window.electron?.initiateGoogleCalendarLinking) {
          await window.electron.initiateGoogleCalendarLinking();
          // In Electron, loading state will be managed by the auth callback listener.
        } else {
          throw new Error('Google Calendar linking is not available.');
        }
      } else {
        // Standard web flow
        const oauthOptions = {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            scope: 'email profile https://www.googleapis.com/auth/calendar.readonly',
          },
          redirectTo: `${window.location.origin}/callback`,
        };
    
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: oauthOptions,
        });
    
        if (error) throw error;
    
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch (error: any) {
      toast({ title: "Google Calendar Linking Failed", description: error.message, variant: "destructive" });
      setIsLinkingCalendar(false);
      setLoading(false); // Reset loading on error for all environments
    }
  };

  const setupGoogleCalendar = async (
    googleAccessToken: string,
    googleRefreshToken: string | undefined,
    supabaseAccessToken: string,
    expiresIn: number | undefined,
    userId: string
  ) => {
    if (!window.electron || !('setupGoogleCalendar' in window.electron)) {
      toast({
        title: "Setup Not Available",
        description: "The function to set up Google Calendar is not available in this environment.",
        variant: "destructive"
      });
      return;
    }
  
    try {
      // Use the generic 'invoke' method to call the main process handler
      const result = await window.electron.invoke('setup-google-calendar', {
        refreshToken: googleRefreshToken,
        accessToken: googleAccessToken,
        supabaseAccessToken,
        expiresIn,
        userId,
      });
  
      if (result.success) {
        toast({
          title: "Calendar Linked",
          description: "Your Google Calendar has been successfully linked.",
        });
      } else {
        throw new Error(result.error || "An unknown error occurred during calendar setup.");
      }
    } catch (error: any) {
      toast({
        title: "Calendar Linking Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    setLoading(true);
    
    try {
      if (isElectron() && window.electron?.signOut) {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Sign out timeout - taking too long')), 10000); // 10 second timeout
        });
        
        const signOutPromise = window.electron.signOut();
        const result = await Promise.race([signOutPromise, timeoutPromise]);
        
        if (result && result.error) {
          throw new Error(result.error.message);
        }
      } else {
        // In a web environment, we sign out the renderer client directly.
        const { error } = await supabase.auth.signOut();
        if (error) {
          throw error;
        }
      }
      // The onAuthStateChange listener will handle navigation, state cleanup,
      // and toast notifications upon successful sign-out.
    } catch (err: any) {
      toast({
        title: "Sign out failed",
        description: err.message || "An unexpected error occurred",
        variant: "destructive"
      });
      // Only stop loading on error, success is handled by auth state change
      setLoading(false); 
    }
  };

  const forceSignOut = async () => {
    setLoading(true);
    try {
      // Clear local state immediately
      setSession(null);
      setUser(null);
      
      // Clear all session data
      clearAllSessionData();
      
      // Try to sign out from Supabase (this might fail if session is invalid)
      try {
        await supabase.auth.signOut();
      } catch (error) {
        // Silent error handling for production
      }
      
      // Navigate to login
      navigate('/login');
      toast({ 
        title: "Signed out", 
        description: "You have been successfully signed out." 
      });
    } catch (err: any) {
      toast({
        title: "Sign out completed",
        description: "You have been signed out locally."
      });
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  // Handle external auth token (from deep link)
  const handleExternalAuth = async (accessToken: string, refreshToken: string) => {
    try {
      setLoading(true);
      
      // Use the token to set up a session with Supabase
      if (window.electron && 'setExternalAuthToken' in window.electron) {
        // In Electron, we'll use the main process to handle this
        window.electron.setExternalAuthToken(accessToken, refreshToken);
        // The auth callback handler will take care of the rest
      } else {
        // In browser, we'll handle it directly
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (error) {
          throw new Error(`Failed to set session: ${error.message}`);
        }
        
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          toast({
            title: "Welcome back!",
            description: "You've been automatically signed in."
          });
          navigate('/');
        }
      }
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Expose handleExternalAuth to window for deep linking
  useEffect(() => {
    // @ts-ignore - Add to window for external access
    window.handleExternalAuth = handleExternalAuth;
    
    // @ts-ignore - Add debug function for clearing session
    window.debugClearSession = forceSignOut;
    
    return () => {
      // @ts-ignore - Clean up
      delete window.handleExternalAuth;
      // @ts-ignore - Clean up
      delete window.debugClearSession;
    };
  }, [forceSignOut]);

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      loading, 
      signIn, 
      signUp, 
      signInWithGoogle, 
      signOut, 
      linkGoogleCalendar,
      handleExternalAuth,
      forceSignOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
