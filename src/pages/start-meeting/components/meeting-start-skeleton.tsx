import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface MeetingStartSkeletonProps {
  templateName?: string;
  isAutoStart?: boolean;
}

const MeetingStartSkeleton: React.FC<MeetingStartSkeletonProps> = ({ 
  templateName, 
  isAutoStart = false 
}) => {
  const getLoadingMessage = () => {
    if (isAutoStart) {
      return {
        title: 'Starting your meeting...',
        subtitle: 'Preparing your template and setting up the meeting interface'
      };
    }
    
    return {
      title: templateName ? `Starting "${templateName}"...` : 'Starting your meeting...',
      subtitle: 'Setting up your meeting interface and optimizing window layout'
    };
  };

  const { title, subtitle } = getLoadingMessage();

  return (
    <div className="space-y-6 p-4">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Meeting Status Card Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar Skeleton */}
            <div>
              <div className="flex justify-between mb-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
            
            {/* Timer Skeleton */}
            <div className="flex items-center justify-center space-x-4">
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Section Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Question Items Skeleton - show 4 for auto-start, 5 for normal start */}
            {Array.from({ length: isAutoStart ? 4 : 5 }, (_, index) => (
              <div key={index + 1} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Skeleton */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-20" />
        <div className="flex space-x-2">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-2 w-2 rounded-full" />
        </div>
        <Skeleton className="h-10 w-20" />
      </div>

      {/* Loading Message */}
      <div className="text-center mt-8">
        <div className="flex items-center justify-center space-x-2 mb-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-lg font-medium text-foreground">
            {title}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default MeetingStartSkeleton; 