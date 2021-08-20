import { IStoredTemplate } from '../../Template/types';

export interface BrandTrigger extends Omit<IModel, 'updated_by'> {
  brand: UUID;
  template: UUID;
  template_instance: UUID;
  event_type: string;
  wait_for: number;
  subject: string;
}

export type TBrandTriggerAssociation = 'created_by' | 'brand' | 'template';

export interface BrandTriggerPopulated extends Omit<BrandTrigger, TBrandTriggerAssociation> {
  created_by: IUser;
  brand: IBrand;
  template: IStoredTemplate;
}
