SELECT brands_assets.*,
  'brand_asset' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at

FROM brands_assets
JOIN unnest($1::uuid[]) WITH ORDINALITY t(baid, ord) ON brands_assets.id = baid
ORDER BY t.ord
