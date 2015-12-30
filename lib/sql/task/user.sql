SELECT id
FROM tasks
WHERE "user" = $1 AND
      deleted_at IS NULL
