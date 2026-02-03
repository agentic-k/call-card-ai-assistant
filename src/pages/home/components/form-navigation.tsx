import { Button } from "@/components/ui/button";

interface FormNavigationProps {
  step: number;
  isSubmitting: boolean;
  isTemplateCreated: boolean;
  onPrevStep: () => void;
  onTemplateEdit: () => void;
}

const FormNavigation = ({ 
  step, 
  isSubmitting, 
  isTemplateCreated, 
  onPrevStep, 
  onTemplateEdit 
}: FormNavigationProps) => {
  return (
    <>
      <div className="flex justify-end min-w-full">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevStep}
          disabled={step === 1 || isSubmitting}
        >
          Back
        </Button>
        
        {step === 1 && (
          <Button 
            className="ml-4"
            type="submit"
            disabled={isSubmitting}
          >
            Continue
          </Button>
        )}
      </div>
      
      {step === 2 && isTemplateCreated && (
        <div className="flex justify-center mt-4">
          <Button
            type="button"
            onClick={onTemplateEdit}
            className="w-full"
          >
            Edit Callcard
          </Button>
        </div>
      )}
    </>
  );
};

export default FormNavigation; 