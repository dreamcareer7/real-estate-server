declare interface IContactBase extends IModel {
  merged: boolean;
  ios_address_book_id?: String;
  android_address_book_id?: String;
}

declare interface IParentContact extends IContactBase {
  users?: UUID[];
  brands?: IBrand[];
  deals?: IDeal[];
  sub_contacts: IContact[];

  type: "contact";
}

declare interface IContact extends IContactBase {
  deleted_at?: number | null;
  type: "sub_contact";
  user: UUID;

  attributes: StringMap<IContactAttribute[]>;
  emails: IContactEmailAttribute[];
  phone_numbers: IContactPhoneAttribute[];
  refs: UUID[];
}

declare type EAttributeTypes =
  | "phone_number"
  | "email"
  | "name"
  | "birthday"
  | "tag"
  | "profile_image_url"
  | "cover_image_url"
  | "company"
  | "job_title"
  | "stage"
  | "address"
  | "website"
  | "source_type"
  | "source_id"
  | "last_modified_on_source"
  | "brand"
  | "note"
  | "relation";

declare interface IContactAttribute {
  id: UUID;
  created_at: number;
  updated_at?: number;
  type: EAttributeTypes;

  label?: String;
  is_primary: boolean;
}

declare interface IContactNameAttribute extends IContactAttribute {
  type: 'name';
  title: String;
  first_name: String;
  middle_name: String;
  last_name: String;
  nickname: String;
  legal_prefix: String;
  legal_first_name: String;
  legal_middle_name: String;
  legal_last_name: String;
}

declare interface IContactAddressAttribute extends IContactAttribute {
  type: 'address';
  street_name: String;
  city: String;
  state: String;
  country: String;
  postal_code: String;
}

declare interface IContactEmailAttribute extends IContactAttribute {
  type: "email";
  email: String;
}

declare interface IContactPhoneAttribute extends IContactAttribute {
  type: "phone_number";
  phone_number: String;
}

type PatchableFields = Pick<
  IParentContact,
  "ios_address_book_id" | "android_address_book_id"
>;

declare interface IAddContactOptions {
  /** Return {ParentContact} object or just id */
  get?: boolean;
  /** Continute on add attribute error */
  relax?: boolean;
  /** Add activity record? */
  activity?: boolean;
}

declare interface IContactSummary {
  display_name: String;
  abbreviated_display_name: String;
  legal_full_name: String;
  email: String;
  phone_number: String;
}

declare namespace Contact {
  function extractNameInfo(contact: IParentContact): String[];
  function getDisplayName(contact: IParentContact): String;
  function getAbbreviatedDisplayName(contact: IParentContact): String;
  function summarize(contact: IParentContact): IContactSummary;

  function getForUser(
    user_id: UUID,
    paging: any,
    cb: Callback<IParentContact[]>
  ): void;
  function get(contact_id: UUID, cb: Callback<IParentContact>): void;
  function getAll(contact_ids: UUID[], cb: Callback<IParentContact[]>): void;
  function add(
    user_id: UUID,
    contact: IContact,
    options?: IAddContactOptions
  ): Promise<IParentContact>;
  function remove(contact_id: UUID, cb: Callback<void>): void;
  function patch(
    contact_id: UUID,
    params: PatchableFields,
    cb: Callback<void>
  ): void;
  function patchAttribute(
    contact_id: UUID,
    user_id: UUID,
    attribute_id: UUID,
    attribute_type: EAttributeTypes,
    attribute:
      | IContactAttribute
      | IContactEmailAttribute
      | IContactPhoneAttribute,
    cb: Callback<IParentContact>
  ): void;
  function addAttribute(
    contact_id: UUID,
    user_id: UUID,
    attribute: IContactAttribute,
    cb: Callback<IParentContact>
  ): void;
  function deleteAttribute(
    contact_id: UUID,
    user_id: UUID,
    attribute_id: UUID,
    cb: Callback<void>
  ): void;
  function getAttribute(
    contact_id: UUID,
    user_id: UUID,
    attribute_id: UUID,
    cb: Callback<IContactAttribute>
  ): void;
  function getByTags(
    user_id: UUID,
    tags: String[],
    cb: Callback<IParentContact>
  ): void;
  function getByAttribute(
    user_id: UUID,
    attribute: String,
    values: any[],
    includeDeleted: boolean
  ): Promise<IParentContact[]>;
  function stringSearch(
    user_id: UUID,
    terms: String[],
    limit: number,
    cb: Callback<IParentContact[]>
  ): void;
  function getAllTags(user_id: UUID, cb: Callback<String[]>): void;
  function setRefs(contact_id: UUID, refs: UUID[], cb: Callback<void>): void;

  type TOverride = Record<"source_type" | "brand", String>;

  function isConnected(
    user_id: UUID,
    peer_id: UUID,
    cb: Callback<boolean>
  ): void;
  function connect(
    user_id: UUID,
    peer_id: UUID,
    override: TOverride,
    cb: Callback<void>
  ): void;
  function join(
    user_id: UUID,
    peer_id: UUID,
    override: TOverride,
    cb: Callback<IParentContact>
  ): void;
  function convertUser(user: IUser, override: TOverride): IContact;

  function publicize(model: IContact): IContact;

  function emit(event: string | symbol, ...args: any[]): boolean;

  let associations: StringMap<IModelAssociation>;
}
