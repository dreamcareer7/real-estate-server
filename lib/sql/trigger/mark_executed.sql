UPDATE
  triggers
SET
  executed_at = NOW(),
  event = $2::uuid,
  executed_within = $3::text
WHERE
  id = $1::uuid
  AND deleted_at IS NULL
