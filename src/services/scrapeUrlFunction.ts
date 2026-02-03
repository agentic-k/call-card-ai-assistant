import { postFunction } from '@/lib/supabase/functionsClient'
import { LinkedInCompanyResponse, LinkedInProfileResponse } from "@/types/ui-types"

export const scrapeLinkedinProfile = (linkedinProfileUrl: string) =>
    postFunction<LinkedInProfileResponse>('scrape-data-integration/linkedin-profile', { url: linkedinProfileUrl })

export const scrapeCompanyWebsite = (companyWebsiteUrl: string) =>
    postFunction<LinkedInCompanyResponse>('scrape-data-integration/linkedin-company-profile', { url: companyWebsiteUrl })
