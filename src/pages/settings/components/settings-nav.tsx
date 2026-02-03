import { cn } from "@/lib/utils";
import { User, Settings, Bell } from "lucide-react";

interface SettingsNavProps {
  activeSection: 'profile' | 'audio' | 'permissions';
  onSectionChange: (section: 'profile' | 'audio' | 'permissions') => void;
}

/**
 * SettingsNav Component
 * 
 * Navigation bar for settings sections with visual indicators for the active section.
 * Uses a clean, minimal design with icons and labels.
 */
export function SettingsNav({ activeSection, onSectionChange }: SettingsNavProps) {
  const navItems = [
    {
      id: 'profile' as const,
      label: 'Profile',
      icon: User,
    },
    {
      id: 'audio' as const,
      label: 'Audio Settings',
      icon: Settings,
    },
    {
      id: 'permissions' as const,
      label: 'Permissions',
      icon: Bell,
    },
  ];

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <nav className="flex items-center space-x-4 lg:space-x-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                activeSection === item.id
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
