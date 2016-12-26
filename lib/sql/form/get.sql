SELECT *,
  'form' AS type,
    EXTRACT(EPOCH FROM created_at) AS created_at,
    EXTRACT(EPOCH FROM updated_at) AS updated_at,
    EXTRACT(EPOCH FROM deleted_at) AS deleted_at,
    name
FROM forms WHERE id = $1