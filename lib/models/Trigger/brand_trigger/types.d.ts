import { IStoredTemplateInstance } from '../../Template/instance/types'

export interface BrandTrigger extends Omit<IModel, 'updated_by'> {
  brand: UUID
  template?: UUID
  template_instance?: UUID
  event_type: string
  wait_for: number
  subject: string
}

export interface BrandTriggerInput {
  brand: UUID
  template?: UUID
  template_instance?: UUID
  event_type: string
  wait_for: number
  subject: string
  created_by: UUID
}

export type TBrandTriggerAssociation = 'template_instance' | 'template'

export interface BrandTriggerPopulated extends Omit<BrandTrigger, TBrandTriggerAssociation> {
  template_instance: IStoredTemplateInstance
  template: IModel // TODO: define BrandTemplate interface
}

export interface BrandTriggerExclusion {
  id: UUID
  brand_trigger: UUID
  contact: UUID
  deleted_at: number | null
}