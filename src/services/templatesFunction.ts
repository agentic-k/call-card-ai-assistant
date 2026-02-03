import {
  getFunction,
  postFunction,
  putFunction,
  deleteFunction,
} from '@/lib/supabase/functionsClient'
import { Database } from '@/integrations/supabase/types'

export type Template = Database['public']['Tables']['templates']['Row']
export type CreateTemplate = Database['public']['Tables']['templates']['Insert']
export type UpdateTemplate = Database['public']['Tables']['templates']['Update']

export const getTemplates = () =>
  getFunction<Template[]>('templates')

export const getTemplateById = (templateId: string) =>
  getFunction<Template>(`templates/${templateId}`)

export const createTemplate = (template: CreateTemplate) =>
  postFunction<Template>('templates', template)

export const updateTemplate = (templateId: string, template: UpdateTemplate) =>
  putFunction<Template>(`templates/${templateId}`, template)

export const deleteTemplate = (templateId: string) =>
  deleteFunction(`templates/${templateId}`)