export interface SuperCampaignApiInput {
  due_at?: number;
  subject?: string;
  description?: string;
  template_instance?: UUID;
  tags?: string[];
  eligible_brands?: UUID[];
}

export interface SuperCampaignInput extends SuperCampaignApiInput {
  created_by: UUID;
  brand: UUID;
}

export interface SuperCampaignStored extends IModel {
  created_by: UUID;
  brand: UUID;
  due_at?: number;
  executed_at?: number;
  subject?: string;
  template_instance?: UUID;
  tags?: string[];
  eligible_brands: UUID[];
}

export interface Filter extends PaginationOptions {
  status?: 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'EXECUTED';
  brand_in?: IBrand['id'][];
}

export interface SuperCampaignEnrollment extends Pick<IModel, 'id' | 'created_at' | 'updated_at'> {
  super_campaign: SuperCampaignStored['id'];
  type: 'super_campaign_enrollment';
  brand: IBrand['id'];
  user: IUser['id'];
  tags: string[];
}

export interface SuperCampaignEnrollmentFilterOptions extends Omit<PaginationOptions, 'order'> {
  super_campaign?: SuperCampaignStored['id'];
  brand?: IBrand['id'];
  user?: IUser['id'];
}

export type SuperCampaignEnrollmentInput = Pick<SuperCampaignStored, 'super_campaign' | 'brand' | 'user' | 'tags'>
