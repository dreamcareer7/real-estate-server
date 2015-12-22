SELECT id
FROM transactions
WHERE room = $1 AND
      deleted_at IS NULL
