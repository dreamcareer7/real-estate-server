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

export interface Filter extends Omit<PaginationOptions, 'order'> {
  status?: 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'EXECUTED';
  brand_in?: IBrand['id'][];
  executed?: boolean;
  order?: string[];
  draft?: boolean;
}

export interface SuperCampaignEnrollment extends Pick<IModel, 'id' | 'created_at' | 'updated_at'> {
  super_campaign: SuperCampaignStored['id'];
  type: 'super_campaign_enrollment';
  brand: IBrand['id'];
  user: IUser['id'];
  tags: string[];
  created_by: IUser['id'] | null;
}

export interface SuperCampaignEnrollmentFilterOptions extends Omit<PaginationOptions, 'order'> {
  super_campaign?: SuperCampaignStored['id'];
  brand?: IBrand['id'];
  user?: IUser['id'];
  tags?: SuperCampaignEnrollment['tags'];
  including_deleted?: boolean;
  executed?: boolean;
  order?: string[];
  cause?: SuperCampaignEnrollmentCause;
}

export type SuperCampaignEnrollmentInput = Pick<SuperCampaignEnrollment, 'super_campaign' | 'brand' | 'user' | 'tags' | 'created_by'>

export type SuperCampaignEnrollmentCause = 'automatic' | 'self' | 'admin'
