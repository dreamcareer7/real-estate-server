UPDATE
  triggers
SET
  deleted_at = NOW(),
  deleted_within = $2::text
WHERE
  id = $1::uuid
  AND executed_at IS NULL
