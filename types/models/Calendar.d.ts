declare interface ICalendarFilter {
  brand: UUID;
  users?: UUID[];
}

declare interface ICalendarFeedSetting {
  selected_types: string[] | null;
  filter: ICalendarFilter[] | null;
}

declare interface ICalendarFeedSettingInput {
  types: string[] | null;
  filter: ICalendarFilter[] | null;
}

declare interface ICalendarGlobalNotificationSetting {
  id: UUID;
  created_at: number;
  updated_at: number;
  user: UUID;
  brand: UUID;
  object_type: 'crm_task' | 'deal_context' | 'contact_attribute';
  event_type: string;
  reminder: number;
}
