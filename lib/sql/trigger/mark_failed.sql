UPDATE
  triggers
SET
  failed_at = NOW(),
  failure = $2,
  failed_within = $3
WHERE
  id = $1::uuid
