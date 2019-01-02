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

declare interface IParentContact extends IModel {
  sub_contacts: IContact[];
  summary?: Record<string, string>;
  merged: boolean;
}

declare interface IContactBase {
  ios_address_book_id?: string;
  android_address_book_id?: string;
}

declare interface IContactInput extends IContactBase {
  id?: UUID;
  user: UUID;
  attributes: IContactAttributeInput[];
}

declare interface IContact extends IContactBase {
  id: UUID;
  deleted_at?: number | null;
  type: "sub_contact";
  user: UUID;
  parent: UUID;
  attributes: IContactAttribute[];

  users?: UUID[];
  deals?: IDeal[];
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
  label?: String;
  is_primary: boolean;
}

declare interface IContactAttributeInput {
  attribute_def: UUID;
  attribute_type?: string;

  id?: UUID;
  created_by?: UUID;
  contact?: UUID;

  text?: string;
  number?: number;
  date?: number;

  index?: number;
  label?: String;
  is_primary?: boolean;
  is_partner?: boolean;
}

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
  email: String;
  phone_number: String;
}

declare interface IContactAttributeFilter {
  attribute_def?: UUID;
  attribute_type?: string;
  operator: 'eq' | 'lte' | 'gte' | 'between' | 'any' | 'all',
  value: any;
  invert?: boolean;
}

declare interface IContactFilterOptions {
  q?: string[];
  created_by?: UUID;
  updated_by?: UUID;
  updated_gte?: number;
  updated_lte?: number;
  created_gte?: number;
  created_lte?: number;
  ids?: UUID[];
  list?: UUID;
  users?: UUID[];
}

declare interface ICSVImporterMappedField {
  label?: string;
  attribute_def: UUID;
  attribute_type?: string;
  index?: number;
}

declare interface IContactDuplicateCluster {
  cluster: number;
  contacts: IParentContact[];
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
