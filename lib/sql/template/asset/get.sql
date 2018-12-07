SELECT templates_assets.*,
  'template_asset' AS type,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM created_at) AS updated_at -- They are not updated at all for now but Dan needs this field.

FROM templates_assets
JOIN unnest($1::uuid[]) WITH ORDINALITY t(aid, ord) ON templates_assets.id = aid
ORDER BY t.ord
