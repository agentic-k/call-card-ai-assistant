import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CallFramework } from './call-framework-progress-tab';

/**
 * MeetingTabs component displays the navigation tabs at the bottom of the meeting interface
 * allowing users to switch between different views
 */
interface MeetingTabsProps {
  salesFramework?: CallFramework | null;
}

const MeetingTabs: React.FC<MeetingTabsProps> = ({ salesFramework }) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-10 border-t bg-background/95 backdrop-blur-sm z-50">
      <div className="container h-full max-w-2xl mx-auto px-2">
        <TabsList 
          className={`grid h-full w-full gap-1 rounded-none bg-transparent ${
            salesFramework ? 'grid-cols-5' : 'grid-cols-4'
          }`}
        >
          <TabsTrigger value="call" className="text-xs data-[state=active]:bg-muted/50 rounded-none">Call</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs data-[state=active]:bg-muted/50 rounded-none">Insights</TabsTrigger>
          {salesFramework && (
            <TabsTrigger value="framework" className="text-xs data-[state=active]:bg-muted/50 rounded-none">
              {salesFramework.framework_name || 'Framework'}
            </TabsTrigger>
          )}
          <TabsTrigger value="transcript" className="text-xs data-[state=active]:bg-muted/50 rounded-none">Transcript</TabsTrigger>
          <TabsTrigger value="actions" className="text-xs data-[state=active]:bg-muted/50 rounded-none">Actions</TabsTrigger>
        </TabsList>
      </div>
    </div>
  );
};

export default MeetingTabs;
