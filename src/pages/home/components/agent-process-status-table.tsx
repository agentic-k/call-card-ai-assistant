import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle, MinusCircle } from "lucide-react";

export type AgentProcessStatus = "not-started" | "in-progress" | "success" | "failed" | "skipped";

export interface AgentProcessStatusItem {
  type: "linkedin" | "company" | "call-call";
  status: AgentProcessStatus;
  data: any | null;
  skipReason?: string;
}

interface AgentProcessStatusRowProps {
  item: AgentProcessStatusItem;
  onRetry: (type: "linkedin" | "company" | "call-call") => void;
}

const AgentProcessStatusRow: React.FC<AgentProcessStatusRowProps> = ({ item, onRetry }) => {
  const getStatusDetails = (status: AgentProcessStatus) => {
    switch (status) {
      case "not-started":
        return { 
          label: "Not Started", 
          variant: "secondary" as const,
          icon: <AlertCircle className="h-4 w-4 mr-1" />
        };
      case "in-progress":
        return { 
          label: "In Progress", 
          variant: "outline" as const,
          icon: <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        };
      case "success":
        return { 
          label: "Success", 
          variant: "default" as const,
          icon: <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
        };
      case "failed":
        return { 
          label: "Failed", 
          variant: "destructive" as const,
          icon: <XCircle className="h-4 w-4 mr-1" />
        };
      case "skipped":
        return { 
          label: "Skipped", 
          variant: "secondary" as const,
          icon: <MinusCircle className="h-4 w-4 mr-1 text-gray-500" />
        };
    }
  };

  const { label, variant, icon } = getStatusDetails(item.status);
  const getTitle = (type: string) => {
    switch (type) {
      case "linkedin":
        return "LinkedIn Profile";
      case "company":
        return "Company Website";
      case "call-call":
        return "Call Card";
      default:
        return type;
    }
  };

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="flex flex-col">
        <span className="font-medium">{getTitle(item.type)} Data</span>
        {item.status === "skipped" && item.skipReason && (
          <span className="text-xs text-muted-foreground mt-1">{item.skipReason}</span>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant={variant} className="flex items-center">
          {icon}
          {label}
        </Badge>
        {item.status === "failed" && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onRetry(item.type)}
            className="h-7 px-2"
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};

interface AgentProcessStatusDisplayProps {
  statuses: AgentProcessStatusItem[];
  onRetry: (type: "linkedin" | "company" | "call-call") => void;
  isVisible: boolean;
}

export const AgentProcessStatusDisplay: React.FC<AgentProcessStatusDisplayProps> = ({ 
  statuses, 
  onRetry,
  isVisible 
}) => {
  if (!isVisible) return null;
  
  return (
    <>
      <Badge variant="default" className="text-sm">Agent Status</Badge>
    <div className="border rounded-md p-4 space-y-2">
      {statuses.map((status, index) => (
        <AgentProcessStatusRow 
          key={index} 
          item={status} 
          onRetry={onRetry} 
        />
      ))}
    </div>
    </>
  );
};

export default AgentProcessStatusDisplay; 