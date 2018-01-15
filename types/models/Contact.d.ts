declare interface IContact extends IModel {
  ios_address_book_id?: String;
  android_address_book_id?: String;

  attributes: IContactAttribute[];
  users?: IUser[];
  brands?: IBrand[];
  deals?: IDeal[];
}

declare type EAttributeTypes = 
  "phone_number" |
  "email" |
  "name" |
  "birthday" |
  "tag" |
  "profile_image_url" |
  "cover_image_url" |
  "company" |
  "stage" |
  "address" |
  "source_type" |
  "brand" |
  "note" |
  "relation";

declare interface IContactAttribute {
  id: UUID;
  created_at: number;
  updated_at?: number;
  type: EAttributeTypes;
  value: any;
}

// FIXME: Not sure of the type here
declare interface IContactAttributeInput {
  type: EAttributeTypes;
  attribute: any;
}

declare interface IContactEmailAttributeInput {
  type: 'email';
  email: String;
}

declare interface IContactPhoneAttributeInput {
  type: 'phone_number';
  phone_number: String;
}

type PatchableFields = Pick<
  IContact,
  "ios_address_book_id" | "android_address_book_id"
>;

declare namespace Contact {
  function extractNameInfo(contact: IContact): String[];
  function getDisplayName(contact: IContact): String;
  function getAbbreviatedDisplayName(contact: IContact): String;

  function getForUser(user_id: UUID, paging: any, cb: Callback<IContact[]>): void;
  function get(contact_id: UUID, cb: Callback<IContact>): void;
  function getAll(contact_ids: UUID[], cb: Callback<IContact[]>): void;
  function add(user_id: UUID, contact: IContact, cb: Callback<IContact>): void;
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
    attribute: IContactAttributeInput | IContactEmailAttributeInput | IContactPhoneAttributeInput,
    cb: Callback<IContact>
  ): void;
  function addAttribute(
    contact_id: UUID,
    user_id: UUID,
    attribute_type: EAttributeTypes,
    attribute: IContactAttributeInput,
    cb: Callback<IContact>
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
  function getByTags(user_id: UUID, tags: String[], cb: Callback<IContact>): void;
  function stringSearch(
    user_id: UUID,
    terms: String[],
    limit: number,
    cb: Callback<IContact[]>
  ): void;
  function getAllTags(user_id: UUID, cb: Callback<String[]>): void;
  function setRefs(contact_id: UUID, refs: UUID[], cb: Callback<void>): void;
}

declare namespace Orm {
  function register(type: string, model_name: string);
}
