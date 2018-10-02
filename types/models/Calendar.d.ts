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
