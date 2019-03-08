declare type TCrmAssoicationType = 'deal' | 'contact' | 'listing' | 'email';
declare type TCrmAssociationParentType = 'crm_task';

declare interface IAssociationFilters {
  deal?: UUID;
  contact?: UUID;
  listing?: UUID;
  email?: UUID;
}

declare interface ICrmAssociationInputBase {
  id?: UUID;
  index?: number;
  metadata?: any;
  task?: UUID;
}

declare interface ICrmAssociationInputListing extends ICrmAssociationInputBase {
  association_type: "listing";
  listing: UUID;
}

declare interface ICrmAssociationInputContact extends ICrmAssociationInputBase {
  association_type: "contact";
  contact: UUID;
}

declare interface ICrmAssociationInputDeal extends ICrmAssociationInputBase {
  association_type: "deal";
  deal: UUID;
}

declare interface ICrmAssociationInputEmail extends ICrmAssociationInputBase {
  association_type: "email";
  email: UUID;
}

declare type ICrmAssociationInput = 
  | ICrmAssociationInputContact
  | ICrmAssociationInputDeal
  | ICrmAssociationInputListing
  | ICrmAssociationInputEmail;

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
  email: UUID;

  index?: number;
  metadata?: any;
}

declare interface ICrmAssociationsCategorized {
  deals: UUID[];
  contacts: UUID[];
  listings: UUID[];
  emails: UUID[];
}
