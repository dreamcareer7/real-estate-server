declare type TCalendarObjectType = 'crm_task' | 'deal_context' | 'contact_attribute' | 'contact' | 'email_campaign' | 'email_thread' | 'activity';

declare interface ICalendarFilter {
  brand?: UUID;
  users?: UUID[];
}

declare interface ICalendarFilterQuery {
  ids?: UUID;
  deal?: UUID;
  contact?: UUID;
  low?: number;
  high?: number;
  last_updated_gt?: number;
  event_types?: string[] | null;
  object_types?: TCalendarObjectType[];
  limit?: number;
  accessible_to?: UUID;
  origin?: 'rechat' | 'google' | 'microsoft';
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

declare interface ICalendarGlobalNotificationSettingInput {
  object_type: 'deal_context' | 'contact_attribute' | null;
  event_type: string;
  reminder: number;
}

declare interface ICalendarGlobalNotificationSetting extends ICalendarGlobalNotificationSettingInput {
  id: UUID;
  created_at: number;
  updated_at: number;
  user: UUID;
  brand: UUID;
}

declare interface ICalendarEventNotification {
  id: UUID;
  user: UUID;
  timestamp: Date;
  title: string;
  type_label: string;
  reminder: number;
  object_type: 'deal_context' | 'contact_attribute';
  event_type: string;
  contact?: UUID;

}

declare interface IContactEventNotification extends ICalendarEventNotification {
  object_type: 'contact_attribute';
  contact: UUID;
}

declare interface IDealEventNotification extends ICalendarEventNotification {
  object_type: 'deal_context';
  deal: UUID;
}

declare type ICalendarNotification =  IContactEventNotification | IDealEventNotification;
