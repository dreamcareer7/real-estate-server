const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE users_settings RENAME TO users_settings_old',
  
  `CREATE TABLE users_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    "user" uuid NOT NULL REFERENCES users(id),
    brand uuid NOT NULL REFERENCES brands(id),

    grid_deals_agent_network_sort_field text,
    mls_saved_search_hint_dismissed int, -- mls-saved-search-hint-dismissed
    import_tooltip_visited int,
    mls_sort_field text,
    grid_deals_sort_field text,
    grid_contacts_sort_field text,
    user_filter json, -- uuid[]
    mls_last_browsing_location json,
    onboarding_marketing_center int, -- onboarding__marketing-center
    contact_view_mode_field text, 
    grid_deals_sort_field_bo text,
    insight_layout_sort_field json,
    deals_grid_filter_settings json,
    super_campaign_admin_permission boolean NOT NULL DEFAULT false,

    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),

    UNIQUE("user", brand)
  )`,

  `INSERT INTO users_settings (
     "user",
     brand,
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
     created_at,
     updated_at
   )
   SELECT
     "user",
     brand,
   
     max(CASE WHEN
       key = 'grid_deals_agent_network_sort_field' THEN (value#>>'{}')::text
       ELSE NULL
     END) AS grid_deals_agent_network_sort_field,

     max(CASE WHEN
       key = 'mls-saved-search-hint-dismissed' THEN (value#>>'{}')::int
       ELSE NULL
     END) AS mls_saved_search_hint_dismissed,

     max(CASE WHEN
       key = 'import_tooltip_visited' THEN (value#>>'{}')::int
       ELSE NULL
     END) AS import_tooltip_visited,

     max(CASE WHEN
       key = 'mls_sort_field' THEN (value#>>'{}')::text
       ELSE NULL
     END) AS mls_sort_field,

     max(CASE WHEN
       key = 'grid_deals_sort_field' THEN (value#>>'{}')::text
       ELSE NULL
     END) AS grid_deals_sort_field,

     max(CASE WHEN
       key = 'grid_contacts_sort_field' THEN (value#>>'{}')::text
       ELSE NULL
     END) AS grid_contacts_sort_field,

     max(CASE WHEN
       key = 'user_filter' THEN value::text
       ELSE NULL
     END)::json AS user_filter,

     max(CASE WHEN
       key = 'mls_last_browsing_location' THEN value::text
       ELSE NULL
     END)::json AS mls_last_browsing_location,

     max(CASE WHEN
       key = 'onboarding__marketing-center' THEN (value#>>'{}')::int
       ELSE NULL
     END) AS onboarding_marketing_center,

     max(CASE WHEN
       key = 'contact_view_mode_field' THEN (value#>>'{}')::text
       ELSE NULL
     END) AS contact_view_mode_field,

     max(CASE WHEN
       key = 'grid_deals_sort_field_bo' THEN (value#>>'{}')::text
       ELSE NULL
     END) AS grid_deals_sort_field_bo,

     max(CASE WHEN
       key = 'insight_layout_sort_field' THEN value::text
       ELSE NULL
     END)::json AS insight_layout_sort_field,

     max(CASE WHEN
       key = 'deals_grid_filter_settings' THEN value::text
       ELSE NULL
     END)::json AS deals_grid_filter_settings,
   
     min(created_at) AS created_at,
     max(updated_at) AS updated_at
   FROM
     users_settings_old
   GROUP BY
     "user", brand`,
  
  'DROP TABLE users_settings_old',
  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
