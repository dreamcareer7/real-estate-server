declare interface IContactListFilter {
  attribute_def: UUID;
  operator?: TContactFilterOperator,
  value: any;
  invert?: boolean;
}

declare interface IContactListInput {
  name: string;
  filters: IContactListFilter[];
  query?: string;
  args?: Pick<IContactFilterOptions, 'filter_type' | 'q' | 'crm_tasks' | 'flows'>;
  is_editable?: boolean;
  touch_freq?: number;
}

declare interface IContactList {
  id: UUID;

  created_at?: number;
  updated_at?: number;
  deleted_at?: number;

  name: string;
  filters: IContactListFilter[];
  query?: string;
  args: Pick<IContactFilterOptions, 'filter_type' | 'crm_tasks' | 'flows' | 'q'>;
  is_editable: boolean;
  touch_freq?: number;

  member_count: number;

  created_by: UUID;
  updated_by: UUID;

  brand: UUID;
}

declare interface IContactListMember {
  list: UUID;
  contact: UUID;
  is_manual: boolean;

  deleted_at?: number;
}
