WITH r AS (
  SELECT
    ($1 || '_' || brand) as id,
    brand,
    (
      SELECT bs.id
      FROM brands_subscriptions bs
      WHERE bs.brand IN (
        SELECT * FROM brand_parents(brand)
      )
      AND bs.status IN('active', 'in_trial')
    ) as subscription,
    ARRAY_AGG(roles.acl) as acl,
    'user_role' as type
    FROM (
        SELECT DISTINCT UNNEST(brands_roles.acl) as acl,
        brands_roles.brand
      FROM users
      JOIN brands_users ON users.id = brands_users.user
      JOIN brands_roles ON brands_users.role = brands_roles.id
      JOIN brands ON brands_roles.brand = brands.id
      WHERE
        users.id = $1
        AND brands_roles.deleted_at IS NULL
        AND brands.deleted_at       IS NULL
        AND brands_users.deleted_at IS NULL
    ) roles
  GROUP BY
    brand
), us AS (
  SELECT
    brand,
    json_build_object(
     'grid_deals_agent_network_sort_field', grid_deals_agent_network_sort_field,
     'mls-saved-search-hint-dismissed', mls_saved_search_hint_dismissed,
     'import_tooltip_visited', import_tooltip_visited,
     'mls_sort_field', mls_sort_field,
     'grid_deals_sort_field', grid_deals_sort_field,
     'grid_contacts_sort_field', grid_contacts_sort_field,
     'user_filter', user_filter,
     'mls_last_browsing_location', mls_last_browsing_location,
     'onboarding__marketing-center', onboarding_marketing_center,
     'contact_view_mode_field', contact_view_mode_field,
     'grid_deals_sort_field_bo', grid_deals_sort_field_bo,
     'insight_layout_sort_field', insight_layout_sort_field,
     'deals_grid_filter_settings', deals_grid_filter_settings
    ) AS settings
  FROM
    users_settings
  WHERE "user" = $1::uuid
)
SELECT
  r.*,
  us.settings as settings
FROM
  r
  LEFT JOIN us ON r.brand = us.brand
