SELECT brands_allowed_templates.*,
  templates.created_at,
  EXTRACT(EPOCH FROM templates.created_at) AS created_at,
  EXTRACT(EPOCH FROM templates.created_at) AS updated_at,
  'brand_template' AS TYPE,

  -- When thumbnail_requested_at IS NOT NULL, that means the current thumbnails are invalid
  -- and outdated. In those cases, we return null, so the clients can show a placeholder
  -- or something, as the current thumbnail/preview are outdated/invalid/misleading.

  -- Once new thumbnails are generated, thumbnail_requested_at becomes null, and we'll use
  -- new thumbnail/preview.

  (
    CASE WHEN thumbnail_requested_at IS NULL THEN thumbnail ELSE NULL END
  ) as thumbnail,
  (
    CASE WHEN thumbnail_requested_at IS NULL THEN preview   ELSE NULL END
  ) as preview

FROM brands_allowed_templates
JOIN templates on brands_allowed_templates.template = templates.id
JOIN unnest($1::uuid[]) WITH ORDINALITY t(btid, ord) ON brands_allowed_templates.id = btid
ORDER BY t.ord
