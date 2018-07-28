declare type TCrmAssoicationType = 'deal' | 'contact' | 'listing';
declare type TCrmAssociationParentType = 'crm_task' | 'touch' | 'contact_note';

declare interface IAssociationFilters {
  deal?: UUID;
  contact?: UUID;
  listing?: UUID;
}

declare interface ICrmAssociationInput {
  association_type: "listing" | "deal" | "contact";
  listing: UUID;
  deal: UUID;
  contact: UUID;

  crm_task: UUID;
  touch: UUID;
  contact_note: UUID;
}

declare interface ICrmAssociation {
  id?: UUID;
  created_at: number;
  updated_at: number;
  deleted_at?: number;

  association_type: TCrmAssoicationType;

  crm_task: UUID;
  touch: UUID;
  contact_note: UUID;

  deal: UUID;
  contact: UUID;
  listing: UUID;
}

declare interface ICrmAssociationsCategorized {
  deals: UUID[];
  contacts: UUID[];
  listings: UUID[];
}