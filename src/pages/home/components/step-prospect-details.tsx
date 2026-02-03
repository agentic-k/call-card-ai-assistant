import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Step1ProspectProps {
  linkedinUrl: string;
  companyUrl: string;
  callCardContext: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors: {
    linkedinUrl?: string;
    companyUrl?: string;
  };
}

const Step1Prospect: React.FC<Step1ProspectProps> = ({ 
  linkedinUrl, 
  companyUrl,
  callCardContext,
  onChange, 
  errors 
}) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="linkedinUrl">Prospect's LinkedIn Profile URL</Label>
      <Input
        id="linkedinUrl"
        name="linkedinUrl"
        type="url"
        placeholder="https://linkedin.com/in/prospect"
        value={linkedinUrl}
        onChange={onChange}
      />
      {errors.linkedinUrl && (
        <p className="text-destructive text-xs mt-1">{errors.linkedinUrl}</p>
      )}
    </div>
    <div className="space-y-2">
      <Label htmlFor="companyUrl">Prospect's Company URL</Label>
      <Input
        id="companyUrl"
        name="companyUrl"
        type="url"
        placeholder="https://example.com"
        value={companyUrl}
        onChange={onChange}
      />
      {errors.companyUrl && (
        <p className="text-destructive text-xs mt-1">{errors.companyUrl}</p>
      )}
    </div>
    <div className="space-y-2">
      <Label htmlFor="callCardContext">Call Card Context (Optional)</Label>
      <Textarea
        id="callCardContext"
        name="callCardContext"
        placeholder="e.g., specific pain points, recent news, or mutual connections to mention..."
        value={callCardContext}
        onChange={onChange}
        className="min-h-[80px]"
      />
      <p className="text-muted-foreground text-xs">
        Provide any extra context for the AI to generate a more personalized call card.
      </p>
    </div>
  </div>
);

export default Step1Prospect; 