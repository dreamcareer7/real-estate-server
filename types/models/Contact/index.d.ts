declare interface IContactAttributeDefInput {
  name: string;
  data_type: 'number' | 'text' | 'date';
  section?: string;
  label: string;
  required?: boolean;
  singular?: boolean;
  searchable?: boolean;
  has_label?: boolean;
  labels?: string[];
  enum_values?: string[];
}

declare interface IContactAttributeDef {
  id: UUID;
  name: string;
  label: string;
  data_type: 'number' | 'text' | 'date';
  section?: string;
  global: boolean;
  show: boolean;
  editable: boolean;
  singular: boolean;
  searchable: boolean;
  has_label: boolean;
  labels: string[] | null;
  enum_values?: string[];
  user?: UUID;
  brand?: UUID;
}

declare interface IContactBase {
  user: UUID;
  ios_address_book_id?: string;
  android_address_book_id?: string;
  google_id?: string;
}

declare interface IContactInput extends IContactBase {
  id?: UUID;
  attributes: IContactAttributeInput[];
}

declare interface IContact extends IContactBase {
  id: UUID;
  created_at: number;
  updated_at: number;
  deleted_at?: number | null;
  brand: UUID;
  attributes: IContactAttribute[];

  title?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  marketing_name?: string;
  nickname?: string;
  email?: string;
  primary_email?: string;
  emails?: string[];
  phone_number?: string;
  primary_phone_number?: string;
  phone_numbers?: string[];
  company?: string;
  birthday?: string;
  profile_image_url?: string;
  cover_image_url?: string;
  job_title?: string;
  source_type?: string;
  source?: string;
  website?: string;
  tag?: string;

  display_name: string;
  partner_name?: string;
  last_touch?: number;
  next_touch?: number;

  users?: UUID[];
  deals?: UUID[];
  lists?: UUID[];
  flows?: UUID[];
  summary: UUID;
}

declare interface IContactAttribute {
  id: UUID;
  created_at: number;
  updated_at: number;
  deleted_at?: number;

  created_by: UUID;
  brand: UUID;
  contact: UUID;

  attribute_def: UUID;
  attribute_type: string;

  text: string;
  number: number;
  date: number;

  index?: number;
  label?: string;
  is_primary: boolean;
  is_partner: boolean;
}

declare interface IContactAttributeInput {
  attribute_def?: UUID;
  attribute_type?: string;

  id?: UUID;
  created_by?: UUID;
  created_within?: string;
  created_for?: string;

  text?: string;
  number?: number;
  date?: number;

  index?: number;
  label?: string;
  is_primary?: boolean;
  is_partner?: boolean;
}

declare interface IContactAttributeInputWithContact extends IContactAttributeInput {
  contact: UUID;
}

declare type TContactActionReason =
  | 'direct_request'
  | 'deals'
  | 'import_csv'
  | 'import_json'
  | 'merge'
  | 'deleted_definition'
  | 'google_integration'
  | 'system';

declare interface IAddContactOptions {
  /** Return {ParentContact} object or just id */
  get?: boolean;
  /** Continute on add attribute error */
  relax?: boolean;
  /** Add activity record? */
  activity?: boolean;
}

declare interface IContactSummary {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  company?: string;
  display_name: string;
  abbreviated_display_name: string;
  email: string | null;
  phone_number: string | null;
}

declare type TContactFilterOperator = 'eq' | 'lte' | 'gte' | 'between' | 'any' | 'all';

declare interface IContactAttributeFilter {
  attribute_def?: UUID;
  attribute_type?: string;
  operator?: TContactFilterOperator,
  value: any;
  invert?: boolean;
}

declare interface IContactFilterOptions {
  q?: string[];
  created_by?: UUID;
  updated_by?: UUID;
  updated_gte?: number;
  updated_lte?: number;
  last_touch_gte?: number;
  last_touch_lte?: number;
  next_touch_gte?: number;
  next_touch_lte?: number;
  created_gte?: number;
  created_lte?: number;
  alphabet?: string;
  crm_tasks?: UUID[];
  ids?: UUID[];
  excludes?: UUID[];
  list?: UUID;
  lists?: UUID[];
  flows?: UUID[];
  users?: UUID[];
  filter_type?: 'and' | 'or';
  google_id?: string;
}

declare interface ICSVImporterMappingDef {
  label?: string;
  attribute_def: UUID;
  attribute_type?: string;
  index?: number;
  is_partner: boolean;
}

declare interface ICSVImporterMapping {
  def: IContactAttributeDef;
  label?: string;
  index?: number;
  is_partner: boolean;
}

declare interface IContactDuplicateCluster {
  cluster: number;
  contacts: IContact[];
  type: 'contact_duplicate';
  total: number;
}

declare interface IContactDuplicateClusterInput {
  parent: UUID;
  sub_contacts: UUID[];
}

declare interface IContactTag {
  id: UUID;
  text: string;
  created_at: number;
  updated_at: number;
}
