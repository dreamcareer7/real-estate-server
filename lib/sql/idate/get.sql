SELECT 'important_date' AS TYPE,
       *,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at,
       EXTRACT(EPOCH FROM deleted_at) AS deleted_at
FROM important_dates
WHERE id = $1
LIMIT 1
