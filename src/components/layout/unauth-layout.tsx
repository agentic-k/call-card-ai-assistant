
import React from 'react';
import { motion } from 'framer-motion';
import { SidebarProvider } from '../Sidebar';
import TitleBar from '../TitleBar';
import { OpenInDesktopButton } from '../open-in-desktop-button';

interface UnauthLayoutProps {
  children: React.ReactNode;
}

const UnauthLayout: React.FC<UnauthLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen bg-background text-foreground macos-window electron-no-drag">
        <TitleBar />
        <div className="flex flex-1 overflow-hidden">
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

export default UnauthLayout;
