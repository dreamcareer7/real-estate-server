type MissingProps = 'deleted_at' | 'created_by' | 'updated_by';
type JsonObject = Record<string, any>;
type JsonArray = Array<any>;
type Nullable<T> = T | null;

export interface UserSettingFields {
  grid_deals_agent_network_sort_field: Nullable<string>;
  mls_saved_search_hint_dismissed: Nullable<number>;
  import_tooltip_visited: Nullable<number>;
  mls_sort_field: Nullable<string>;
  grid_deals_sort_field: Nullable<string>;
  grid_contacts_sort_field: Nullable<string>;
  user_filter: Nullable<JsonArray>;
  mls_last_browsing_location: Nullable<JsonObject>;
  onboarding_marketing_center: Nullable<number>;
  contact_view_mode_field: Nullable<string>;
  grid_deals_sort_field_bo: Nullable<string>;
  insight_layout_sort_field: Nullable<JsonObject>;
  deals_grid_filter_settings: Nullable<JsonObject>;
  super_campaign_admin_permission: boolean;
  listings_add_mls_account_reminder_dismissed: boolean;
  calendar_filters: JsonObject;
}

export interface UserSetting extends Omit<IModel, MissingProps>, UserSettingFields {
  type: 'user_setting';
  brand: IBrand['id'];
  user: IUser['id'];
}

export type SettingKey = keyof UserSettingFields;

export type ClientSettingKey =
  | SettingKey
  | 'mls-saved-search-hint-dismissed'
  | 'onboarding__marketing-center';
