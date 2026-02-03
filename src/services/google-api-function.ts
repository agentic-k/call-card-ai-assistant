import {
  getFunction,
} from '@/lib/supabase/functionsClient'

export interface PermissionStatus {
  status: 'granted' | 'denied' | 'pending';
}

export const checkGoogleCalendarPermission = () =>
  getFunction<PermissionStatus>('google-calendar-permission') 