"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';

// Services
import { getProfileById, type Profile } from "@/services/profile-api-function";

// Page-specific components
import StepIndicator from "./components/step-indicator";
import Step1Prospect from "./components/step-prospect-details";
import Step2Review from "./components/step-review";
import HomePageHeader from "./components/home-page-header";
import FormNavigation from "./components/form-navigation";

// Custom hooks
import { useFormValidation } from "./components/use-form-validation";
import { useDataCollection } from "./components/use-data-collection";

const steps = [
  { number: 1, title: "Prospect Info" },
  { number: 2, title: "Generate Call Pack" }
];

const HomePage = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    linkedinUrl: "",
    companyUrl: "",
    callCardContext: "",
  });
  
  // Profile data state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  
  // Custom hooks for separated concerns
  const { errors, validateForm, clearFieldError } = useFormValidation();
  const { 
    scrapeStatuses, 
    templateId, 
    isSubmitting, 
    handleRetry, 
    startDataCollection, 
    isTemplateCreated 
  } = useDataCollection();

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        setProfileError(null);
        const profileData = await getProfileById();
        setProfile(profileData);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setProfileError(error instanceof Error ? error.message : 'Failed to fetch profile');
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name as keyof typeof errors);
  };

  const handleNextStep = () => {
    if (step === 1 && !validateForm(formData)) {
      return;
    }

    if (step < 2) {
      setStep(step + 1);
      
      // Auto-start data collection when moving to step 2
      if (step === 1) {
        setTimeout(() => {
          startDataCollection(formData, profile);
        }, 0);
      }
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      handleNextStep();
    }
  };

  const handleTemplateEdit = () => {
    if (templateId) {
      // Navigate to start meeting with the template instead
      navigate(`/start-meeting/${templateId}`);
    }
  };

  const handleRetryWithFormData = (type: "linkedin" | "company" | "call-call") => {
    handleRetry(type, formData, profile);
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-12">
      <HomePageHeader 
        title="Sales Call Tool v0.0.11"
        description="Generate your AI-powered Call Pack in two simple steps"
      />
      
      {/* <StepIndicator steps={steps} currentStep={step} /> */}
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            {step === 1 && "Enter Prospect Details"}
            {step === 2 && "Review and Submit"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Add your prospect's LinkedIn profile URL"}
            {step === 2 && "Confirm your details before generating your Call Pack"}
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {step === 1 && (
              <Step1Prospect 
                linkedinUrl={formData.linkedinUrl}
                companyUrl={formData.companyUrl}
                callCardContext={formData.callCardContext}
                onChange={handleInputChange}
                errors={errors}
              />
            )}
            {step === 2 && (
              <Step2Review 
                linkedinUrl={formData.linkedinUrl}
                companyUrl={formData.companyUrl}
                callCardContext={formData.callCardContext}
                scrapeStatuses={scrapeStatuses}
                onRetry={handleRetryWithFormData}
                isSubmitting={isSubmitting}
              />
            )}
          </CardContent>
          
          <CardFooter>
            <FormNavigation
              step={step}
              isSubmitting={isSubmitting}
              isTemplateCreated={isTemplateCreated()}
              onPrevStep={handlePrevStep}
              onTemplateEdit={handleTemplateEdit}
            />
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default HomePage;
