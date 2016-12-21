SELECT *,
  'deal' AS type,
   EXTRACT(EPOCH FROM created_at) AS created_at,
   EXTRACT(EPOCH FROM updated_at) AS updated_at,
   EXTRACT(EPOCH FROM deleted_at) AS deleted_at,

  (
    SELECT JSON_AGG(deals_roles) FROM deals_roles WHERE deal = $1
  ) AS roles

FROM deals WHERE id = $1