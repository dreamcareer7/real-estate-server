SELECT id
FROM cmas
WHERE room = $1 AND
      deleted_at IS NULL
