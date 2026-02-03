import { Separator } from "@/components/ui/separator";
import { AgentProcessStatusDisplay, AgentProcessStatusItem } from "./agent-process-status-table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface Step2ReviewProps {
  linkedinUrl: string;
  companyUrl: string;
  callCardContext: string;
  scrapeStatuses: AgentProcessStatusItem[];
  onRetry: (type: "linkedin" | "company" | "call-call") => void;
  isSubmitting: boolean;
}

const Step2Review: React.FC<Step2ReviewProps> = ({ 
  linkedinUrl, 
  companyUrl,
  callCardContext,
  scrapeStatuses,
  onRetry,
  isSubmitting
}) => (
  <div className="space-y-4">
    <Collapsible defaultOpen={false} className="w-full">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Review Your Information</h3>
        <CollapsibleTrigger className="hover:opacity-75">
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
      </div>
      <Separator className="my-4" />
      <CollapsibleContent>
        <div className="space-y-2">
          {linkedinUrl && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">LinkedIn URL:</span>
              <span className="font-medium truncate max-w-[250px]">{linkedinUrl}</span>
            </div>
          )}
          {companyUrl && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company URL:</span>
              <span className="font-medium truncate max-w-[250px]">{companyUrl}</span>
            </div>
          )}
          {callCardContext && (
             <div className="flex flex-col space-y-1">
              <span className="text-muted-foreground">Context:</span>
              <p className="font-medium text-sm text-wrap">
                {callCardContext}
              </p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
    
    <AgentProcessStatusDisplay 
      statuses={scrapeStatuses}
      onRetry={onRetry}
      isVisible={isSubmitting || scrapeStatuses.some(status => status.status === "success" || status.status === "failed")}
    />
  </div>
);

export default Step2Review; 