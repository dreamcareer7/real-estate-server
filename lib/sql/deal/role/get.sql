SELECT *,
  'deal_role' AS type,
   EXTRACT(EPOCH FROM created_at) AS created_at,
   EXTRACT(EPOCH FROM updated_at) AS updated_at

FROM deals_roles WHERE id = $1