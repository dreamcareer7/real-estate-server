SELECT brands_allowed_templates.*,
  templates.created_at,
  EXTRACT(EPOCH FROM templates.created_at) AS created_at,
  EXTRACT(EPOCH FROM templates.created_at) AS updated_at,
  'brand_template' AS TYPE,

  (
    thumbnail IS NOT NULL AND thumbnail_rendered_at > thumbnail_requested_at
  )::BOOLEAN as is_thumbnail_ready

FROM brands_allowed_templates
JOIN templates on brands_allowed_templates.template = templates.id
JOIN unnest($1::uuid[]) WITH ORDINALITY t(btid, ord) ON brands_allowed_templates.id = btid
ORDER BY t.ord
