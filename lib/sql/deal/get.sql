SELECT *,
  'deal' AS type,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
  address,

  (
    SELECT ARRAY_AGG(id) FROM deals_roles WHERE deal = $1
  ) AS roles,

  (
    SELECT ARRAY_AGG(file) FROM files_relations WHERE role = 'Deal' AND role_id = $1 AND deleted_at IS NULL
  ) AS files

FROM deals WHERE id = $1