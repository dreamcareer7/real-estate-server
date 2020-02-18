SELECT brands_deal_statuses.*,
  'brand_deal_status' AS TYPE,
  TO_JSON(deal_types) as deal_types,
  TO_JSON(property_types) as property_types,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at

FROM brands_deal_statuses
JOIN unnest($1::uuid[]) WITH ORDINALITY t(sid, ord) ON brands_deal_statuses.id = sid
ORDER BY t.ord
