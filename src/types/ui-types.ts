// UI Types
// Gene

export interface LinkedInCompanyData {
  id?: string;
  url?: string;
  name?: string;
  about?: string;
  slogan?: string;
  funding?: string | null;
  website?: string;
  followers?: number | null;
  investors?: string[];
  locations?: string[];
  timestamp?: string;
  company_id?: string;
  industries?: string;
  description?: string;
  company_size?: string;
  crunchbase_url?: string | null;
  organization_type?: string;
  unformatted_about?: string;
  website_simplified?: string;
  employees_in_linkedin?: number | null;
}

export interface LinkedInCompanyResponse {
  data: LinkedInCompanyData;
}

export interface LinkedInCurrentCompany {
  link?: string;
  name?: string;
  company_id?: string;
}

export interface LinkedInProfileData {
  id?: string;
  name?: string;
  city?: string;
  country_code?: string;
  about?: string;
  posts?: any[];
  current_company?: LinkedInCurrentCompany;
  experience?: any;
  url?: string;
  educations_details?: string;
  volunteer_experience?: any[];
  location?: string;
  current_company_company_id?: string;
  current_company_name?: string;
}

export interface LinkedInProfileResponse {
  data: LinkedInProfileData;
}