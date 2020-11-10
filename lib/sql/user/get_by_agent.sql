SELECT id
FROM users
WHERE
  agent = $1::uuid
  AND deleted_at IS NULL
