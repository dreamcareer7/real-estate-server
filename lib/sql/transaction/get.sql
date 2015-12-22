SELECT 'transaction' AS TYPE,
       *,
       EXTRACT(EPOCH FROM transactions.created_at) AS created_at,
       EXTRACT(EPOCH FROM transactions.updated_at) AS updated_at,
       EXTRACT(EPOCH FROM transactions.deleted_at) AS deleted_at
FROM transactions
WHERE id = $1
LIMIT 1
