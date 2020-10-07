UPDATE
  triggers
SET
  executed_at = NOW(),
  executed_within = $2::text
WHERE
  id = $1::uuid
  AND deleted_at IS NULL
