declare type TCrmAssoicationType = 'deal' | 'contact' | 'listing';
declare type TCrmAssociationParentType = 'crm_task';

declare interface IAssociationFilters {
  deal?: UUID;
  contact?: UUID;
  listing?: UUID;
}

declare interface ICrmAssociationInput {
  id?: UUID;

  association_type: "listing" | "deal" | "contact";
  listing: UUID;
  deal: UUID;
  contact: UUID;

  crm_task: UUID;

  index?: number;
  metadata?: any;
}

declare interface ICrmAssociation {
  id?: UUID;
  created_at: number;
  updated_at: number;
  deleted_at?: number;
  brand: UUID;
  created_by: UUID;
  deleted_by?: UUID;

  association_type: TCrmAssoicationType;

  crm_task: UUID;

  deal: UUID;
  contact: UUID;
  listing: UUID;

  index?: number;
  metadata?: any;
}

declare interface ICrmAssociationsCategorized {
  deals: UUID[];
  contacts: UUID[];
  listings: UUID[];
}
