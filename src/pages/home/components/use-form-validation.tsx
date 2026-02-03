import { useState } from 'react';

interface FormData {
  linkedinUrl: string;
  companyUrl: string;
  callCardContext: string;
}

interface FormErrors {
  linkedinUrl: string | undefined;
  companyUrl: string | undefined;
}

export const useFormValidation = () => {
  const [errors, setErrors] = useState<FormErrors>({
    linkedinUrl: undefined,
    companyUrl: undefined,
  });

  const validateLinkedinUrl = (url: string): boolean => {
    if (!url) return false;
    const linkedinRegex = /^https:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9-_]+\/?$/;
    return linkedinRegex.test(url);
  };

  const validateUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  };

  const clearFieldError = (fieldName: keyof FormErrors) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: undefined
    }));
  };

  const validateForm = (formData: FormData): boolean => {
    const newErrors: FormErrors = {
      linkedinUrl: undefined,
      companyUrl: undefined,
    };

    if (!formData.linkedinUrl) {
      newErrors.linkedinUrl = "LinkedIn profile URL is required";
    } else if (!validateLinkedinUrl(formData.linkedinUrl)) {
      newErrors.linkedinUrl = "Please enter a valid LinkedIn profile URL";
    }

    if (!formData.companyUrl) {
      newErrors.companyUrl = "Company URL is required";
    } else if (!validateUrl(formData.companyUrl)) {
      newErrors.companyUrl = "Please enter a valid company URL";
    }

    setErrors(newErrors);

    // Check if there are any errors
    return !Object.values(newErrors).some(error => error !== undefined);
  };

  const resetErrors = () => {
    setErrors({
      linkedinUrl: undefined,
      companyUrl: undefined,
    });
  };

  return {
    errors,
    validateForm,
    clearFieldError,
    resetErrors
  };
}; 