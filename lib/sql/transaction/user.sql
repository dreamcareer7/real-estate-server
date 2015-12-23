SELECT id
FROM transactions
WHERE "user" = $1 AND
      deleted_at IS NULL
