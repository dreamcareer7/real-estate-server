export interface SuperCampaignRecipientInput {
  brand: UUID;
  tag: string;
}

export interface SuperCampaignEmailCampaignInput {
  brand: UUID;
  campaign: UUID;
  super_campaign: UUID;
}

export interface SuperCampaignRecipient extends IModel {
  brand: UUID;
  tag: string;
  super_campaign: UUID;
}

export interface SuperCampaignEmailCampaign {
  super_campaign: UUID;
  brand: UUID;
  campaign: UUID;
  forked_at: number;
  deleted_at: number;
  deleted_by: UUID;

  accepted: number;
  rejected: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  complained: number;
  stored: number;
}

export interface SuperCampaignApiInput {
  due_at: string;
  subject: string;
  template_instance: UUID;
  recipients: SuperCampaignRecipientInput[];
}

export interface SuperCampaignInput {
  created_by: UUID;
  brand: UUID;
  due_at: string;
  subject: string;
  template_instance: UUID;
}

export interface SuperCampaignStored extends IModel {
  created_by: UUID;
  brand: UUID;
  due_at: number;
  executed_at: number;
  subject: string;
  template_instance: UUID;
  recipients: UUID[];
}
