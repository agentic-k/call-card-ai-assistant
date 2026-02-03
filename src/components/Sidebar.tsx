import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Phone,
  User,
  Calendar,
} from 'lucide-react';

const navItems = [
  { to: '/g-calendar', label: 'Calendar', icon: <Phone size={20} /> },
  { to: '/setting', label: 'Settings', icon: <SettingsIcon size={20} /> },
];

// Create context for sidebar state
type SidebarContextType = {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  toggleCollapsed: () => void;
  isMeetingActive: boolean;
  setIsMeetingActive: (value: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// Create provider component
export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  
  // Check URL parameters for sidebar state on mount
  useEffect(() => {
    // Get URL params
    const urlParams = new URLSearchParams(window.location.search);
    const sidebarParam = urlParams.get('sidebar');
    
    if (sidebarParam === 'minimized') {
      setIsCollapsed(true);
    }
    
    // Listen for URL changes
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sidebarParam = urlParams.get('sidebar');
      
      if (sidebarParam === 'minimized') {
        setIsCollapsed(true);
      }
    };
    
    // Handle browser navigation
    window.addEventListener('popstate', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);
  
  const toggleCollapsed = () => setIsCollapsed(prev => !prev);
  
  return (
    <SidebarContext.Provider value={{ 
      isCollapsed, 
      setIsCollapsed, 
      toggleCollapsed, 
      isMeetingActive, 
      setIsMeetingActive 
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

// Custom hook to use sidebar context
export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

const Sidebar: React.FC = () => {
  const { isCollapsed, toggleCollapsed, isMeetingActive } = useSidebar();
  const navigate = useNavigate();
  
  // Effect to handle keyboard shortcut for toggling sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        toggleCollapsed();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapsed]);

  const handleNavigation = (to: string, e: React.MouseEvent) => {
    e.preventDefault();
    navigate(to);
  };

  // Don't render anything if meeting is active
  if (isMeetingActive) {
    return null;
  }

  return (
    <motion.aside 
      className={`bg-sidebar border-r border-border transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-48'}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="h-full flex flex-col">
        <div className={`mb-8 px-4 py-4 flex items-center justify-between ${isCollapsed ? 'justify-center' : ''}`}>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-semibold">CallCard</h1>
              <p className="text-xs text-muted-foreground">v0.0.11</p>
            </div>
          )}
          
          <button 
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        
        <nav className="flex-1 space-y-1 px-2">
          {navItems.map((item) => (
            <NavItem 
              key={item.to} 
              to={item.to} 
              label={item.label} 
              icon={item.icon} 
              isCollapsed={isCollapsed}
              onNavigate={handleNavigation}
            />
          ))}
        </nav>
        
        {!isCollapsed && (
          <div className="mt-auto pt-4 px-2 pb-2">
            <div className="glass-card rounded-xl p-3">
              <p className="text-sm font-medium">Pro Tip</p>
              <p className="text-xs text-muted-foreground">Press ⌘+B to toggle sidebar</p>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
};

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  isCollapsed: boolean;
  onNavigate: (to: string, e: React.MouseEvent) => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, label, icon, isCollapsed, onNavigate }) => {
  return (
    <NavLink 
      to={to} 
      onClick={(e) => onNavigate(to, e)}
      className={({ isActive }) => 
        `flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-lg transition-all relative ${
          isActive 
            ? 'text-primary font-medium bg-primary/5' 
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
        }`
      }
      title={isCollapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          <div className="relative flex items-center">
            {isActive && (
              <motion.div
                className={`absolute ${isCollapsed ? 'left-[-12px]' : 'left-[-16px]'} top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full`}
                layoutId="sidebar-indicator"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <div className="flex-shrink-0">{icon}</div>
          </div>
          {!isCollapsed && <span className="ml-3">{label}</span>}
        </>
      )}
    </NavLink>
  );
};

export default Sidebar;
