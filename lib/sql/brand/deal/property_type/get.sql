SELECT brands_property_types.*,
  'brand_property_type' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at

FROM brands_property_types
JOIN unnest($1::uuid[]) WITH ORDINALITY t(pid, ord) ON brands_property_types.id = pid
ORDER BY t.ord
