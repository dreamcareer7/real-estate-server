declare interface IBrandList extends IModel {
  created_by: UUID;
  updated_by: UUID;
  brand: UUID;
  name: string;
  filters: IContactListFilter[];
  query?: string;
  args?: Pick<IContactFilterOptions, 'filter_type'>;
  touch_freq?: number;
}

declare interface IBrandListInput {
  name: string;
  filters: IContactListFilter[];
  query?: string;
  args?: Pick<IContactFilterOptions, 'filter_type'>;
  touch_freq?: number;
}
