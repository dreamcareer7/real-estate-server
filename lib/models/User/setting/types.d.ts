
type MissingProps = 'deleted_at' | 'created_by' | 'updated_by';

export type Json = Record<string, any> | any[] | string | number | boolean | null;

export interface UserSetting extends Omit<IModel, MissingProps> {
  type: 'user_setting';

  grid_deals_agent_network_sort_field: Json;
  mls_saved_search_hint_dismissed: Json;
  import_tooltip_visite: Json;
  mls_sort_field: Json;
  grid_deals_sort_field: Json;
  grid_contacts_sort_field: Json;
  user_filter: Json;
  mls_last_browsing_location: Json;
  onboarding_marketing_center: Json;
  contact_view_mode_field: Json;
  grid_deals_sort_field_bo: Json;
  insight_layout_sort_field: Json;
  deals_grid_filter_settings: Json;
  super_campaign_admin_permission: Json;
}
