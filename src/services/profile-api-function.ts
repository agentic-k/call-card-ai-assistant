import {
  getFunction,
  postFunction,
  putFunction,
} from '@/lib/supabase/functionsClient'
import { Database } from '@/integrations/supabase/types'
import { LinkedInCompanyData } from "@/types/ui-types"

export type Profile = Database['public']['Tables']['profiles']['Row']
export type CreateProfile = Database['public']['Tables']['profiles']['Insert']
export type UpdateProfile = Database['public']['Tables']['profiles']['Update']
export type CompanyData = LinkedInCompanyData

export const getProfileById = () =>
  getFunction<Profile>('profiles')

export const createProfile = (profile: CreateProfile) =>
  postFunction<Profile>('profiles', profile)

export const updateProfile = (profile: UpdateProfile) =>
  putFunction<Profile>('profiles', profile)
