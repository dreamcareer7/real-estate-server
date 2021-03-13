SELECT brand_settings.*,
  'brand_settings' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  MARKETING_PALETTE_TO_JSON(marketing_palette) as marketing_palette,
  THEME_TO_JSON(theme) as theme
FROM brand_settings
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bsid, ord) ON brand_settings.id = bsid
ORDER BY t.ord
