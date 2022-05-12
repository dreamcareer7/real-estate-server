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
  parked?: boolean;
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
  partner_first_name?: string;
  middle_name?: string;
  last_name?: string;
  partner_last_name?: string;
  marketing_name?: string;
  nickname?: string;
  partner_email?: string;
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
  tags?: string;
  address?: StdAddr[];

  display_name: string;
  partner_name?: string;
  last_touch?: number;
  next_touch?: number;
  touch_freq?: number;

  users?: UUID[];
  deals?: UUID[];
  lists?: UUID[];
  flows?: UUID[];
  triggers?: UUID[];
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

  created_for?: string;
  updated_for?: string;
  deleted_for?: string;
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
  | 'import_xlsx'
  | 'import_spreadsheet'
  | 'merge'
  | 'deleted_definition'
  | 'google_integration'
  | 'microsoft_integration'
  | 'system'
  | 'lts_lead'
  ;

declare type TLeadProtocol =
  | 'LeadTransmissionStandard'
  | 'FormData'
  | 'JSON'
  ;

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
  activities?: UUID[];
  created_by?: UUID;
  updated_by?: UUID;
  created_for?: TContactActionReason;
  updated_for?: TContactActionReason;
  updated_gte?: number;
  updated_lte?: number;
  last_touch_gte?: number;
  last_touch_lte?: number;
  next_touch_gte?: number;
  next_touch_lte?: number;
  created_gte?: number;
  created_lte?: number;
  deleted_gte?: number;
  deleted_lte?: number;
  deleted_by?: UUID;
  deleted_for?: string;
  alphabet?: string;
  crm_tasks?: UUID[];
  ids?: UUID[];
  excludes?: UUID[];
  list?: UUID;
  lists?: UUID[];
  flows?: UUID[];
  showings?: UUID[];
  users?: UUID[];
  filter_type?: 'and' | 'or';

  parked?: boolean;
  forUpdate?: boolean;
  skipTotal?: boolean;
}

declare interface ICSVImporterMappingDef {
  label?: string;
  attribute_def: UUID;
  attribute_type?: string;
  index?: number;
  is_partner?: boolean;
  multivalued?: boolean;
}

declare interface ICSVImporterMapping {
  def: IContactAttributeDef;
  label?: string;
  index?: number;
  is_partner?: boolean;
  multivalued?: boolean;
}

declare interface IContactDuplicateCluster {
  id: number;
  contacts: UUID[];
  type: 'contact_duplicate';
  total: number;
}

declare interface IContactDuplicateClusterInput {
  parent: UUID;
  sub_contacts: UUID[];
}

declare interface IContactTag extends Omit<IModel, 'deleted_at'> {
  tag: string;
  text: string;
  touch_freq: number | null;
  type: 'crm_tag';
  auto_enroll_in_super_campaigns: boolean;
}
