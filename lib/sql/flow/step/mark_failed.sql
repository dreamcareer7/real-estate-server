UPDATE
  flows_steps
SET
  executed_at = NULL,
  failed_at = NOW(),
  updated_at = NOW(),
  failure = $2::text,
  failed_within = $3::text
WHERE
  id = $1::uuid