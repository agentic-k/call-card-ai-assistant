
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar, { SidebarProvider } from '../Sidebar';
import TitleBar from '../TitleBar';
import { OpenInDesktopButton } from '../open-in-desktop-button';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Check if we're on macOS
  const isMacOS = navigator.platform.startsWith('Mac');

  useEffect(() => {
    // Add macOS-specific class to body for global styling
    if (isMacOS) {
      document.body.classList.add('mac-os');
    }
    return () => {
      document.body.classList.remove('mac-os');
    };
  }, [isMacOS]);

  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen bg-background text-foreground electron-no-drag">
        <TitleBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          
          <motion.main 
            className="flex-1 overflow-auto p-2 sm:p-3 md:p-5 relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute top-2 right-2 z-10">
              <OpenInDesktopButton />
            </div>
            {children}
          </motion.main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
