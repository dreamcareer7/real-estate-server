declare type TCrmAssoicationType = 'deal' | 'contact' | 'listing';
declare type TCrmAssociationParentType = 'crm_task' | 'activity' | 'contact_note';

declare interface IAssociationFilters {
  deal?: UUID;
  contact?: UUID;
  listing?: UUID;
}

declare interface ICrmDealAssociationInput {
  association_type: "deal";
  deal: UUID;

  crm_task?: UUID;
  activity?: UUID;
  contact_note?: UUID;
}

declare interface ICrmContactAssociationInput {
  association_type: "contact";
  contact: UUID;

  crm_task?: UUID;
  activity?: UUID;
  contact_note?: UUID;
}

declare interface ICrmListingAssociationInput {
  association_type: "listing";
  listing: UUID;

  crm_task?: UUID;
  activity?: UUID;
  contact_note?: UUID;
}

declare type ICrmAssociationInput =
  | ICrmContactAssociationInput
  | ICrmDealAssociationInput
  | ICrmListingAssociationInput;

declare interface ICrmAssociation {
  id?: UUID;
  created_at: number;
  updated_at: number;
  deleted_at?: number;

  association_type: TCrmAssoicationType;

  crm_task?: UUID;
  activity?: UUID;
  contact_note?: UUID;

  deal?: UUID;
  contact?: UUID;
  listing?: UUID;
}

declare interface ICrmAssociationsCategorized {
  deals: UUID[];
  contacts: UUID[];
  listings: UUID[];
}