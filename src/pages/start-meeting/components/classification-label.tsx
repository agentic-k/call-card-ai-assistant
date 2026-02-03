import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassifyTextResponse } from '@/types/text-classifier';
import { Loader2 } from 'lucide-react';

interface ClassificationLabelProps {
  classification: ClassifyTextResponse | null;
  isLoading?: boolean;
}

const ClassificationLabel: React.FC<ClassificationLabelProps> = ({ classification, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Classification:</span>
        <Badge variant="outline" className="text-xs px-2 py-0.5 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Processing</span>
        </Badge>
        <Skeleton className="h-4 w-8" />
      </div>
    );
  }

  if (!classification) return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Classification:</span>
      <Badge variant="default" className="text-xs px-2 py-0.5">
        No classification
      </Badge>
    </div>
  );

  // Determine badge variant based on classification label
  const getBadgeVariant = (label: string): 'destructive' | 'default' | 'outline' | 'secondary' => {
    if (label === 'pain_point' || label === 'technical_issue' || label === 'negative' || label === 'error') {
      return 'destructive';
    } else if (label === 'use_case' || label === 'feature_request') {
      return 'default';
    } else if (label === 'positive' || label === 'product_feedback') {
      return 'secondary';
    } else if (label === 'status_update' || label === 'neutral') {
      return 'outline';
    } else {
      return 'default';
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Classification:</span>
      <Badge
        variant={getBadgeVariant(classification.label) || 'default'}
        className="text-xs px-2 py-0.5"
      >
        {classification.label}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {classification.score.toFixed(2)}
      </span>
    </div>
  );
};

export default ClassificationLabel;
