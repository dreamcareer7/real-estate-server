declare interface IContactList {
  id: UUID;
  name: string;
  filters: IContactAttributeFilter[];
  query: string;
  is_pinned: boolean;
  user: UUID;
}

declare interface IContactListMember {
  list: UUID;
  contact: UUID;
  is_manual: boolean;

  deleted_at?: number;
}