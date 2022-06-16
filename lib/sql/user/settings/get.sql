SELECT
  id,
  "user",
  brand,
  extract(epoch FROM created_at) AS created_at,
  extract(epoch FROM updated_at) AS updated_at,
  'user_setting' AS type,

  grid_deals_agent_network_sort_field,
  mls_saved_search_hint_dismissed,
  import_tooltip_visited,
  mls_sort_field,
  grid_deals_sort_field,
  grid_contacts_sort_field,
  user_filter,
  mls_last_browsing_location,
  onboarding_marketing_center,
  contact_view_mode_field,
  grid_deals_sort_field_bo,
  insight_layout_sort_field,
  deals_grid_filter_settings,
  super_campaign_admin_permission,
  listings_add_mls_account_reminder_dismissed,
  calendar_filters,
  contact_touch_reminder_hint_dismissed
FROM
  users_settings
  JOIN unnest($1::uuid[]) WITH ORDINALITY t(eid, ord)
    ON users_settings.id = eid
ORDER BY
  t.ord
