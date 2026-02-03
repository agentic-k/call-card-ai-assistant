import { BrowserRouter as Router, Routes, Route, HashRouter, Navigate } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationsProvider } from '@/contexts/notifications-context';
import { PermissionGate } from "./components/PermissionGate";
import Layout from "./components/layout/Layout";
import UnauthLayout from "./components/layout/unauth-layout";
import AuthLayout from "./components/AuthLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import LoginPage from "./pages/auth/page";
import SignupPage from "./pages/auth/signup";
import Settings from "./pages/settings/page";
import StartMeetingPage from "./pages/start-meeting/page";
import NotFound from "./pages/NotFound";
import BackgroundParticles from "./components/BackgroundParticles";
import GCalendarPage from "./pages/g-calendar/page";
import LoginWithGoogle from "./pages/login-with-google";

const queryClient = new QueryClient();

// Use HashRouter for Electron to work with file:// protocol
const RouterComponent = process.env.NODE_ENV === 'production' ? HashRouter : Router;

const App = () => {
  return (
    <RouterComponent>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <NotificationsProvider>
              <PermissionGate>
              <Toaster />
              <Sonner />
              <Routes>
                {/* All other routes go through the AuthLayout */}
                <Route element={<AuthLayout />}>
                  {/* Public routes */}
                  <Route path="/login" element={<UnauthLayout><LoginPage /></UnauthLayout>} />
                  <Route path="/signup" element={<UnauthLayout><SignupPage /></UnauthLayout>} />
                  <Route path="/login-with-google" element={<LoginWithGoogle />} />

                  {/* --------- Protected routes --------- */}
                  <Route path="/" element={<Navigate to="/g-calendar" replace />} />
                  <Route path="/start-meeting" element={<ProtectedRoute><Layout><StartMeetingPage /></Layout></ProtectedRoute>} />
                  <Route path="/start-meeting/:templateId" element={<ProtectedRoute><Layout><StartMeetingPage /></Layout></ProtectedRoute>} />
                  <Route path="/setting" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
                  <Route path="/g-calendar" element={<ProtectedRoute><Layout><GCalendarPage /></Layout></ProtectedRoute>} />
                  
                  {/* Special routes */}
                  <Route path="/checklist-floating" element={
                    <ProtectedRoute>
                      <div className="h-screen p-2 rounded-lg bg-background/90 backdrop-blur-md border border-border shadow-lg overflow-hidden">
                        <StartMeetingPage />
                      </div>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
              <BackgroundParticles />
            </PermissionGate>
            </NotificationsProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </RouterComponent>
  );
};

export default App;
