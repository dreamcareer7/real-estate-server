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
}
